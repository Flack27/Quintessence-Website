using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class QuestionDependency
    {
        public long QuestionId { get; set; }
        public long DependsOnQuestionId { get; set; }
        public string RequiredAnswer { get; set; }

        [JsonConstructor]
        public QuestionDependency(long questionId, long dependsOnQuestionId, string requiredAnswer)
        {
            QuestionId = questionId;
            DependsOnQuestionId = dependsOnQuestionId;
            RequiredAnswer = requiredAnswer;
        }

        public QuestionDependency(QuestionDependencyDTO dto)
        {
            QuestionId = dto.QuestionId;
            DependsOnQuestionId = dto.DependsOnQuestionId;
            RequiredAnswer = dto.RequiredAnswer;
        }
    }
}