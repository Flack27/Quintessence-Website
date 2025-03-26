using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IQuestionsDAL
    {
        public Task<List<QuestionsDTO>?> GetQuestions(long id);
        public Task<List<QuestionsDTO>?> GetSubmissionQuestions(long id, long submissionId, long userId);
        public Task<List<QuestionsDTO>?> GetSubmissionDependentQuestions(long formId, long submissionId, long userId);
        public Task<List<QuestionsDTO>?> GetQuestionsWithAnswers(long id, long userId);
        public Task<List<QuestionsDTO>?> GetDependentQuestions(long formId, long userId);
        public Task<QuestionsDTO?> AddQuestion(QuestionsDTO questionDTO);
        public Task<bool> UpdateQuestion(QuestionsDTO question);
        public Task<bool> DeleteQuestion(long id);

        public Task<bool> SaveQuestionDependency(QuestionDependencyDTO question);
        public Task<bool> DeleteQuestionDependency(long questionId);
    }
}
