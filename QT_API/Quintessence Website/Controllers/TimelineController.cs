using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Guild-wide "Our journey" timeline shown below Previous Games.
    /// Reading is public; editing is admin-only.
    /// </summary>
    [Route("api/timeline")]
    [ApiController]
    public class TimelineController : ControllerBase
    {
        private readonly ITimelineDAL _timeline;

        public TimelineController(ITimelineDAL timeline)
        {
            _timeline = timeline;
        }

        [AllowAnonymous]
        [HttpGet]
        public IActionResult GetTimeline()
        {
            return Ok(_timeline.GetEntries().Select(e => new
            {
                e.EntryId,
                e.Period,
                e.Title,
                e.Description
            }));
        }

        public record TimelineEntryRequest(string Period, string Title, string? Description);

        [Authorize(Policy = "IsAdmin")]
        [HttpPost]
        public IActionResult AddEntry([FromBody] TimelineEntryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Period) || string.IsNullOrWhiteSpace(request.Title))
                return BadRequest("Period and title are required");

            var entry = _timeline.AddEntry(new GuildTimelineEntryDTO
            {
                Period = request.Period.Trim(),
                Title = request.Title.Trim(),
                Description = request.Description?.Trim()
            });

            return Ok(new { entry.EntryId, entry.Period, entry.Title, entry.Description });
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpDelete("{entryId}")]
        public IActionResult DeleteEntry(long entryId)
        {
            if (!_timeline.DeleteEntry(entryId))
                return NotFound("Timeline entry not found");

            return Ok(new { success = true });
        }
    }
}
