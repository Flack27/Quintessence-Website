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
    /// A guild member, with the Codex access their roles grant. Carries the display fields too,
    /// so the access dialog can list people without a second round trip per name, and the raw
    /// role ids, so per-game read access can be checked off the same cached lookup.
    /// </summary>
    public sealed record CodexMember(
        string Id,
        string Username,
        string? AvatarUrl,
        CodexAccess Access,
        IReadOnlyList<string> RoleIds)
    {
        public bool HasRole(string roleId) => RoleIds.Contains(roleId);
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
            var member = await GetMemberAsync(discordUserId, ct);
            return member?.Access ?? CodexAccess.None;
        }

        /// <summary>
        /// One guild member, or null if they are not in the guild (or Discord could not be
        /// reached). Shares the cache with <see cref="GetAccessAsync"/> - it is the same lookup.
        /// </summary>
        public async Task<CodexMember?> GetMemberAsync(string? discordUserId, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(discordUserId)) return null;

            if (!_options.IsConfigured)
            {
                _logger.LogWarning(
                    "Codex access checked but Codex:GuildId / Codex:BotToken are not set - denying. " +
                    "Fill them in appsettings.Production.json.");
                return null;
            }

            var cacheKey = $"codex:member:{discordUserId}";
            if (_cache.TryGetValue<CodexMember?>(cacheKey, out var cached)) return cached;

            var url = $"{DiscordApiBase}/guilds/{_options.GuildId}/members/{discordUserId}";
            var (ok, member) = await FetchMemberAsync(url, discordUserId, ct);

            // A failed lookup is not cached - a transient Discord blip shouldn't lock an author
            // out for the whole TTL. "Not in the guild" (ok, but no member) is a real answer and
            // is cached like any other.
            if (!ok) return null;

            _cache.Set(cacheKey, member, TimeSpan.FromSeconds(Math.Max(5, _options.RoleCacheSeconds)));
            return member;
        }

        /// <summary>
        /// Guild members whose name starts with <paramref name="query"/>, for the access dialog's
        /// search box.
        ///
        /// This is Discord's member *search*, not the member *list*: search is exempt from the
        /// GUILD_MEMBERS privileged intent, so the bot still needs nothing enabled beyond being
        /// in the guild - the same standing requirement the role lookup above already has.
        /// </summary>
        public async Task<List<CodexMember>> SearchMembersAsync(string query, int limit = 25, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(query) || !_options.IsConfigured) return new List<CodexMember>();

            var url = $"{DiscordApiBase}/guilds/{_options.GuildId}/members/search" +
                      $"?query={Uri.EscapeDataString(query.Trim())}&limit={Math.Clamp(limit, 1, 100)}";

            try
            {
                using var response = await SendAsync(url, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Discord member search failed for \"{Query}\": {Status}", query, response.StatusCode);
                    return new List<CodexMember>();
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                if (document.RootElement.ValueKind != JsonValueKind.Array) return new List<CodexMember>();

                return document.RootElement.EnumerateArray()
                    .Select(ParseMember)
                    .Where(m => m is not null)
                    .Select(m => m!)
                    .ToList();
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Discord member search errored for \"{Query}\"", query);
                return new List<CodexMember>();
            }
        }

        /// <summary>
        /// Fetches one member. The bool is whether Discord answered at all, which is separate
        /// from whether it had a member for us - a blip and a non-member must not be conflated,
        /// because only the latter is safe to cache.
        /// </summary>
        private async Task<(bool Ok, CodexMember? Member)> FetchMemberAsync(
            string url, string discordUserId, CancellationToken ct)
        {
            try
            {
                using var response = await SendAsync(url, ct);

                // Not in the guild - a definite answer, worth caching.
                if (response.StatusCode == HttpStatusCode.NotFound) return (true, null);

                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    _logger.LogError(
                        "Discord rejected the Codex bot token ({Status}). Check Codex:BotToken, and that " +
                        "the bot is a member of guild {GuildId}.", response.StatusCode, _options.GuildId);
                    return (false, null);
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Discord member lookup failed for {UserId}: {Status}", discordUserId, response.StatusCode);
                    return (false, null);
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                return (true, ParseMember(document.RootElement));
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Discord member lookup errored for {UserId}", discordUserId);
                return (false, null);
            }
        }

        private Task<HttpResponseMessage> SendAsync(string url, CancellationToken ct)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation("Authorization", $"Bot {_options.BotToken}");
            return _http.SendAsync(request, ct);
        }

        /// <summary>Turns a Discord guild-member object into a <see cref="CodexMember"/>.</summary>
        private CodexMember? ParseMember(JsonElement element)
        {
            if (element.ValueKind != JsonValueKind.Object) return null;
            if (!element.TryGetProperty("user", out var user) || user.ValueKind != JsonValueKind.Object) return null;

            var id = user.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
            if (string.IsNullOrEmpty(id)) return null;

            var roles = element.TryGetProperty("roles", out var rolesElement) && rolesElement.ValueKind == JsonValueKind.Array
                ? rolesElement.EnumerateArray().Select(r => r.GetString()).Where(r => !string.IsNullOrEmpty(r)).Select(r => r!).ToList()
                : new List<string>();

            var canManage = roles.Any(roleId => _options.ManagerRoleIds.Contains(roleId));
            var canWrite = canManage || roles.Any(roleId => _options.AuthorRoleIds.Contains(roleId));

            // What people call each other in the guild, in the order Discord itself falls back:
            // server nickname, then the account's display name, then the raw handle.
            var name = Text(element, "nick") ?? Text(user, "global_name") ?? Text(user, "username") ?? id;

            return new CodexMember(id, name, AvatarUrl(element, user, id), new CodexAccess(canWrite, canManage), roles);
        }

        /// <summary>Guild-specific avatar if they set one for this server, otherwise their account avatar.</summary>
        private string? AvatarUrl(JsonElement member, JsonElement user, string userId)
        {
            if (Text(member, "avatar") is { } guildHash)
                return $"https://cdn.discordapp.com/guilds/{_options.GuildId}/users/{userId}/avatars/{guildHash}.png?size=64";

            if (Text(user, "avatar") is { } hash)
                return $"https://cdn.discordapp.com/avatars/{userId}/{hash}.png?size=64";

            return null;
        }

        /// <summary>A non-empty string property, or null. Discord sends absent, null and "" alike.</summary>
        private static string? Text(JsonElement element, string property)
        {
            if (!element.TryGetProperty(property, out var value)) return null;
            if (value.ValueKind != JsonValueKind.String) return null;
            return value.GetString() is { Length: > 0 } text ? text : null;
        }
    }
}
