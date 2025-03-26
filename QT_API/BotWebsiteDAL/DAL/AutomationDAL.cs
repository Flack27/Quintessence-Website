using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteDAL.DAL
{
    public class AutomationDAL : IAutomationDAL
    {
        private readonly QuintessenceDbContext _context;

        public AutomationDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<AutomatedChecksDTO>?> GetAutomatedChecks()
        {
            try
            {
                return await _context.AutomatedChecks.ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetAutomatedChecks: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> AddAutomatedCheck(AutomatedChecksDTO config)
        {
            try
            {
                if (config.Id > 0)
                {
                    var existingCheck = await _context.AutomatedChecks.FindAsync(config.Id);
                    if (existingCheck != null)
                    {
                        existingCheck.CheckDelayMinutes = config.CheckDelayMinutes;
                        existingCheck.AutoRemoveAbsentUsers = config.AutoRemoveAbsentUsers;
                        existingCheck.AutoRemoveLateUsers = config.AutoRemoveLateUsers;
                        existingCheck.PingUsers = config.PingUsers;
                        _context.AutomatedChecks.Update(existingCheck);
                    }
                    else
                    {
                        return false;
                    }
                }
                else
                {
                    await _context.AutomatedChecks.AddAsync(config);
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("AddAutomatedCheck: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> DeleteAutomatedCheck(int id)
        {
            try
            {
                var check = await _context.AutomatedChecks.FindAsync(id);
                if (check != null)
                {
                    _context.AutomatedChecks.Remove(check);
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteAutomatedCheck: " + ex.Message);
                return false;
            }
        }
    }
}