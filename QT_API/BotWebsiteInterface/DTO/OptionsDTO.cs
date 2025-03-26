using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Options")]
    public record OptionsDTO
    {
        [Key]
        public int? OptionId { get; set; }

        public long QuestionId { get; set; }

        public string? AnswerOption { get; set; }
    }
}
