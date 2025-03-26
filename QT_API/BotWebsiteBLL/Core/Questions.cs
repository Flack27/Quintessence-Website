using Newtonsoft.Json;
using QuintessenceWebsiteInterface.DTO;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Questions
    { 
        public long? QuestionId { get; set; }
        public long? FormId { get; set; }
        public string? QuestionText { get; set; }
        public int? TypeId { get; set; }
        public string? Type { get; set; }
        public bool? IsRequired { get; set; }
        public List<Answers>? Answer { get; set; }
        public QuestionDependency? QuestionDependency { get; set; }
        public List<Options>? Options { get; set; }

        public Questions() { }
        

        public Questions(long questionId, long formId, string questionText, int typeId, string type, bool? isRequired, QuestionDependency? questionDependency, List<Options>? options, List<Answers>? answer)
        {
            FormId = formId;
            QuestionText = questionText;
            TypeId = typeId;
            IsRequired = isRequired;
            QuestionId = questionId;
            Type = type;
            QuestionDependency = questionDependency;
            Options = options;
            Answer = answer;
        }

        public Questions(QuestionsDTO dto)
        {
            QuestionId = dto.QuestionId;
            FormId = dto.FormId;
            QuestionText = dto.Question;
            TypeId = dto.TypeId;
            Type = dto.Type?.Type;
            IsRequired = dto.IsRequired;
            QuestionDependency = dto.QuestionDependency != null ? new QuestionDependency(dto.QuestionDependency) : null;
            Options = dto.Options?.Select(o => new Options(o)).ToList() ?? new List<Options>();
            Answer = dto.Answers?.Select(a => new Answers(a)).ToList() ?? new List<Answers>();
        }
    }
}
