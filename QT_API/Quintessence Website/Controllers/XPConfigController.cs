using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Authorize(Policy = "IsAdmin")]
    [ApiController]
    [Route("api/menu/[controller]")]
    public class XPConfigController : ControllerBase
    {
        private readonly XPConfigContainer _container;
        public XPConfigController(XPConfigContainer container) 
        {
            _container = container;
        }

        [HttpGet("get", Name = "GetXPConfig")]
        public async Task<ActionResult<XPConfig>> GetXPConfig()
        {
            var xpConfig = await _container.GetXPConfig();

            if (xpConfig == null)
            {
                return NotFound("XPconfig not found");
            }

            return Ok(xpConfig);
        }

        [HttpPut("update", Name = "UpdateXPConfig")]
        public async Task<ActionResult> UpdateXPConfig([FromBody] XPConfig xpConfig)
        {
            var validationResult = await _container.UpdateXPConfig(xpConfig);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Config updated successfully" });
        }

    }
}
