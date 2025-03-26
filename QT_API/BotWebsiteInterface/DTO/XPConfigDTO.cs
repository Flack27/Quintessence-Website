using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("XPConfig")]
    public record XPConfigDTO
    {
        [Key]
        public int ConfigId { get; set; }

        public int VoiceMinXP { get; set; }
        public int VoiceMaxXP { get; set; }
        public int VoiceCooldown { get; set; }


        public int MessageMinXP { get; set; }
        public int MessageMaxXP { get; set; }
        public int MessageCooldown { get; set; }

    }
}
