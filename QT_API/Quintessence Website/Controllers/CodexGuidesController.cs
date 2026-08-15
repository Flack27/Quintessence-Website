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
    /// Reading a guide needs the Discord role configured for its game (see guideaccess.json)
    /// unless an admin has marked that guide public - guides are private by default. Writing
    /// needs the Codex Author role; editing someone else's guide needs to be invited to it or
    /// to hold a manager role. Roles are resolved live from Discord on each request (see
    /// CodexAccessService), not from the auth cookie, because sessions here last a year.
    /// </summary>
    [Route("api/codex/guides")]
    [ApiController]
    public class CodexGuidesController : ControllerBase
    {
        private const int MaxImages = 50;
        private const int MaxImageBytes = 30 * 1024 * 1024;

        private static readonly string[] AllowedImageExtensions =
            { ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg" };

        private readonly GuideStore _store;
        private readonly CodexAccessService _access;
        private readonly GuideAccessPolicy _guideAccess;
        private readonly ILogger<CodexGuidesController> _logger;

        public CodexGuidesController(
            GuideStore store,
            CodexAccessService access,
            GuideAccessPolicy guideAccess,
            ILogger<CodexGuidesController> logger)
        {
            _store = store;
            _access = access;
            _guideAccess = guideAccess;
            _logger = logger;
        }

        private string? DiscordId => User.FindFirst("id")?.Value;

        /// <summary>
        /// Index for the homepage and search. Bodies omitted - they are large.
        ///
        /// One member lookup covers the whole list: CanView is a pure check against that
        /// member, so filtering N guides costs one Discord call (cached), not N.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Index(CancellationToken ct)
        {
            var member = await _access.GetMemberAsync(DiscordId, ct);
            var guides = _store.ReadAll(includeBody: false)
                .Where(g => CanView(g, member))
                .ToList();

            return Ok(guides);
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> Get(string slug, CancellationToken ct)
        {
            var safeSlug = SafeSlug(slug);
            var guide = _store.Read(safeSlug);
            if (guide is null) return NotFound(new { error = "No such guide." });

            // 404 rather than 403: whether a members-only guide exists is itself not public.
            if (!CanView(guide, await _access.GetMemberAsync(DiscordId, ct)))
                return NotFound(new { error = "No such guide." });

            guide.Images = _store.ListImages(safeSlug);
            return Ok(guide);
        }

        [HttpPost]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Create([FromBody] CodexGuideWriteDTO body, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(body.Title))
                return BadRequest(new { error = "A guide needs a title." });

            var slug = SafeSlug(string.IsNullOrWhiteSpace(body.Slug)
                ? GuideStore.Slugify(body.Title)
                : GuideStore.Slugify(body.Slug!));

            if (_store.Exists(slug))
                return Conflict(new { error = $"A guide already exists at \"{slug}\"." });

            // Images were uploaded one at a time (see UploadDraftImage) while the author was
            // still typing the title, staged under a random id since the slug wasn't settled
            // yet. Now that it is, move them into the guide's real image folder.
            if (!string.IsNullOrWhiteSpace(body.DraftId) && IsSafeDraftId(body.DraftId))
                _store.AdoptDraftImages(body.DraftId, slug);

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
        public async Task<IActionResult> Update(string slug, [FromBody] CodexGuideWriteDTO body, CancellationToken ct)
        {
            slug = SafeSlug(slug);
            var existing = _store.Read(slug);
            if (existing is null) return NotFound(new { error = "No such guide." });

            if (!await MayEditAsync(existing, ct))
                return StatusCode(403, new { error = "Only the guide's author, an invited editor or a moderator can edit it." });

            // Its slug is already fixed, so new images went straight to {slug}/images
            // (see UploadImage) as soon as they were picked - nothing to adopt here.

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

        /// <summary>
        /// Opens a guide to everyone, or puts it back behind its game's role.
        ///
        /// Admins only - not the guide's owner. Publishing something to the open internet is a
        /// guild-wide call about what outsiders can read, not an authoring decision, and the
        /// default has to be the safe one for "private by default" to mean anything.
        /// </summary>
        [HttpPut("{slug}/visibility")]
        [Authorize(Policy = "CodexManager", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public IActionResult SetVisibility(string slug, [FromBody] CodexGuideVisibilityDTO body)
        {
            var safeSlug = SafeSlug(slug);
            var guide = _store.Read(safeSlug);
            if (guide is null) return NotFound(new { error = "No such guide." });

            guide.IsPublic = body.IsPublic;
            _store.Write(guide);

            _logger.LogInformation(
                "Codex guide \"{Slug}\" set {Visibility} by {UserId}",
                safeSlug, guide.IsPublic ? "public" : "members-only", DiscordId);

            return Ok(new { isPublic = guide.IsPublic });
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

        /// <summary>
        /// Serves a guide's uploaded images.
        ///
        /// Gated by the same read check as the guide itself. Without this, a members-only
        /// guide's screenshots would still be fetchable by anyone who knew the URL - and the
        /// images are often the substance of a guide, so leaving them open would undo most of
        /// what making the guide private is for.
        /// </summary>
        [HttpGet("{slug}/images/{fileName}")]
        public async Task<IActionResult> Image(string slug, string fileName, CancellationToken ct)
        {
            if (Path.GetFileName(fileName) != fileName) return BadRequest();

            var safeSlug = SafeSlug(slug);
            var guide = _store.Read(safeSlug);
            if (guide is null) return NotFound();

            if (!CanView(guide, await _access.GetMemberAsync(DiscordId, ct))) return NotFound();

            var path = _store.ImagePath(safeSlug, fileName);
            if (!System.IO.File.Exists(path)) return NotFound();

            if (!new FileExtensionContentTypeProvider().TryGetContentType(path, out var contentType))
                contentType = "application/octet-stream";

            return PhysicalFile(path, contentType);
        }

        /// <summary>
        /// Whether this member may *read* the guide.
        ///
        /// Guides are private by default, so the order matters: anyone who could edit it sees
        /// it (including their own drafts), drafts stop there, an admin can mark a guide public
        /// for the world, and everything else needs the Discord role configured for its game.
        ///
        /// Pure rather than async so the index can filter a whole list against one member.
        /// </summary>
        private bool CanView(CodexGuideDTO guide, CodexMember? member)
        {
            if (IsEditorOf(guide, member)) return true;

            // A draft is unfinished work - being allowed to read the game's guides is not the
            // same as being shown something its author has not published yet.
            if (guide.Draft) return false;

            if (guide.IsPublic) return true;

            var roleId = _guideAccess.RoleIdFor(guide.Game);
            if (roleId is null)
            {
                // Fail closed. An unlisted game must not silently become world-readable, but a
                // missing entry is easy to make, so say so loudly enough to be found in logs.
                _logger.LogWarning(
                    "No GuideAccess:GameRoleIds entry for game \"{Game}\", so its guides stay hidden " +
                    "from everyone but their authors and admins. Add one in guideaccess.json.",
                    guide.Game);
                return false;
            }

            return member?.HasRole(roleId) == true;
        }

        /// <summary>
        /// Who may change a guide's contents: its owner, anyone the owner has invited, or a
        /// manager. The write endpoints are gated by the CodexAuthor policy first, so an invited
        /// editor who has since lost the author role is already out before this runs - being on
        /// a guide's list widens *which* guides you may touch, it does not grant authoring.
        ///
        /// Deliberately does not require the author role itself: it also answers "may they read
        /// this", and an owner who lost the role should still see their own work.
        /// </summary>
        private static bool IsEditorOf(CodexGuideDTO guide, CodexMember? member)
        {
            if (member is null) return false;
            return member.Access.CanManage
                || guide.AuthorId == member.Id
                || guide.Editors.Contains(member.Id);
        }

        private async Task<bool> MayEditAsync(CodexGuideDTO guide, CancellationToken ct) =>
            IsEditorOf(guide, await _access.GetMemberAsync(DiscordId, ct));

        /// <summary>
        /// Who may delete a guide or change who can edit it: the owner and managers only.
        ///
        /// Invited editors are deliberately excluded from both. Removal is unrecoverable, and
        /// letting editors invite further editors would spread access sideways with no one
        /// able to say who let whom in.
        /// </summary>
        private async Task<bool> MayAdministerAsync(CodexGuideDTO guide, CancellationToken ct)
        {
            var member = await _access.GetMemberAsync(DiscordId, ct);
            if (member is null) return false;
            return member.Access.CanManage || guide.AuthorId == member.Id;
        }

        /// <summary>
        /// Uploads one image onto an existing guide. Images now go over the wire one at a
        /// time as multipart/form-data, not bundled as base64 into the Create/Update JSON
        /// body - a guide with many large images used to mean a single, gigantic request
        /// that could sit "pending" forever (and get rejected outright once past Cloudflare's
        /// ~100MB body cap on the way in). One request per image keeps every request small
        /// regardless of how many images a guide ends up with.
        /// </summary>
        [HttpPost("{slug}/images")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [RequestSizeLimit(MaxImageBytes + 1024 * 1024)]
        public async Task<IActionResult> UploadImage(string slug, IFormFile file, CancellationToken ct)
        {
            slug = SafeSlug(slug);
            var existing = _store.Read(slug);
            if (existing is null) return NotFound(new { error = "No such guide." });

            if (!await MayEditAsync(existing, ct))
                return StatusCode(403, new { error = "Only the guide's author, an invited editor or a moderator can edit it." });

            var (name, bytes, error) = await ReadImageAsync(file, ct);
            if (error is not null) return BadRequest(new { error });

            var current = _store.ListImages(slug);
            if (!current.Contains(name) && current.Count >= MaxImages)
                return BadRequest(new { error = $"Too many images (max {MaxImages})." });

            _store.SaveImage(slug, name!, bytes!);
            return Ok(new { filename = name });
        }

        /// <summary>Removes one of a guide's images.</summary>
        [HttpDelete("{slug}/images/{fileName}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> DeleteGuideImage(string slug, string fileName, CancellationToken ct)
        {
            slug = SafeSlug(slug);
            var existing = _store.Read(slug);
            if (existing is null) return NotFound(new { error = "No such guide." });

            if (!await MayEditAsync(existing, ct))
                return StatusCode(403, new { error = "Only the guide's author, an invited editor or a moderator can edit it." });

            if (Path.GetFileName(fileName) != fileName) return BadRequest();

            _store.DeleteImage(slug, fileName);
            return Ok(new { ok = true });
        }

        /// <summary>
        /// Stages one image for a guide that doesn't exist yet - its title (and so its slug)
        /// can still change while the author is typing, so there is nowhere stable to save
        /// it until Create() settles on a real slug and adopts everything staged here (see
        /// GuideStore.AdoptDraftImages). draftId is a random id the publish form generates
        /// once per new-guide session; anyone with the Codex Author role may stage under any
        /// id, since nothing is owned yet - Create() is what actually claims a slug.
        /// </summary>
        [HttpPost("drafts/{draftId}/images")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [RequestSizeLimit(MaxImageBytes + 1024 * 1024)]
        public async Task<IActionResult> UploadDraftImage(string draftId, IFormFile file, CancellationToken ct)
        {
            if (!IsSafeDraftId(draftId)) return BadRequest(new { error = "Invalid draft id." });

            var (name, bytes, error) = await ReadImageAsync(file, ct);
            if (error is not null) return BadRequest(new { error });

            if (_store.ListDraftImages(draftId).Count >= MaxImages)
                return BadRequest(new { error = $"Too many images (max {MaxImages})." });

            _store.SaveDraftImage(draftId, name!, bytes!);
            return Ok(new { filename = name });
        }

        /// <summary>Removes a staged draft image (e.g. the author removed it before publishing).</summary>
        [HttpDelete("drafts/{draftId}/images/{fileName}")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public IActionResult DeleteDraftImage(string draftId, string fileName)
        {
            if (!IsSafeDraftId(draftId)) return BadRequest();
            if (Path.GetFileName(fileName) != fileName) return BadRequest();

            _store.DeleteDraftImage(draftId, fileName);
            return Ok(new { ok = true });
        }

        /// <summary>Validates an uploaded image and reads it into memory, or returns why it was rejected.</summary>
        private async Task<(string? name, byte[]? bytes, string? error)> ReadImageAsync(IFormFile file, CancellationToken ct)
        {
            if (file is null || file.Length == 0) return (null, null, "No file uploaded.");

            var name = Path.GetFileName(file.FileName);
            if (string.IsNullOrWhiteSpace(name) || name != file.FileName)
                return (null, null, $"Invalid image filename: \"{file.FileName}\".");

            if (!AllowedImageExtensions.Contains(Path.GetExtension(name).ToLowerInvariant()))
                return (null, null, $"\"{name}\" is not an image type we accept.");

            if (file.Length > MaxImageBytes)
                return (null, null, $"\"{name}\" is larger than {MaxImageBytes / (1024 * 1024)}MB.");

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            return (name, ms.ToArray(), null);
        }

        /// <summary>Draft ids address a folder, so - like slugs - anything path-like is rejected outright rather than stripped.</summary>
        private static bool IsSafeDraftId(string? draftId) =>
            !string.IsNullOrEmpty(draftId) && draftId.Length is >= 8 and <= 64 &&
            draftId.All(ch => char.IsLetterOrDigit(ch) || ch == '-');

        private static string? Blank(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        /// <summary>Slugs address folders, so anything path-like has to be stripped.</summary>
        private static string SafeSlug(string slug) => GuideStore.Slugify(slug ?? string.Empty);
    }
}
