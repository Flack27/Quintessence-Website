using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    public record ReactionRoleConfigDTO
    {
        [Key]
        public int ConfigId { get; set; }
        public string Emoji { get; set; }

        public long ModeratorRoleId { get; set; }
        public RolesDTO ModeratorRole { get; set; }

        public long VerificationRoleId { get; set; }
        public RolesDTO VerificationRole { get; set; }

        public long OnlyOneChannelId { get; set; }
        public ChannelsDTO OnlyOneChannel { get; set; }
    }
}
