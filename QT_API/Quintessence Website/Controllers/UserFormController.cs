using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.Container;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserFormController : ControllerBase
    {
        private FormContainer _forms;
        private QuestionsContainer _quests;
        private readonly AnswersContainer _answers;
        public UserFormController(FormContainer forms, QuestionsContainer questions, AnswersContainer answers)
        {
            _forms = forms;
            _quests = questions;
            _answers = answers;
        }


        [HttpGet("active-form", Name = "GetActiveForm")]
        public async Task<ActionResult<Form>> GetActiveForm()
        {
            var form = await _forms.GetActiveForm();

            if (form == null)
            {
                return NotFound("Forms not found");
            }

            return Ok(form);
        }

        [HttpGet("submission-questions/{formId}/{submissionId}/{userId}", Name = "GetSubmissionQuestions")]
        public async Task<ActionResult<Questions>> GetSubmissionQuestions(long formId, long submissionId, long userId)
        {
            var questions = await _quests.GetSubmissionQuestions(formId, submissionId, userId);

            if (questions == null)
            {
                return NotFound("Questions not found");
            }

            return Ok(questions);
        }

        [HttpGet("submission-dependent-questions/{formId}/{submissionId}/{userId}", Name = "GetSubmissionDependentQuestions")]
        public async Task<ActionResult<Questions>> GetSubmissionDependentQuestions(long formId, long submissionId, long userId)
        {
            var questions = await _quests.GetSubmissionDependentQuestions(formId, submissionId, userId);

            if (questions == null)
            {
                return NotFound("Dependent questions not found");
            }

            return Ok(questions);
        }

        [HttpGet("questions/{formId}/{userId}", Name = "GetQuestionsWithAnswers")]
        public async Task<ActionResult<Questions>> GetQuestionsWithAnswers(long formId, long userId)
        {
            var questions = await _quests.GetQuestionsWithAnswers(formId, userId);

            if (questions == null)
            {
                return NotFound("Questions not found");
            }

            return Ok(questions);
        }

        [HttpGet("dependent-questions/{formId}/{userId}", Name = "GetDependentQuestions")]
        public async Task<ActionResult<Questions>> GetDependentQuestions(long formId, long userId)
        {
            var questions = await _quests.GetDependentQuestions(formId, userId);

            if (questions == null)
            {
                return NotFound("Dependent questions not found");
            }

            return Ok(questions);
        }


        [HttpPut("save", Name = "SaveAnswers")]
        public async Task<ActionResult> SaveAnswers([FromBody] List<Answers> answers)
        {
            var result = await _answers.SaveAnswers(answers);
            var validationResult = result.Item1;
            var submissionId = result.Item2;

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            var userId = answers.FirstOrDefault()?.UserId ?? 0;
            var formId = answers.FirstOrDefault()?.FormId ?? 0;

            var questions = await _quests.GetDependentQuestions(formId, userId);

            if (questions == null)
            {
                return NotFound("Dependent questions not found");
            }

            Response.Headers.Append("submissionId", submissionId.ToString());
            return Ok(questions);
        }


        [HttpPut("save-and-submit", Name = "SaveAnswersAndSubmit")]
        public async Task<ActionResult> SaveAnswersAndSubmit([FromBody] List<Answers> answers)
        {
            var validationResult = await _answers.SaveAnswersAndSubmit(answers);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Answers saved successfully" });
        }
    }
}
