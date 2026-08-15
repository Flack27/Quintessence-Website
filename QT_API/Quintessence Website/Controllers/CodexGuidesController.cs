using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using QuintessenceWebsiteDAL.Store;
using QuintessenceWebsiteInterface.DTO;
using Quintessence_Website.Services;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Guides for the Codex at /guides.
    ///
    /// Reading is public. Writing needs the Codex Author role; editing or removing
    /// someone else's guide needs a manager role. Roles are resolved live from Discord
    /// on each request (see CodexAccessService), not from the auth cookie, because
    /// sessions here last a year.
    /// </summary>
    [Route("api/codex/guides")]
    [ApiController]
    public class CodexGuidesController : ControllerBase
    {
        private const int MaxImages = 24;
        private const int MaxImageBytes = 10 * 1024 * 1024;

        private static readonly string[] AllowedImageExtensions =
            { ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg" };

        private readonly GuideStore _store;
        private readonly CodexAccessService _access;

        public CodexGuidesController(GuideStore store, CodexAccessService access)
        {
            _store = store;
            _access = access;
        }

        private string? DiscordId => User.FindFirst("id")?.Value;

        /// <summary>Index for the homepage and search. Bodies omitted - they are large.</summary>
        [HttpGet]
        public async Task<IActionResult> Index(CancellationToken ct)
        {
            var access = await _access.GetAccessAsync(DiscordId, ct);
            var guides = _store.ReadAll(includeBody: false);

            // Drafts are only visible to someone who could edit them - which now includes anyone
            // the owner has invited, or they could not work on a draft they were invited to.
            if (!access.CanManage)
            {
                guides = guides
                    .Where(g => !g.Draft || (DiscordId is not null && (g.AuthorId == DiscordId || g.Editors.Contains(DiscordId))))
                    .ToList();
            }

            return Ok(guides);
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> Get(string slug, CancellationToken ct)
        {
            var safeSlug = SafeSlug(slug);
            var guide = _store.Read(safeSlug);
            if (guide is null) return NotFound(new { error = "No such guide." });

            if (guide.Draft && !await MayEditAsync(guide, ct))
                return NotFound(new { error = "No such guide." });

            guide.Images = _store.ListImages(safeSlug);
            return Ok(guide);
        }

        [HttpPost]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [RequestSizeLimit(100 * 1024 * 1024)]
        public async Task<IActionResult> Create([FromBody] CodexGuideWriteDTO body, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(body.Title))
                return BadRequest(new { error = "A guide needs a title." });

            var slug = SafeSlug(string.IsNullOrWhiteSpace(body.Slug)
                ? GuideStore.Slugify(body.Title)
                : GuideStore.Slugify(body.Slug!));

            if (_store.Exists(slug))
                return Conflict(new { error = $"A guide already exists at \"{slug}\"." });

            var error = SaveImages(slug, body.Images);
            if (error is not null) return BadRequest(new { error });

            var guide = new CodexGuideDTO
            {
                Slug = slug,
                Title = body.Title.Trim(),
                Subtitle = Blank(body.Subtitle),
                Description = body.Description?.Trim() ?? string.Empty,
                Game = Blank(body.Game) ?? "General",
                Section = Blank(body.Section) ?? "Uncategorized",
                Tags = body.Tags?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).ToList() ?? new(),
                Cover = Blank(body.Cover),
                Draft = body.Draft,
                Date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Author = User.FindFirst("display_name")?.Value ?? User.FindFirst("user_name")?.Value,
                AuthorId = DiscordId,
                Content = body.Body ?? string.Empty,
            };

            _store.Write(guide);
            await Task.CompletedTask;
            return Created($"/api/codex/guides/{slug}", guide);
        }

        [HttpPut("{slug}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [RequestSizeLimit(100 * 1024 * 1024)]
        public async Task<IActionResult> Update(string slug, [FromBody] CodexGuideWriteDTO body, CancellationToken ct)
        {
            slug = SafeSlug(slug);
            var existing = _store.Read(slug);
            if (existing is null) return NotFound(new { error = "No such guide." });

            if (!await MayEditAsync(existing, ct))
                return StatusCode(403, new { error = "Only the guide's author, an invited editor or a moderator can edit it." });

            var error = SaveImages(slug, body.Images);
            if (error is not null) return BadRequest(new { error });

            existing.Title = string.IsNullOrWhiteSpace(body.Title) ? existing.Title : body.Title.Trim();
            existing.Subtitle = Blank(body.Subtitle);
            existing.Description = body.Description?.Trim() ?? existing.Description;
            existing.Game = Blank(body.Game) ?? existing.Game;
            existing.Section = Blank(body.Section) ?? existing.Section;
            existing.Tags = body.Tags?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).ToList() ?? existing.Tags;
            existing.Cover = Blank(body.Cover) ?? existing.Cover;
            existing.Draft = body.Draft;
            existing.Content = body.Body ?? existing.Content;

            _store.Write(existing);
            return Ok(existing);
        }

        [HttpDelete("{slug}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Delete(string slug, CancellationToken ct)
        {
            slug = SafeSlug(slug);
            var existing = _store.Read(slug);
            if (existing is null) return NotFound(new { error = "No such guide." });

            if (!await MayAdministerAsync(existing, ct))
                return StatusCode(403, new { error = "Only the guide's author or a moderator can remove it." });

            _store.Delete(slug);
            return Ok(new { ok = true });
        }

        // -----------------------------------------------------------------------------
        // Per-guide editor access.
        //
        // A guide has one owner (whoever created it) and a list of invited editors. The
        // owner is never in that list and cannot be removed - there is no ownerless state.
        //
        // Managers are never in it either, and that is the important part: their access
        // comes from a Discord role re-read on every request, so writing them into a file
        // would mean taking the role away no longer takes the access away. There is
        // nothing here to remove them from, and nothing to go stale.
        // -----------------------------------------------------------------------------

        /// <summary>Who may edit this guide, resolved to names for the access dialog.</summary>
        [HttpGet("{slug}/access")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> GetAccess(string slug, CancellationToken ct)
        {
            var guide = _store.Read(SafeSlug(slug));
            if (guide is null) return NotFound(new { error = "No such guide." });

            if (!await MayEditAsync(guide, ct))
                return StatusCode(403, new { error = "You don't have access to this guide." });

            var editors = new List<CodexMemberDTO>();
            foreach (var id in guide.Editors)
            {
                if (await DescribeAsync(id, ct) is { } editor) editors.Add(editor);
            }

            return Ok(new CodexGuideAccessDTO
            {
                Owner = await DescribeAsync(guide.AuthorId, ct),
                Editors = editors,
                CanManageAccess = await MayAdministerAsync(guide, ct),
            });
        }

        /// <summary>Invites someone to edit this guide.</summary>
        [HttpPost("{slug}/access/{userId}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> AddEditor(string slug, string userId, CancellationToken ct)
        {
            var guide = _store.Read(SafeSlug(slug));
            if (guide is null) return NotFound(new { error = "No such guide." });

            if (!await MayAdministerAsync(guide, ct))
                return StatusCode(403, new { error = "Only the guide's author or a moderator can change who may edit it." });

            if (!IsSnowflake(userId)) return BadRequest(new { error = "That is not a Discord user id." });

            if (userId == guide.AuthorId)
                return BadRequest(new { error = "They created this guide - they already have access." });

            var member = await _access.GetMemberAsync(userId, ct);
            if (member is null)
                return BadRequest(new { error = "That account isn't in the guild." });

            // Both of these would be grants that grant nothing, so say why rather than storing
            // a row that has no effect.
            if (member.Access.CanManage)
                return BadRequest(new { error = $"{member.Username} is an admin and can already edit every guide." });

            if (!member.Access.CanWrite)
                return BadRequest(new { error = $"{member.Username} doesn't have the Codex Author role, so they couldn't edit guides even with access here." });

            if (!guide.Editors.Contains(userId))
            {
                guide.Editors.Add(userId);
                _store.Write(guide);
            }

            return Ok(ToDto(member));
        }

        /// <summary>Withdraws someone's access to this guide.</summary>
        [HttpDelete("{slug}/access/{userId}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> RemoveEditor(string slug, string userId, CancellationToken ct)
        {
            var guide = _store.Read(SafeSlug(slug));
            if (guide is null) return NotFound(new { error = "No such guide." });

            if (!await MayAdministerAsync(guide, ct))
                return StatusCode(403, new { error = "Only the guide's author or a moderator can change who may edit it." });

            if (userId == guide.AuthorId)
                return BadRequest(new { error = "The guide's creator can't be removed from it." });

            if (guide.Editors.Remove(userId)) _store.Write(guide);
            return Ok(new { ok = true });
        }

        /// <summary>
        /// Resolves a stored id to a member card. Falls back to showing the bare id when Discord
        /// has no answer - someone who has left the guild should still be visible and removable,
        /// not silently dropped from a list the owner is trying to manage.
        /// </summary>
        private async Task<CodexMemberDTO?> DescribeAsync(string? discordId, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(discordId)) return null;

            var member = await _access.GetMemberAsync(discordId, ct);
            return member is null
                ? new CodexMemberDTO { Id = discordId, Username = discordId }
                : ToDto(member);
        }

        internal static CodexMemberDTO ToDto(CodexMember member) => new()
        {
            Id = member.Id,
            Username = member.Username,
            Avatar = member.AvatarUrl,
            CanWrite = member.Access.CanWrite,
            CanManage = member.Access.CanManage,
        };

        /// <summary>Discord ids are decimal snowflakes; anything else never reaches Discord.</summary>
        private static bool IsSnowflake(string? value) =>
            !string.IsNullOrEmpty(value) && value.Length is >= 5 and <= 25 && value.All(char.IsDigit);

        /// <summary>Serves a guide's uploaded images.</summary>
        [HttpGet("{slug}/images/{fileName}")]
        public IActionResult Image(string slug, string fileName)
        {
            if (Path.GetFileName(fileName) != fileName) return BadRequest();

            var path = _store.ImagePath(SafeSlug(slug), fileName);
            if (!System.IO.File.Exists(path)) return NotFound();

            if (!new FileExtensionContentTypeProvider().TryGetContentType(path, out var contentType))
                contentType = "application/octet-stream";

            return PhysicalFile(path, contentType);
        }

        /// <summary>
        /// Who may change a guide's contents: its owner, anyone the owner has invited, or a
        /// manager. The endpoints are gated by the CodexAuthor policy first, so an invited
        /// editor who has since lost the author role is already out before this runs - being
        /// on a guide's list widens *which* guides you may touch, it does not grant authoring.
        /// </summary>
        private async Task<bool> MayEditAsync(CodexGuideDTO guide, CancellationToken ct)
        {
            if (await MayAdministerAsync(guide, ct)) return true;
            return DiscordId is not null && guide.Editors.Contains(DiscordId);
        }

        /// <summary>
        /// Who may delete a guide or change who can edit it: the owner and managers only.
        ///
        /// Invited editors are deliberately excluded from both. Removal is unrecoverable, and
        /// letting editors invite further editors would spread access sideways with no one
        /// able to say who let whom in.
        /// </summary>
        private async Task<bool> MayAdministerAsync(CodexGuideDTO guide, CancellationToken ct)
        {
            var access = await _access.GetAccessAsync(DiscordId, ct);
            if (access.CanManage) return true;
            return DiscordId is not null && guide.AuthorId == DiscordId;
        }

        /// <summary>Returns an error message, or null on success.</summary>
        private string? SaveImages(string slug, List<CodexGuideImageDTO>? images)
        {
            if (images is null || images.Count == 0) return null;
            if (images.Count > MaxImages) return $"Too many images (max {MaxImages}).";

            foreach (var image in images)
            {
                var name = Path.GetFileName(image.FileName ?? string.Empty);
                if (string.IsNullOrWhiteSpace(name) || name != image.FileName)
                    return $"Invalid image filename: \"{image.FileName}\".";

                if (!AllowedImageExtensions.Contains(Path.GetExtension(name).ToLowerInvariant()))
                    return $"\"{name}\" is not an image type we accept.";

                byte[] bytes;
                try
                {
                    var payload = image.Data ?? string.Empty;
                    var comma = payload.IndexOf(',');
                    if (payload.StartsWith("data:") && comma > 0) payload = payload[(comma + 1)..];
                    bytes = Convert.FromBase64String(payload);
                }
                catch (FormatException)
                {
                    return $"\"{name}\" could not be decoded.";
                }

                if (bytes.Length > MaxImageBytes)
                    return $"\"{name}\" is larger than {MaxImageBytes / (1024 * 1024)}MB.";

                _store.SaveImage(slug, name, bytes);
            }

            return null;
        }

        private static string? Blank(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        /// <summary>Slugs address folders, so anything path-like has to be stripped.</summary>
        private static string SafeSlug(string slug) => GuideStore.Slugify(slug ?? string.Empty);
    }
}
