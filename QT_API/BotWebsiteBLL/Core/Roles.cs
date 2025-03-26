using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Roles
    {
        private readonly long roleId;
        private readonly string roleName;

        public Roles(long roleId, string roleName)
        {
            this.roleId = roleId;
            this.roleName = roleName;
        }

        public Roles(RolesDTO dto)
        {
            roleId = dto.RoleId;
            roleName = dto.RoleName;
        }

        [JsonConverter(typeof(JsonConverter))]
        public long RoleId { get { return roleId; } }
        public string RoleName { get { return roleName; } }
    }
}
