using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// The static main roster (admin-managed list of members). The per-game active
    /// rosters and their attendance come from the Qutie public API, not here.
    /// Reading is public; editing is admin-only.
    /// </summary>
    [Route("api/roster")]
    [ApiController]
    public class RosterController : ControllerBase
    {
        private static readonly string[] _tiers = { "owner", "admin", "officer", "member" };
        private readonly IRosterDAL _roster;

        public RosterController(IRosterDAL roster)
        {
            _roster = roster;
        }

        [AllowAnonymous]
        [HttpGet]
        public IActionResult GetRoster()
        {
            return Ok(_roster.GetMembers().Select(Project));
        }

        public record MemberRequest(string DisplayName, string Rank, string RankTier, string? AvatarUrl, List<long>? GameIds);

        [Authorize(Policy = "IsAdmin")]
        [HttpPost]
        public IActionResult AddMember([FromBody] MemberRequest request)
        {
            var error = Validate(request);
            if (error != null) return BadRequest(error);

            var member = _roster.AddMember(new RosterMemberDTO
            {
                DisplayName = request.DisplayName.Trim(),
                Rank = request.Rank.Trim(),
                RankTier = request.RankTier,
                AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim(),
                GameIds = request.GameIds ?? new List<long>()
            });

            return Ok(Project(member));
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpPut("{memberId}")]
        public IActionResult UpdateMember(long memberId, [FromBody] MemberRequest request)
        {
            var error = Validate(request);
            if (error != null) return BadRequest(error);

            var success = _roster.UpdateMember(new RosterMemberDTO
            {
                MemberId = memberId,
                DisplayName = request.DisplayName.Trim(),
                Rank = request.Rank.Trim(),
                RankTier = request.RankTier,
                AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim(),
                GameIds = request.GameIds ?? new List<long>()
            });
            if (!success)
                return NotFound("Member not found");

            return Ok(new { success = true });
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpDelete("{memberId}")]
        public IActionResult DeleteMember(long memberId)
        {
            if (!_roster.DeleteMember(memberId))
                return NotFound("Member not found");

            return Ok(new { success = true });
        }

        public record ReorderRequest(List<string> MemberIds);

        [Authorize(Policy = "IsAdmin")]
        [HttpPut("order")]
        public IActionResult ReorderMembers([FromBody] ReorderRequest request)
        {
            if (request?.MemberIds == null || request.MemberIds.Count == 0)
                return BadRequest("No member ids provided");

            var ids = new List<long>();
            foreach (var s in request.MemberIds)
            {
                if (!long.TryParse(s, out var id))
                    return BadRequest($"Invalid member id: {s}");
                ids.Add(id);
            }

            if (!_roster.ReorderMembers(ids))
                return StatusCode(500, "Failed to reorder members");

            return Ok(new { success = true });
        }

        private string? Validate(MemberRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DisplayName))
                return "Display name is required";
            if (string.IsNullOrWhiteSpace(request.Rank))
                return "Rank is required";
            if (!_tiers.Contains(request.RankTier))
                return "Rank tier must be owner, admin, officer or member";
            return null;
        }

        private static object Project(RosterMemberDTO m) => new
        {
            m.MemberId,
            m.DisplayName,
            m.Rank,
            m.RankTier,
            m.AvatarUrl,
            m.GameIds
        };
    }
}
