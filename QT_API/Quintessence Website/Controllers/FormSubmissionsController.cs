using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Route("api/menu/[controller]")]
    [ApiController]
    public class FormSubmissionsController : ControllerBase
    {
        private FormSubmissionsContainer _container;
        public FormSubmissionsController(FormSubmissionsContainer container)
        {
            _container = container;
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpGet("get", Name = "GetFormSubmissions")]
        public async Task<ActionResult> GetFormSubmissions()
        {
            var form = await _container.GetFormSubmissions();

            if (form == null)
            {
                return NotFound("Form submissions not found");
            }

            return Ok(form);
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpGet("get/{submissionId}", Name = "GetFormSubmission")]
        public async Task<ActionResult> GetFormSubmission(long submissionId)
        {
            var form = await _container.GetFormSubmission(submissionId);

            if (form == null)
            {
                return NotFound("Form submission not found");
            }

            return Ok(form);
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpPost("approval", Name = "UpdateFormSubmissionApproval")]
        public async Task<ActionResult> UpdateFormSubmissionApproval([FromBody] SubmissionApprovalModel model)
        {
            if (model == null || model.SubmissionId <= 0)
            {
                return BadRequest("Invalid submission data");
            }

            var result = await _container.SaveFormsubmissionApproval(model.SubmissionId, model.Approved);

            if (result)
            {
                return Ok(new { success = true, message = $"Submission {(model.Approved ? "approved" : "rejected")} successfully" });
            }
            else
            {
                return StatusCode(500, "Failed to update submission status");
            }
        }
    }

    public class SubmissionApprovalModel
    {
        public long SubmissionId { get; set; }
        public bool Approved { get; set; }
    }
}
