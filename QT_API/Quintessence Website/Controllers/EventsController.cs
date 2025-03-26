using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Authorize(Policy = "IsAdmin")]
    [Route("api/menu/[controller]")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly EventSignupsContainer _signups;
        private readonly EventsContainer _events;
        private readonly ChannelsContainer _channels;
        public EventsController(EventSignupsContainer signups, EventsContainer events, ChannelsContainer channels)
        {
            _events = events;
            _signups = signups;
            _channels = channels;
        }

        [HttpGet("category", Name = "GetCategories")]
        public async Task<ActionResult<Channels>> GetCategories()
        {
            var Channels = await _channels.GetEventChannels();

            if (Channels == null)
            {
                return NotFound("Channels not found");
            }

            return Ok(Channels);
        }

        [HttpGet("{channelId}", Name = "GetEvents")]
        public async Task<ActionResult<Events>> GetEvents(long channelId)
        {
            var Events = await _events.GetEvents(channelId);

            if (Events == null)
            {
                return NotFound("Events not found");
            }

            return Ok(Events);
        }

        [HttpGet("{eventId}/signups", Name = "GetEventSignups")]
        public async Task<ActionResult<EventSignups>> GetEventSignups(long eventId)
        {
            var Signups = await _signups.GetEventSignups(eventId);

            if (Signups == null)
            {
                return NotFound("Signups not found");
            }

            return Ok(Signups);
        }
    }
}
