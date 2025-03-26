
using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface ILevelVoiceConfigDAL
    {
        Task<List<LevelToRoleVoiceDTO>?> GetLevelVoiceConfigs();
        Task<bool> AddLevelVoiceConfig(LevelToRoleVoiceDTO dto);
        Task<bool> DeleteLevelVoiceConfig(int Level);
    }
}
