using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class UserContainer
    {
        private readonly IUserDAL dal;

        public UserContainer(IUserDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<User>?> GetDisplayUsers()
        {
            var users = new List<User>();
            var userDTOList = await dal.GetDisplayUsers();

            if (userDTOList == null) { return null; }

            var rolePriority = new List<string> { "Monarchs", "Advisors", "Auxiliary", "Guild Bot", "Main Roster" };

            foreach (var dto in userDTOList)
            {
                User newUser = new User(dto);
                users.Add(newUser);
            }

            return users.OrderBy(u => u.Roles!.Select(r => rolePriority.IndexOf(r.RoleName)).Where(index => index >= 0).DefaultIfEmpty(int.MaxValue) .Min()).ThenBy(u => u.DisplayName) .ToList();
        }

        public async Task<User?> GetUserById(long userId)
        {
            var userDTO = await dal.GetUserById(userId);

            if(userDTO == null) { return null; }

            User newUser = new User(userDTO);

            return newUser;
        }

        public async Task<bool> SaveUserDescription(User user)
        {
            var userDTO = new UsersDTO
            {
                UserId = user.UserId,
                Description = user.Description,
            };

            return await dal.SaveUserDescription(userDTO);
        }

        public async Task<ValidationResult> SaveUserLinks(User user)
        {
            var validator = new UserValidator();
            var results = validator.Validate(user);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine($"Property {failure.PropertyName} failed validation. Error was: {failure.ErrorMessage}");
                }
                return results;
            }

            var userDTO = new UsersDTO
            {
                UserId = user.UserId,
                Steam = user.Steam,
                X = user.X,
                Twitch = user.Twitch,
                Youtube = user.Youtube,
            };

            var updateResult = await dal.SaveUserLinks(userDTO);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }
    }

}
