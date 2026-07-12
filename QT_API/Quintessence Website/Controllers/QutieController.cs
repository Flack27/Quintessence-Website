using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quintessence_Website.Services;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Public read proxy to the Qutie API. The Angular site calls these; this backend
    /// forwards to Qutie with the server-side API key (never exposed to the browser).
    /// Read-only, so it stays anonymous - it only surfaces the guild's own public data.
    /// </summary>
    [AllowAnonymous]
    [Route("api/qutie")]
    [ApiController]
    public class QutieController : ControllerBase
    {
        private readonly QutieApiClient _qutie;

        public QutieController(QutieApiClient qutie)
        {
            _qutie = qutie;
        }

        [HttpGet("games")]
        public Task<IActionResult> Games() => Passthrough(_qutie.GetGamesJson());

        [HttpGet("members")]
        public Task<IActionResult> Members([FromQuery] string? roleId) => Passthrough(_qutie.GetGuildMembersJson(roleId));

        [HttpGet("games/{gameId}/members")]
        public Task<IActionResult> GameMembers(string gameId) => Passthrough(_qutie.GetGameMembersJson(gameId));

        [HttpGet("games/{gameId}/events")]
        public Task<IActionResult> GameEvents(string gameId) => Passthrough(_qutie.GetGameEventsJson(gameId));

        [HttpGet("events/{eventId}/vods")]
        public Task<IActionResult> EventVods(string eventId) => Passthrough(_qutie.GetEventVodsJson(eventId));

        /// <summary>Return Qutie's JSON verbatim; 503 when unconfigured or upstream failed (site degrades).</summary>
        private async Task<IActionResult> Passthrough(Task<string?> task)
        {
            var json = await task;
            if (json == null)
                return StatusCode(503, new { error = "qutie_unavailable" });
            return Content(json, "application/json");
        }
    }
}
