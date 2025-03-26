using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using System.Data;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteDAL.Context;
using Microsoft.EntityFrameworkCore;

namespace QuintessenceWebsiteDAL.DAL
{
    public class LevelToRoleMessageDAL : ILevelMessageConfigDAL
    {
        private readonly QuintessenceDbContext _context;

        public LevelToRoleMessageDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<LevelToRoleMessagesDTO>?> GetLevelMessageConfigs()
        {
            try
            {
                return await _context.LevelToRoleMessage.Include(r => r.Role).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetLevelVoiceConfigsAsync: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> AddLevelMessageConfig(LevelToRoleMessagesDTO dto)
        {
            try
            {
                var existingConfig = await _context.LevelToRoleMessage.FindAsync(dto.Level);
                if (existingConfig != null)
                {
                    existingConfig.RoleId = dto.RoleId;
                    _context.LevelToRoleMessage.Update(existingConfig);
                }
                else
                {
                    await _context.LevelToRoleMessage.AddAsync(dto);
                }

                return await _context.SaveChangesAsync() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("AddLevelVoiceConfigAsync: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> DeleteLevelMessageConfig(int Level)
        {
            try
            {
                var entity = await _context.LevelToRoleMessage.FirstOrDefaultAsync(e => e.Level == Level);

                if (entity == null)
                {
                    return false;
                }

                _context.LevelToRoleMessage.Remove(entity);
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

