
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IXPConfigDAL
    {
        Task<XPConfigDTO> GetXPConfig();
        Task<bool> UpdateXPConfig(XPConfigDTO config);
    }
}
