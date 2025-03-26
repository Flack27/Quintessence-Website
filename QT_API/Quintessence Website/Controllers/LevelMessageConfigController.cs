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
    public class LevelMessageConfigController : ControllerBase
    {
        private LevelMessageConfigContainer _container;
        public LevelMessageConfigController(LevelMessageConfigContainer container) 
        { 
            _container = container;
        }

        [HttpGet("get", Name = "GetLMConfig")]
        public async Task<ActionResult<LevelMessageConfig>> GetLMConfig()
        {
            var Config = await _container.GetLevelMessageConfig();

            if (Config == null)
            {
                return NotFound("Config not found");
            }

            return Ok(Config);
        }

        [HttpPut("update", Name = "UpdateLMConfig")]
        public async Task<ActionResult> UpdateLMConfig([FromBody] LevelMessageConfig levelMessageConfig)
        {
            var validationResult = await _container.AddLevelMessageConfig(levelMessageConfig);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Config updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteLMConfig")]
        public async Task<ActionResult> DeleteLMConfig(int id)
        {
            var Result = await _container.DeleteLevelMessageConfig(id);

            if (Result != true)
            {
                return BadRequest("Failed to delete config");
            }

            return Ok(new { message = "Config deleted successfully" });
        }
    }
}
