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
    public class EventChannelsController : ControllerBase
    {
        private EventChannelsContainer _container;
        public EventChannelsController(EventChannelsContainer container) 
        { 
            _container = container;
        }

        [HttpGet("get", Name = "GetEventChannels")]
        public async Task<ActionResult<EventChannelsContainer>> GetEventChannels()
        {
            var Config = await _container.GetConfigurations();

            if (Config == null)
            {
                return NotFound("Config not found");
            }

            return Ok(Config);
        }

        [HttpPut("update", Name = "UpdateEventChannels")]
        public async Task<ActionResult> UpdateEventChannels([FromBody] EventChannels eventChannels)
        {
            var validationResult = await _container.UpdateEventChannel(eventChannels);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Config updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteEventChannel")]
        public async Task<ActionResult> DeleteEventChannel(long id)
        {
            var Result = await _container.DeleteEventChannel(id);

            if (Result != true)
            {
                return BadRequest("Failed to delete config");
            }

            return Ok(new { message = "Config deleted successfully" });
        }
    }
}
