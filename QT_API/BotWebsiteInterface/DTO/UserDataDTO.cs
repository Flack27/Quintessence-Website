using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("UserData")]
    public record UserDataDTO
    {
        [Key]
        public long UserId { get; set; }

        public int? MessageXP { get; set; }
        public int? MessageLevel { get; set; }
        public int? MessageRequiredXP { get; set; }
        public int? MessageCount { get; set; }
        public int? VoiceXP { get; set; }
        public int? VoiceLevel { get; set; }
        public int?  VoiceRequiredXP { get; set; }
        public decimal? TotalVoiceTime { get; set; }

        public UsersDTO User { get; set; } = null!;
    }
}
