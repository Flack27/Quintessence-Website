using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Form")]
    public record FormDTO
    {
        [Key]
        public long FormId { get; set; }
        public string Title { get; set; } = null!;
        public string Description { get; set; } = null!;
        public bool IsActive { get; set; }
        public bool? Deleted { get; set; }
        public ICollection<QuestionsDTO>? Questions { get; set; } = null;
    }
}
