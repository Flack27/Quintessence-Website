using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Answers
    {
        public long? AnswerId {  get; set; }
        public string? Answer { get; set; }
        public long? QuestionId { get; set; }
        public long? SubmissionId { get; set; }

        [JsonConverter(typeof(JsonConverter))]
        public long? UserId { get; set; }
        public long? FormId { get; set; }

        [JsonConstructor]
        public Answers() { }

        public Answers(long? answerId, string? answer, long? questionId, long? userId, long? submissionId, long formId) 
        {
            this.AnswerId = answerId;
            this.Answer = answer;
            this.QuestionId = questionId;
            this.UserId = userId;
            this.SubmissionId = submissionId;
            this.FormId = formId;
        }

        public Answers(AnswersDTO dto) 
        {
            this.AnswerId = dto.AnswerId;
            this.Answer = dto.Answer;
            this.QuestionId = dto.QuestionId;
            this.SubmissionId = dto.SubmissionId;
            this.UserId = dto.UserId;
            this.FormId = dto.Question?.FormId;
        }
    }
}
