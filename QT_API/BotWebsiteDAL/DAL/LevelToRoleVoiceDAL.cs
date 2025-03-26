
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class LevelToRoleVoiceDAL : ILevelVoiceConfigDAL
    {
        private readonly QuintessenceDbContext _context;

        public LevelToRoleVoiceDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<LevelToRoleVoiceDTO>?> GetLevelVoiceConfigs()
        {
            try
            {
                return await _context.LevelToRoleVoice.Include(r => r.Role).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetLevelVoiceConfigsAsync: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> AddLevelVoiceConfig(LevelToRoleVoiceDTO dto)
        {
            try
            {
                var existingConfig = await _context.LevelToRoleVoice.FindAsync(dto.Level);
                if (existingConfig != null)
                {
                    existingConfig.RoleId = dto.RoleId;
                    _context.LevelToRoleVoice.Update(existingConfig);
                }
                else
                {
                    await _context.LevelToRoleVoice.AddAsync(dto);
                }

                return await _context.SaveChangesAsync() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("AddLevelVoiceConfigAsync: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> DeleteLevelVoiceConfig(int Level)
        {
            try
            {
                var entity = await _context.LevelToRoleVoice.FirstOrDefaultAsync(e => e.Level == Level);

                if (entity == null)
                {
                    return false;
                }

                _context.LevelToRoleVoice.Remove(entity);
                var rowsAffected = await _context.SaveChangesAsync();

                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteLevelVoiceConfigAsync: " + ex.Message);
                return false;
            }
        }
    }
}

