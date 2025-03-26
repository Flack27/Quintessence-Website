using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Answers")]
    public record AnswersDTO
    {
        [Key]
        public long? AnswerId { get; set; }
        public string? Answer { get; set; }
        public long SubmissionId { get; set; }

        public long QuestionId { get; set; }
        public QuestionsDTO? Question { get; set; }

        public long UserId { get; set; }
        public UsersDTO? User { get; set; }
    }
}
