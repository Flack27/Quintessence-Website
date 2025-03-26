using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("EventSignups")]
    public record EventSignupsDTO
    {
        [Key]
        public long SignupId { get; set; }

        public long EventId { get; set; }

        public long UserId { get; set; }
        public UsersDTO User { get; set; }

        public virtual EventsDTO? Event { get; set; }
    }

}
