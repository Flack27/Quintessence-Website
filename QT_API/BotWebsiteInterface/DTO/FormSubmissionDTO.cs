using QuintessenceWebsiteInterface.DTO;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("FormSubmission")]
    public record FormSubmissionDTO
    {
        [Key]
        public long SubmissionId { get; set; }
        public long UserId { get; set; }
        public UsersDTO? User { get; set; }
        public long FormId { get; set; }
        public FormDTO? Form { get; set; }
        public DateTime SubmitDate { get; set; } = DateTime.Now;
        public bool? Approved { get; set; }
        public bool IsComplete { get; set; } = false;
    }
}