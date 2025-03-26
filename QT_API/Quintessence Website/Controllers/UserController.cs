using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;


namespace Quintessence_Website.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserContainer _container; 

        public UserController(UserContainer container)
        {
            _container = container;
        }

        [HttpGet("users", Name = "GetDisplayUsers")]
        public async Task<ActionResult<List<User>>> GetDisplayUsers()
        {
            // Fetch users from the container
            var users = await _container.GetDisplayUsers();

            if (users == null)
            {
                return NotFound("No users found.");
            }

            return Ok(users);
        }

        [HttpGet("user/{id}", Name = "GetUser")]
        public async Task<ActionResult<User>> GetUser(long id)
        {
            var user = await _container.GetUserById(id);

            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(user);
        }

        [Authorize(Policy = "IsMainRoster")]
        [HttpPut("save-links", Name = "SaveUserLinks")]
        public async Task<ActionResult> SaveUserLinks([FromBody] User user)
        {
            var validationResult = await _container.SaveUserLinks(user);

            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors.Select(e => e.ErrorMessage));
            }

            return Ok(new { message = "User links updated successfully." });
        }

        [Authorize(Policy = "IsAdmin")]
        [HttpPut("save-description", Name = "SaveUserDescription")]
        public async Task<ActionResult> SaveUserDescription([FromBody] User user)
        {
            var result = await _container.SaveUserDescription(user);

            if (!result)
            {
                return BadRequest("Failed to save user description");
            }

            return Ok(new { message = "User description updated successfully." });
        }
    }
}