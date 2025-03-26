using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("QuestionDependency")]
    public record QuestionDependencyDTO
    {
        [Key]
        public long QuestionId { get; set; }
        public QuestionsDTO? Question { get; set; }
        public long DependsOnQuestionId { get; set; }
        public string RequiredAnswer { get; set; } = null!;
    }
}
