using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Users")]
    public record UsersDTO
    {
        [Key]
        public long UserId { get; set; }
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        public bool InGuild { get; set; }
        public string? Avatar { get; set; }

        public string? Steam { get; set; }
        public string? X { get; set; }
        public string? Twitch { get; set; }
        public string? Youtube { get; set; }
        public string? Description { get; set; }
  
        public virtual UserDataDTO? UserData { get; set; }
        public virtual ICollection<FormSubmissionDTO>? FormSubmissions { get; set; }
        public virtual ICollection<EventSignupsDTO>? Signups { get; set; }
        public virtual ICollection<RolesDTO>? Roles { get; set; }
    }
}
