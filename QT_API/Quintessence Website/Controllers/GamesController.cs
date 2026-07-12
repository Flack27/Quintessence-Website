using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.INTERFACE;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Public game data for the games page and the past-game popup. No login needed.
    /// </summary>
    [AllowAnonymous]
    [Route("api/games")]
    [ApiController]
    public class GamesController : ControllerBase
    {
        private readonly IGamesDAL _games;

        public GamesController(IGamesDAL games)
        {
            _games = games;
        }

        /// <summary>All games for the public games page (both tabs).</summary>
        [HttpGet("public")]
        public IActionResult GetPublicGames()
        {
            return Ok(_games.GetGames().Select(g => new
            {
                g.GameId,
                g.GameName,
                g.ImageUrl,
                g.BannerUrl,
                g.Description,
                g.Status,
                g.SiteUrl,
                g.Period,
                g.QutieGameId,
                g.PullFromQutie
            }));
        }

        /// <summary>Everything the past-game popup shows: story, achievements, gallery.</summary>
        [HttpGet("{gameId}/details")]
        public IActionResult GetDetails(long gameId)
        {
            var game = _games.GetGame(gameId);
            if (game == null)
                return NotFound("Game not found");

            return Ok(new
            {
                game.GameId,
                game.GameName,
                game.ImageUrl,
                game.BannerUrl,
                game.Status,
                game.Period,
                game.Players,
                game.FullStory,
                game.PullFromQutie,
                game.QutieGameId,
                Achievements = game.Achievements.Select(a => new
                {
                    a.AchievementId,
                    a.Icon,
                    a.Title,
                    a.Description
                }),
                Gallery = game.Gallery.Select(i => new
                {
                    i.ItemId,
                    i.ItemType,
                    i.ImageUrl,
                    i.YoutubeId,
                    i.Caption
                })
            });
        }

        /// <summary>Serves uploaded game images (cards/banners/gallery).</summary>
        [HttpGet("images/{fileName}")]
        public IActionResult GetImage(string fileName, [FromServices] IWebHostEnvironment env)
        {
            // Prevent path traversal
            fileName = Path.GetFileName(fileName);

            var filePath = Path.Combine(env.ContentRootPath, "uploads", "games", fileName);
            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var contentType = Path.GetExtension(fileName).ToLowerInvariant() switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            return PhysicalFile(filePath, contentType);
        }
    }
}
