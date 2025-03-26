using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("LevelToRoleVoice")]
    public record LevelToRoleVoiceDTO
    {
        [Key]
        public int Level { get; set; }
        public long RoleId { get; set; }
        public RolesDTO Role { get; set; }
    }
}
