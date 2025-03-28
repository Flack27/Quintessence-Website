using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.INTERFACE;
using static AspNet.Security.OAuth.Discord.DiscordAuthenticationConstants;
using System.Security.Claims;


namespace Quintessence_Website.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly IUserDAL _userDal;
        private readonly IWebHostEnvironment _environment;

        public AccountsController(
            IUserDAL userDal,
            IWebHostEnvironment environment)
        {
            _userDal = userDal;
            _environment = environment;
        }

        [HttpGet("login/{redirect}")]
        public IActionResult Login(string redirect)
        {
            string baseUrl = _environment.IsDevelopment()
                ? "https://localhost:4200"
                : "https://quintessence-eu.com";

            return Challenge(new AuthenticationProperties { RedirectUri = $"{baseUrl}/{redirect}" }, "Discord");
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("Info")]
        public async Task<IActionResult> Info()
        {
            if(User.Identity != null && User.Identity.IsAuthenticated)
            {
                var userId = User.FindFirst("id")?.Value;
                if (userId == null) return Unauthorized();

                var discordId = long.Parse(userId);
                var user = await _userDal.GetUserById(discordId);

                var inGuild = false;
                var filledForm = false;

                if (user != null)
                {
                    if (user.InGuild == true) { inGuild = true; }
                    filledForm = user.FormSubmissions?.Any() ?? false;
                }

                var claims = User.Claims.ToDictionary(c => c.Type, c => c.Value);

                return Ok(new
                {
                    isAuthenticated = true,
                    inGuild,
                    filledForm,
                    claims
                });
            }

            return Ok(new { isAuthenticated = false });
        }

        [HttpGet("auth-callback")]
        public IActionResult AuthCallback()
        {
            return Ok();
        }
    }
}
