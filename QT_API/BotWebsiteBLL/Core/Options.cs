using Newtonsoft.Json;
using QuintessenceWebsiteInterface.DTO;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Options
    { 
        public long? QuestionId { get; set; }
        public int? OptionId { get; set; }
        public string? AnswerOption { get; set; }
        
        public Options() { }

        public Options(long questionId, int optionId, string answerOption)
        {
            QuestionId = questionId;
            OptionId = optionId;
            AnswerOption = answerOption;
        }

        public Options(OptionsDTO dto)
        {
            QuestionId = dto.QuestionId;
            OptionId = dto.OptionId;
            AnswerOption = dto.AnswerOption;
        }
    }
}
