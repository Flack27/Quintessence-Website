
using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IReactionRoleConfigDAL
    {
        Task<List<ReactionRoleConfigDTO>> GetConfigurations();
        Task<bool> UpdateConfiguration(ReactionRoleConfigDTO config);
        Task<bool> ClearConfiguration(int configId);
    }
}
