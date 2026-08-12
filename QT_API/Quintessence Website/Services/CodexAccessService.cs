using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Text.Json;

namespace Quintessence_Website.Services
{
    /// <summary>Requires Codex authoring access; <paramref name="RequireManage"/> demands the manager tier.</summary>
    public sealed record CodexAccessRequirement(bool RequireManage) : IAuthorizationRequirement;

    /// <summary>
    /// Evaluates <see cref="CodexAccessRequirement"/> against live Discord roles.
    ///
    /// A handler rather than a claim check, because the auth cookie lasts a year and a claim
    /// stamped at sign-in would outlive any role change by up to that long.
    /// </summary>
    public sealed class CodexAccessHandler : AuthorizationHandler<CodexAccessRequirement>
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public CodexAccessHandler(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context, CodexAccessRequirement requirement)
        {
            if (context.User.Identity?.IsAuthenticated != true) return;

            using var scope = _scopeFactory.CreateScope();
            var accessService = scope.ServiceProvider.GetRequiredService<CodexAccessService>();

            var access = await accessService.GetAccessAsync(context.User.FindFirst("id")?.Value);
            var granted = requirement.RequireManage ? access.CanManage : access.CanWrite;

            if (granted) context.Succeed(requirement);
        }
    }

    /// <summary>Config for Codex authoring access. Bound from the "Codex" section.</summary>
    public sealed class CodexOptions
    {
        /// <summary>The guild whose roles decide Codex access.</summary>
        public string GuildId { get; set; } = string.Empty;

        /// <summary>
        /// Bot token used to read a member's roles. Bot-only permissions: it just needs to be
        /// in the guild. No privileged gateway intents - this is a REST member fetch.
        /// </summary>
        public string BotToken { get; set; } = string.Empty;

        /// <summary>Roles that may write guides and edit their own.</summary>
        public string[] AuthorRoleIds { get; set; } = Array.Empty<string>();

        /// <summary>Roles that may additionally edit and remove anyone's guides.</summary>
        public string[] ManagerRoleIds { get; set; } = Array.Empty<string>();

        /// <summary>How long a role lookup is trusted before Discord is asked again.</summary>
        public int RoleCacheSeconds { get; set; } = 300;

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(GuildId) && !string.IsNullOrWhiteSpace(BotToken);
    }

    /// <summary>What a signed-in user is allowed to do in the Codex.</summary>
    public readonly record struct CodexAccess(bool CanWrite, bool CanManage)
    {
        public static readonly CodexAccess None = new(false, false);
    }

    /// <summary>
    /// Resolves Codex permissions from a user's Discord roles.
    ///
    /// Roles are looked up live (behind a short cache) rather than baked into the auth cookie
    /// at sign-in, because sessions here last a year: a claim stamped at login would let
    /// someone who lost the manager role keep edit-everything rights until they happened to
    /// log out. The cache TTL is the longest a revoked role stays effective.
    ///
    /// This uses a bot token rather than the user's own OAuth token. Both can read roles, but
    /// a user token expires after 7 days and would need refresh-token plumbing to stay usable
    /// across a year-long session - and it only works while that user has a live session at
    /// all. A bot token is one call, always current, and never expires.
    /// </summary>
    public sealed class CodexAccessService
    {
        private const string DiscordApiBase = "https://discord.com/api/v10";

        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly CodexOptions _options;
        private readonly ILogger<CodexAccessService> _logger;

        public CodexAccessService(
            HttpClient http,
            IMemoryCache cache,
            CodexOptions options,
            ILogger<CodexAccessService> logger)
        {
            _http = http;
            _cache = cache;
            _options = options;
            _logger = logger;
        }

        public async Task<CodexAccess> GetAccessAsync(string? discordUserId, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(discordUserId)) return CodexAccess.None;

            if (!_options.IsConfigured)
            {
                _logger.LogWarning(
                    "Codex access checked but Codex:GuildId / Codex:BotToken are not set - denying. " +
                    "Fill them in appsettings.Production.json.");
                return CodexAccess.None;
            }

            var cacheKey = $"codex:access:{discordUserId}";
            if (_cache.TryGetValue<CodexAccess>(cacheKey, out var cached)) return cached;

            var roles = await FetchMemberRoleIdsAsync(discordUserId, ct);

            // A failed lookup returns null (as opposed to an empty role list for a real member
            // with no roles). Don't cache it - a transient Discord blip shouldn't lock an author
            // out for the whole TTL.
            if (roles is null) return CodexAccess.None;

            var canManage = roles.Any(id => _options.ManagerRoleIds.Contains(id));
            var canWrite = canManage || roles.Any(id => _options.AuthorRoleIds.Contains(id));
            var access = new CodexAccess(canWrite, canManage);

            _cache.Set(cacheKey, access, TimeSpan.FromSeconds(Math.Max(5, _options.RoleCacheSeconds)));
            return access;
        }

        /// <summary>Member's role ids, or null if the lookup failed (as opposed to "no roles").</summary>
        private async Task<List<string>?> FetchMemberRoleIdsAsync(string discordUserId, CancellationToken ct)
        {
            var url = $"{DiscordApiBase}/guilds/{_options.GuildId}/members/{discordUserId}";

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.TryAddWithoutValidation("Authorization", $"Bot {_options.BotToken}");

                using var response = await _http.SendAsync(request, ct);

                // Not in the guild - a definite "no roles", worth caching.
                if (response.StatusCode == HttpStatusCode.NotFound) return new List<string>();

                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    _logger.LogError(
                        "Discord rejected the Codex bot token ({Status}). Check Codex:BotToken, and that " +
                        "the bot is a member of guild {GuildId}.", response.StatusCode, _options.GuildId);
                    return null;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Discord member lookup failed for {UserId}: {Status}", discordUserId, response.StatusCode);
                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                if (!document.RootElement.TryGetProperty("roles", out var rolesElement)
                    || rolesElement.ValueKind != JsonValueKind.Array)
                {
                    return new List<string>();
                }

                return rolesElement.EnumerateArray()
                    .Select(role => role.GetString())
                    .Where(id => !string.IsNullOrEmpty(id))
                    .Select(id => id!)
                    .ToList();
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Discord member lookup errored for {UserId}", discordUserId);
                return null;
            }
        }
    }
}
