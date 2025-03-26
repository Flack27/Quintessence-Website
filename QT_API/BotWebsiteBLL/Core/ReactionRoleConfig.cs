using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class ReactionRoleConfig
    {
        private int id;
        private string emoji;
        private long moderatorRoleId;
        private string moderatorRoleName;
        private long verificationRoleId;
        private string verificationRoleName;
        private long onlyOneChannelId;
        private string onlyOneChannelName;

        public ReactionRoleConfig(int id, string emoji, long moderatorRoleId, string moderatorRoleName, long verificationRoleId, string verificationRoleName, long onlyOneChannelId, string onlyOneChannelName)
        {
            this.id = id;
            this.emoji = emoji;
            this.moderatorRoleId = moderatorRoleId;
            this.moderatorRoleName = moderatorRoleName;
            this.verificationRoleId = verificationRoleId;
            this.verificationRoleName = verificationRoleName;
            this.onlyOneChannelId = onlyOneChannelId;
            this.onlyOneChannelName = onlyOneChannelName;
        }

        [JsonConstructor]
        public ReactionRoleConfig(int id, string emoji, long moderatorRoleId, long verificationRoleId, long onlyOneChannelId) : this(id, emoji, moderatorRoleId, "", verificationRoleId, "", onlyOneChannelId, "") { }

        public int Id { get { return id; } }
        public string Emoji { get { return emoji; } }

        [JsonConverter(typeof(JsonConverter))]
        public long ModeratorRoleId { get { return moderatorRoleId; } }
        public string ModeratorRoleName { get { return moderatorRoleName; } }

        [JsonConverter(typeof(JsonConverter))]
        public long VerificationRoleId { get { return verificationRoleId; } }
        public string VerificationRoleName { get { return verificationRoleName; } }

        [JsonConverter(typeof(JsonConverter))]
        public long OnlyOneChannelId { get { return  onlyOneChannelId; } }
        public string OnlyOneChannelName { get { return onlyOneChannelName; } }
    }

}
