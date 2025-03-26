using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MiNET.Utils;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Authorize(Policy = "IsAdmin")]
    [Route("api/menu/[controller]")]
    [ApiController]
    public class FormController : ControllerBase
    {
        private readonly FormContainer _container;
        public FormController(FormContainer container)
        {
            _container = container;
        }

        [HttpGet("", Name = "GetForms")]
        public async Task<ActionResult<Form>> GetForms()
        {
            var form = await _container.GetForms();

            if (form == null)
            {
                return NotFound("Forms not found");
            }

            return Ok(form);
        }


        [HttpGet("{id}", Name = "GetForm")]
        public async Task<ActionResult<Form>> GetForm(long id)
        {
            var form = await _container.GetForm(id);

            if (form == null)
            {
                return NotFound("Form not found");
            }

            return Ok(form);
        }

        [HttpPut("add-form", Name = "AddForm")]
        public async Task<ActionResult<Form>> AddForm([FromBody] Form form)
        {
            var result = await _container.AddForm(form);
            var validationResult = result.validation;
            var formId = result.formId;

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            var newForm = await _container.GetForm(formId);

            if (newForm == null)
            {
                return NotFound("Form not found");
            }

            return Ok(newForm);
        }


        [HttpPut("update-form", Name = "UpdateForm")]
        public async Task<ActionResult<Form>> UpdateForm([FromBody] Form form)
        {
            var validationResult = await _container.UpdateForm(form);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Form updated successfully" });
        }
        

        [HttpGet("{id}/delete", Name = "DeleteForm")]
        public async Task<ActionResult> DeleteForm(long id)
        {
            var Result = await _container.DeleteForm(id);

            if (!Result)
            {
                return BadRequest("Failed to delete form");
            }

            return Ok(new { message = "Form deleted successfully" });
        }

        [HttpGet("{id}/set-active", Name = "SetActive")]
        public async Task<ActionResult> SetActive(long id)
        {
            var Result = await _container.SetActiveForm(id);

            if (!Result)
            {
                return BadRequest("Failed to set active form");
            }

            return Ok(new { message = "Form set to active successfully" });
        }
    }
}
