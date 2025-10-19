using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Container
{
    public class AnswersContainer
    {
        private readonly IAnswersDAL _answersDAL;

        public AnswersContainer(IAnswersDAL answersDAL)
        {
            _answersDAL = answersDAL;
        }

        public async Task<(ValidationResult, long?)> SaveAnswers(List<Answers> answers)
        {
            var validator = new AnswersValidator();
            var validationErrors = new List<ValidationFailure>();

            foreach (var answer in answers)
            {
                var results = validator.Validate(answer);
                if (!results.IsValid)
                {
                    validationErrors.AddRange(results.Errors);
                }
            }

            if (validationErrors.Any())
            {
                return (new ValidationResult(validationErrors), null);
            }

            var userId = answers.FirstOrDefault()?.UserId ?? 0;
            var formId = answers.FirstOrDefault()?.FormId ?? 0;

            // Create FormSubmission but mark it as INCOMPLETE
            var formSubmission = new FormSubmissionDTO
            {
                UserId = userId,
                FormId = formId,
                IsComplete = false  // NOT complete yet - user hasn't finished dependent questions
            };

            var submissionId = await _answersDAL.Submit(formSubmission);

            if (submissionId == null)
            {
                validationErrors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return (new ValidationResult(validationErrors), null);
            }

            var answersDTO = answers.Select(a => new AnswersDTO
            {
                Answer = a.Answer,
                SubmissionId = submissionId.Value,
                QuestionId = a.QuestionId!.Value,
                UserId = a.UserId!.Value
            }).ToList();

            var saveResult = await _answersDAL.SaveAnswers(answersDTO);

            if (!saveResult)
            {
                validationErrors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return (new ValidationResult(validationErrors), null);
            }

            return (new ValidationResult(), submissionId);
        }

        public async Task<ValidationResult> SaveAnswersAndSubmit(List<Answers> answers)
        {
            var validator = new AnswersValidator();
            var validationErrors = new List<ValidationFailure>();

            // Handle auto-submit case (no dependent questions needed)
            if (answers.Count == 1 && answers.FirstOrDefault()?.Answer == null)
            {
                var firstUserId = answers.FirstOrDefault()?.UserId ?? 0;
                var firstSubmissionId = answers.FirstOrDefault()?.SubmissionId ?? 0;

                // Mark the submission as COMPLETE
                var markComplete = await _answersDAL.MarkSubmissionComplete(firstSubmissionId);

                if (!markComplete)
                {
                    validationErrors.Add(new ValidationFailure("DAL", "Failed to mark submission as complete."));
                    return new ValidationResult(validationErrors);
                }

                await CallWebhookAsync(firstUserId, firstSubmissionId);
                return new ValidationResult();
            }

            // Validate dependent question answers
            foreach (var answer in answers)
            {
                var results = validator.Validate(answer);
                if (!results.IsValid)
                {
                    validationErrors.AddRange(results.Errors);
                }
            }

            if (validationErrors.Any())
            {
                return new ValidationResult(validationErrors);
            }

            // Save dependent question answers
            var answersDTO = answers.Select(a => new AnswersDTO
            {
                AnswerId = a.AnswerId,
                Answer = a.Answer,
                QuestionId = a.QuestionId!.Value,
                UserId = a.UserId!.Value,
                SubmissionId = a.SubmissionId!.Value
            }).ToList();

            var saveAnswers = await _answersDAL.SaveAnswers(answersDTO);

            if (!saveAnswers)
            {
                validationErrors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return new ValidationResult(validationErrors);
            }

            var userId = answers.FirstOrDefault()?.UserId ?? 0;
            var submissionId = answers.FirstOrDefault()?.SubmissionId ?? 0;

            // NOW mark the submission as COMPLETE
            var markCompleteResult = await _answersDAL.MarkSubmissionComplete(submissionId);

            if (!markCompleteResult)
            {
                validationErrors.Add(new ValidationFailure("DAL", "Failed to mark submission as complete."));
                return new ValidationResult(validationErrors);
            }

            await CallWebhookAsync(userId, submissionId);

            return new ValidationResult();
        }

        private async Task CallWebhookAsync(long userId, long submissionId)
        {
            try
            {
                using var client = new HttpClient();
                string webhookHost = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
                    ? "qutie-bot" 
                    : "localhost";

                var webhookUrl = $"http://{webhookHost}:5000/webhook/?userId={userId}&submissionId={submissionId}";
                Console.WriteLine($"Calling webhook URL: {webhookUrl}");

                var response = await client.GetAsync(webhookUrl);

                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine("Webhook called successfully.");
                }
                else
                {
                    Console.WriteLine($"Webhook call failed. Status Code: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while calling webhook: {ex.Message}");
            }
        }
    }
}
