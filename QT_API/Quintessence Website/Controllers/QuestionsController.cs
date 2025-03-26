using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

namespace Quintessence_Website.Controllers
{

    [Route("api/menu/[controller]")]
    [ApiController]
    public class QuestionController : ControllerBase
    {
        private QuestionsContainer _container;
        public QuestionController(QuestionsContainer container)
        {
            _container = container;
        }

        [HttpPut("add", Name = "AddQuestion")]
        public async Task<ActionResult<Questions>> AddQuestion([FromBody] Questions question)
        {
            var result = await _container.AddQuestion(question);
            var validationResult = result.validationResult;
            var newQuestion = result.question;

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            if (newQuestion == null)
            {
                return NotFound("Question not found");
            }

            return Ok(newQuestion);
        }

        [HttpPut("update", Name = "UpdateQuestion")]
        public async Task<ActionResult> UpdateQuestion([FromBody] Questions question)
        {
            var validationResult = await _container.UpdateQuestion(question);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Question updated successfully" });
        }

        [HttpGet("delete/{id}", Name = "DeleteQuestion")]
        public async Task<ActionResult> DeleteQuestion(long id)
        {
            var Result = await _container.DeleteQuestion(id);

            if (!Result)
            {
                return BadRequest("Failed to delete question");
            }

            return Ok(new { message = "Question deleted successfully" });
        }

        [HttpPut("save-dependency", Name = "AddQuestionDependency")]
        public async Task<ActionResult<QuestionDependency>> AddQuestionDependency([FromBody] QuestionDependency questionDependency)
        {
            var validationResult = await _container.SaveQuestionDependency(questionDependency);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "Dependency saved successfully" });
        }

        [HttpGet("delete-dependency/{questionId}", Name = "DeleteQuestionDependency")]
        public async Task<ActionResult> DeleteQuestionDependency(long questionId)
        {
            var Result = await _container.DeleteQuestionDependency(questionId);

            if (Result != true)
            {
                return BadRequest("Failed to delete dependency");
            }

            return Ok(new { message = "Dependency deleted successfully" });
        }
    }
}
