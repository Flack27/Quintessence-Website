using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;

namespace Quintessence_Website.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;

        public AccountsController(IWebHostEnvironment environment)
        {
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
        public IActionResult Info()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                var claims = User.Claims.ToDictionary(c => c.Type, c => c.Value);

                return Ok(new
                {
                    isAuthenticated = true,
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
