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
    public class LevelVoiceConfigController : ControllerBase
    {
        private LevelVoiceConfigContainer _container;
        public LevelVoiceConfigController(LevelVoiceConfigContainer container) 
        { 
            _container = container;
        }

        [HttpGet("get", Name = "GetLVConfig")]
        public async Task<ActionResult<LevelVoiceConfig>> GetLVConfig()
        {
            var Config = await _container.GetLevelVoiceConfigs();

            if (Config == null)
            {
                return NotFound("Config not found");
            }

            return Ok(Config);
        }

        [HttpPut("update", Name = "UpdateLVConfig")]
        public async Task<ActionResult> UpdateLVConfig([FromBody] LevelVoiceConfig levelVoiceConfig)
        {
            var validationResult = await _container.AddLevelVoiceConfig(levelVoiceConfig);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Config updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteLVConfig")]
        public async Task<ActionResult> DeleteLVConfig(int id)
        {
            var Result = await _container.DeleteLevelVoiceConfig(id);

            if (Result != true)
            {
                return BadRequest("Failed to delete config");
            }

            return Ok(new { message = "Config deleted successfully" });
        }
    }
}
