using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.DTO;
using Quintessence_Website.Services;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Auth surface for the Codex (the React app served at /guides).
    ///
    /// Login and logout are the *same* cookie session the Angular site uses - this is one
    /// website, one sign-in. These endpoints exist separately only so the Codex has a
    /// return-path aware login and a capability-shaped session response; they do not create
    /// a second session.
    /// </summary>
    [Route("api/codex")]
    [ApiController]
    public class CodexController : ControllerBase
    {
        private readonly CodexAccessService _access;
        private readonly IWebHostEnvironment _environment;

        public CodexController(CodexAccessService access, IWebHostEnvironment environment)
        {
            _access = access;
            _environment = environment;
        }

        private string SiteBaseUrl => _environment.IsDevelopment()
            ? "https://localhost:4200"
            : "https://quintessence-eu.com";

        /// <summary>
        /// Starts Discord sign-in and returns the user to where they came from.
        ///
        /// The Codex's login entry points are contextual ("Write a guide"), so landing back
        /// on the homepage would strand people away from what they were trying to do.
        /// </summary>
        [HttpGet("auth/login")]
        public IActionResult Login([FromQuery] string? returnTo)
        {
            var target = SiteBaseUrl + SafeReturnPath(returnTo);
            return Challenge(new AuthenticationProperties { RedirectUri = target }, "Discord");
        }

        [HttpPost("auth/logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(new { ok = true });
        }

        /// <summary>
        /// Who the caller is and what they may do. Always 200 - "signed out" is a normal
        /// answer here, not an error, so the UI can render its logged-out state without
        /// treating it as a failure.
        /// </summary>
        [HttpGet("auth/me")]
        public async Task<IActionResult> Me(CancellationToken ct)
        {
            // Shape matches what the Codex's AuthContext already expects: a single "role"
            // tier plus the user. It derives canPublish/canModerate from that itself.
            if (User.Identity?.IsAuthenticated != true)
            {
                return Ok(new { authenticated = false, role = "none", user = (object?)null });
            }

            var discordId = User.FindFirst("id")?.Value;
            var access = await _access.GetAccessAsync(discordId, ct);

            return Ok(new
            {
                authenticated = true,
                role = access.CanManage ? "moderator" : access.CanWrite ? "author" : "none",
                user = new
                {
                    id = discordId,
                    username = User.FindFirst("display_name")?.Value is { Length: > 0 } displayName
                        ? displayName
                        : User.FindFirst("user_name")?.Value,
                    avatar = User.FindFirst("avatar_url")?.Value,
                }
            });
        }

        /// <summary>
        /// Guild members matching a name, for the access dialog's search box.
        ///
        /// Authors only - this is a directory of real people, so it is not something an
        /// anonymous visitor gets to enumerate. Results are narrowed to members who hold a
        /// Codex role: anyone else could be added to a guide and still not be able to edit
        /// it, since the write endpoints check the role first.
        /// </summary>
        [HttpGet("members/search")]
        [Authorize(Policy = "CodexAuthor", AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        public async Task<IActionResult> SearchMembers([FromQuery] string? q, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Ok(Array.Empty<CodexMemberDTO>());

            var members = await _access.SearchMembersAsync(q, limit: 25, ct);

            return Ok(members
                .Where(m => m.Access.CanWrite)
                .Select(CodexGuidesController.ToDto)
                .ToList());
        }

        /// <summary>
        /// Keeps <paramref name="returnTo"/> to a path on this site.
        ///
        /// It arrives from a query string, so without this an attacker could hand someone a
        /// login link that bounces them to another host after signing in. Anything that is
        /// not a plain single-slash-rooted path is discarded in favour of the Codex home.
        /// </summary>
        private static string SafeReturnPath(string? returnTo)
        {
            const string fallback = "/guides/";

            if (string.IsNullOrWhiteSpace(returnTo)) return fallback;
            if (!returnTo.StartsWith('/')) return fallback;

            // "//host" and "/\host" are both read as protocol-relative URLs by browsers.
            if (returnTo.StartsWith("//") || returnTo.StartsWith("/\\")) return fallback;
            if (returnTo.Contains('\\')) return fallback;

            return returnTo;
        }
    }
}
