
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IUserDAL
    {
        Task<List<UsersDTO>> GetDisplayUsers();
        Task<UsersDTO?> GetUserById(long id);
        Task<bool> SaveUserDescription(UsersDTO userDTO);
        Task<bool> SaveUserLinks(UsersDTO userDTO);
        Task<bool> UserHasRole(long userId, long roleId);
    }
}
