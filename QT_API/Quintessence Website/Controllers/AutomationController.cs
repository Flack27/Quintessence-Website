using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Authorize(Policy = "IsAdmin")]
    [Route("api/menu/[controller]")]
    [ApiController]
    public class AutomationController : ControllerBase
    {
        private AutomationContainer _container;

        public AutomationController(AutomationContainer container)
        {
            _container = container;
        }

        [HttpGet("get", Name = "GetAutomatedChecks")]
        public async Task<ActionResult<AutomationContainer>> GetAutomatedChecks()
        {
            var config = await _container.GetConfigurations();
            if (config == null)
            {
                return NotFound("Config not found");
            }
            return Ok(config);
        }

        [HttpPut("update", Name = "UpdateAutomatedCheck")]
        public async Task<ActionResult> UpdateAutomatedCheck([FromBody] AutomatedChecks automatedCheck)
        {
            var validationResult = await _container.UpdateAutomatedCheck(automatedCheck);
            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }
            return Ok(new { message = "Config updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteAutomatedCheck")]
        public async Task<ActionResult> DeleteAutomatedCheck(int id)
        {
            var result = await _container.DeleteAutomatedCheck(id);
            if (result != true)
            {
                return BadRequest("Failed to delete config");
            }
            return Ok(new { message = "Config deleted successfully" });
        }
    }
}