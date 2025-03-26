using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("QuestionType")]
    public record QuestionTypeDTO
    {
        [Key]
        public int TypeId { get; set; }
        public string Type { get; set; }
    }
}
