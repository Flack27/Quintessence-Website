using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Questions")]
    public record QuestionsDTO
    {
        [Key]
        public long QuestionId { get; set; }
        public QuestionDependencyDTO? QuestionDependency { get; set; }
        public ICollection<OptionsDTO>? Options { get; set; } = null;
        public ICollection<AnswersDTO>? Answers { get; set; } = null;

        public long FormId { get; set; }
        public FormDTO? Form { get; set; } = null;

        public int TypeId { get; set; }
        public QuestionTypeDTO? Type { get; set; } = null;

        public string Question { get; set; } = null!;
        public bool? IsRequired { get; set; }
    }
}
