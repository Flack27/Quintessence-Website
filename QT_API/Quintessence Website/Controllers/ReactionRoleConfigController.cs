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
    public class ReactionRoleConfigController : ControllerBase
    {
        private ReactionRoleConfigContainer _container;

        public ReactionRoleConfigController(ReactionRoleConfigContainer container)
        { 
             _container = container;
        }

        [HttpGet("get", Name = "GetRRConfig")]
        public async Task<ActionResult<ReactionRoleConfig>> GetRRConfig()
        {
            var Config = await _container.GetConfigurations();

            if (Config == null)
            {
                return NotFound("Config not found");
            }

            return Ok(Config);
        }

        [HttpPut("update", Name = "UpdateRRConfig")]
        public async Task<ActionResult> UpdateRRConfig([FromBody] ReactionRoleConfig reactionRoleConfig)
        {
            var validationResult = await _container.UpdateReactionRoleConfig(reactionRoleConfig);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Config updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteRRConfig")]
        public async Task<ActionResult> DeleteRRConfig(int id)
        {
            var Result = await _container.ClearConfiguration(id);
            
            if(Result != true)
            {
                return BadRequest("Failed to delete config");
            }

            return Ok(new { message = "Config deleted successfully" });
        }
    }
}
