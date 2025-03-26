using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Intrinsics.Arm;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class QuestionsContainer
    {
        private readonly IQuestionsDAL _questionsDal;

        public QuestionsContainer(IQuestionsDAL questionsDal)
        {
            _questionsDal = questionsDal;
        }

        public async Task<List<Questions>?> GetQuestions(long formId)
        {
            List<Questions> questions = new List<Questions>();
            List<QuestionsDTO> questionsDtos = await _questionsDal.GetQuestions(formId);

            if (questionsDtos == null) { return null; }

            foreach (var dto in questionsDtos)
            {
                questions.Add(new Questions(dto));
            }

            return questions;
        }

        public async Task<List<Questions>?> GetSubmissionQuestions(long formId, long submissionId, long userId)
        {
            List<Questions> questions = new List<Questions>();
            List<QuestionsDTO> questionsDtos = await _questionsDal.GetSubmissionQuestions(formId, submissionId, userId);

            if (questionsDtos == null) { return null; }

            foreach (var dto in questionsDtos)
            {
                questions.Add(new Questions(dto));
            }

            return questions;
        }

        public async Task<List<Questions>?> GetSubmissionDependentQuestions(long formId, long submissionId, long userId)
        {
            List<Questions> questions = new List<Questions>();
            List<QuestionsDTO> questionsDtos = await _questionsDal.GetSubmissionDependentQuestions(formId, submissionId, userId);

            if (questionsDtos == null) { return null; }

            foreach (var dto in questionsDtos)
            {
                questions.Add(new Questions(dto));
            }

            return questions;
        }

        public async Task<List<Questions>?> GetQuestionsWithAnswers(long formId, long userId)
        {
            List<Questions> questions = new List<Questions>();
            List<QuestionsDTO> questionsDtos = await _questionsDal.GetQuestionsWithAnswers(formId, userId);

            if (questionsDtos == null) { return null; }

            foreach (var dto in questionsDtos)
            {
                questions.Add(new Questions(dto));
            }

            return questions;
        }

        public async Task<List<Questions>?> GetDependentQuestions(long formId, long userId)
        {
            List<Questions> questions = new List<Questions>();
            List<QuestionsDTO> questionsDtos = await _questionsDal.GetDependentQuestions(formId, userId);

            if (questionsDtos == null) { return null; }

            foreach (var dto in questionsDtos)
            {
                questions.Add(new Questions(dto));
            }

            return questions;
        }

        public async Task<(ValidationResult validationResult, Questions? question)> AddQuestion(Questions question)
        {
            QuestionsAddValidator validator = new QuestionsAddValidator();
            ValidationResult results = validator.Validate(question);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return (results, null);
            }

            var questionDto = new QuestionsDTO
            {
                FormId = question.FormId!.Value,
                TypeId = question.TypeId!.Value,
                Question = question.QuestionText!,
                IsRequired = question.IsRequired,
                Options = question.Options?.Select(option => new OptionsDTO { AnswerOption = option.AnswerOption }).ToList() ?? null,
                QuestionDependency = question.QuestionDependency != null ? new QuestionDependencyDTO { DependsOnQuestionId = question.QuestionDependency.DependsOnQuestionId, RequiredAnswer = question.QuestionDependency.RequiredAnswer } : null
            };

            var newQuestionDTO = await _questionsDal.AddQuestion(questionDto);

            if (newQuestionDTO == null)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to add question to the database."));
                Console.WriteLine("Error: Failed to add question to the database.");
                return (results, null);
            }

            var newQuestion = new Questions(newQuestionDTO);

            return (new ValidationResult(), newQuestion);
        }

        public async Task<ValidationResult> UpdateQuestion(Questions question)
        {
            QuestionsValidator validator = new QuestionsValidator();
            ValidationResult results = validator.Validate(question);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var questionDto = new QuestionsDTO
            {
                QuestionId = question.QuestionId!.Value,
                FormId = question.FormId!.Value,
                TypeId = question.TypeId!.Value,
                Question = question.QuestionText!,
                IsRequired = question.IsRequired,
                Options = question.Options?.Select(option => new OptionsDTO { OptionId = option.OptionId, AnswerOption = option.AnswerOption }).ToList() ?? null,
                QuestionDependency = question.QuestionDependency != null ? new QuestionDependencyDTO { DependsOnQuestionId = question.QuestionDependency.DependsOnQuestionId, RequiredAnswer = question.QuestionDependency.RequiredAnswer } : null
            };

            bool updateResult = await _questionsDal.UpdateQuestion(questionDto);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update question in the database."));
                Console.WriteLine("Error: Failed to update question in the database.");
                return results;
            }

            return new ValidationResult();
        }

        public async Task<ValidationResult> SaveQuestionDependency(QuestionDependency question)
        {
            QuestionDependencyValidator validator = new QuestionDependencyValidator();
            ValidationResult results = validator.Validate(question);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var questionDto = new QuestionDependencyDTO
            {
                QuestionId = question.QuestionId,
                DependsOnQuestionId = question.DependsOnQuestionId,
                RequiredAnswer = question.RequiredAnswer
            };

            bool updateResult = await _questionsDal.SaveQuestionDependency(questionDto);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update question in the database."));
                Console.WriteLine("Error: Failed to update question in the database.");
                return results;
            }

            return new ValidationResult();
        }

        public async Task<bool> DeleteQuestion(long questionId)
        {
            return await _questionsDal.DeleteQuestion(questionId);
        }

        public async Task<bool> DeleteQuestionDependency(long questionId)
        {
            return await _questionsDal.DeleteQuestionDependency(questionId);
        }
    }
}
