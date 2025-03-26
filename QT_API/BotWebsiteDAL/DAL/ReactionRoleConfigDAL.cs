
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteDAL.Context;
using Microsoft.EntityFrameworkCore;

namespace QuintessenceWebsiteDAL.DAL
{
    public class ReactionRoleConfigDAL : IReactionRoleConfigDAL
    {
        private readonly QuintessenceDbContext _context;

        public ReactionRoleConfigDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<ReactionRoleConfigDTO>> GetConfigurations()
        {
            try
            {
                return await _context.ReactionRoleConfig
                    .Include(r => r.ModeratorRole) 
                    .Include(r => r.VerificationRole) 
                    .Include(r => r.OnlyOneChannel) 
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetConfigurations: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> UpdateConfiguration(ReactionRoleConfigDTO config)
        {
            try
            {
                var existingConfig = await _context.ReactionRoleConfig.FindAsync(config.ConfigId);
                if (existingConfig != null)
                {
                    existingConfig.Emoji = config.Emoji;
                    existingConfig.ModeratorRoleId = config.ModeratorRoleId;
                    existingConfig.VerificationRoleId = config.VerificationRoleId;
                    existingConfig.OnlyOneChannelId = config.OnlyOneChannelId;

                    _context.ReactionRoleConfig.Update(existingConfig);
                }
                else
                {
                    await _context.ReactionRoleConfig.AddAsync(config);
                }

                return await _context.SaveChangesAsync() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("UpdateConfiguration: " + ex.Message);
                return false;
            }
        }


        public async Task<bool> ClearConfiguration(int configId)
        {
            try
            {
                var config = await _context.ReactionRoleConfig.FindAsync(configId);
                if (config != null)
                {
                    _context.ReactionRoleConfig.Remove(config);
                    return await _context.SaveChangesAsync() > 0;
                }
                return false; 
            }
            catch (Exception ex)
            {
                Console.WriteLine("ClearConfiguration: " + ex.Message);
                return false;
            }
        }
    }
}