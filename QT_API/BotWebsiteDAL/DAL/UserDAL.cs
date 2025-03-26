using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteDAL.Context;

namespace QuintessenceWebsiteDAL.DAL
{
    public class UserDAL : IUserDAL
    {
        private readonly QuintessenceDbContext _context;

        public UserDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<UsersDTO>> GetDisplayUsers()
        {
            try
            {
                return await _context.Users
                    .Include(u => u.Roles)
                    .Where(u => u.Roles.Any(r => r.RoleName == "Main Roster"))
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetDisplayUsers: " + ex.Message);
                return null;
            }
        }


        public async Task<UsersDTO?> GetUserById(long id)
        {
            try
            {
                return await _context.Users.Include(u => u.Roles).Include(f => f.FormSubmissions).FirstOrDefaultAsync(u => u.UserId == id);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetUserById: " + ex.Message);
                return null;
            }
        }

        public async Task<bool> SaveUserDescription(UsersDTO userDTO)
        {
            try
            {
                var user = await _context.Users.FindAsync(userDTO.UserId);
                if (user != null)
                {
                    user.Description = userDTO.Description;
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveUserDescription: " + ex.Message);
                return false;
            }
        } 

        public async Task<bool> SaveUserLinks(UsersDTO userDTO)
        {
            try
            {
                var user = await _context.Users.FindAsync(userDTO.UserId);
                if (user != null)
                {
                    user.Steam = userDTO.Steam;
                    user.X = userDTO.X;
                    user.Twitch = userDTO.Twitch;
                    user.Youtube = userDTO.Youtube;

                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveUserLinks: " + ex.Message);
                return false;
            }
        }

        public async Task<bool> UserHasRole(long userId, long roleId)
        {
            try
            {
                return await _context.Users.Where(u => u.UserId == userId).AnyAsync(u => u.Roles.Any(r => r.RoleId == roleId));
            }
            catch (Exception ex)
            {
                Console.WriteLine("UserHasRole: " + ex.Message);
                return false;
            }
        }

    }
}
