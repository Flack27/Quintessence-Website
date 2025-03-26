using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("AutomatedChecks")]
    public record AutomatedChecksDTO
    {
        [Key]
        public int Id { get; set; }

        public int CheckDelayMinutes { get; set; }
        public bool AutoRemoveAbsentUsers { get; set; }
        public bool AutoRemoveLateUsers { get; set; }
        public bool PingUsers { get; set; }
    }
}
