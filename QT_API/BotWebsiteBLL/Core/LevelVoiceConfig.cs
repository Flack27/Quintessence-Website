using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class LevelVoiceConfig
    {
        private int level;
        private long roleId;
        private string? roleName;

        [JsonConstructor]
        public LevelVoiceConfig(int level, long roleId, string roleName)
        {
            this.level = level;
            this.roleId = roleId;
            this.roleName = roleName;
        }

        public int Level { get { return this.level; } }

        [JsonConverter(typeof(JsonConverter))]
        public long RoleId { get { return this.roleId; } }
        public string? RoleName { get { return this.roleName; } }
    }
}

