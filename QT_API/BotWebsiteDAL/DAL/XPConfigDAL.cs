using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteDAL.DAL
{
    public class XPConfigDAL : IXPConfigDAL
    {
        private readonly QuintessenceDbContext _context;

        public XPConfigDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<XPConfigDTO> GetXPConfig()
        {
            try
            {
                return await _context.XPConfigs.FirstOrDefaultAsync(); 
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetXPConfig Error: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> UpdateXPConfig(XPConfigDTO config)
        {
            try
            {
                var existingConfig = _context.XPConfigs.FirstOrDefault();
                if (existingConfig != null)
                {
                    existingConfig.MessageCooldown = config.MessageCooldown;
                    existingConfig.MessageMaxXP = config.MessageMaxXP;
                    existingConfig.MessageMinXP = config.MessageMinXP;
                    existingConfig.VoiceCooldown = config.VoiceCooldown;
                    existingConfig.VoiceMaxXP = config.VoiceMaxXP;
                    existingConfig.VoiceMinXP = config.VoiceMinXP;

                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("UpdateXPConfig Error: " + ex.Message);
                return false;
            }
        }
    }
}
