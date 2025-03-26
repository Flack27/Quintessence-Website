using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class RolesContainer
    {
        private readonly IRolesDAL dal;

        public RolesContainer(IRolesDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<Roles>?> GetRoleData()
        {
            List<Roles> botData = new List<Roles>();
            List<RolesDTO> botDataDTOs = await dal.GetBotRoles();

            if (botDataDTOs == null) { return null; }

            foreach (RolesDTO dto in botDataDTOs)
            {
                Roles newBotData = new Roles(dto);
                botData.Add(newBotData);
            }
            return botData;
        }
    }
}
