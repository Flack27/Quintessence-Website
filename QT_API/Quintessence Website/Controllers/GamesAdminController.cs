using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace Quintessence_Website.Controllers
{
    /// <summary>
    /// Admin management of the public games showcase: create/edit/reorder/delete games,
    /// upload images, and manage the past-game popup content (achievements, gallery).
    /// All editing happens inline on the public games page (admin view). JSON-backed.
    /// </summary>
    [Authorize(Policy = "IsAdmin")]
    [Route("api/menu/games")]
    [ApiController]
    public class GamesAdminController : ControllerBase
    {
        private static readonly string[] _statuses = { "Active", "Upcoming", "Previous" };
        private readonly IGamesDAL _games;

        public GamesAdminController(IGamesDAL games)
        {
            _games = games;
        }

        [HttpGet]
        public IActionResult GetAllGames()
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
                g.Players,
                g.FullStory,
                g.PullFromQutie,
                g.QutieGameId
            }));
        }

        public record CreateGameRequest(string GameName);

        [HttpPost]
        public IActionResult CreateGame([FromBody] CreateGameRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.GameName))
                return BadRequest("Game name is required");

            var created = _games.CreateGame(request.GameName.Trim());
            return Ok(new { created.GameId, created.GameName, created.Status });
        }

        public record UpdateGameRequest(
            string GameName,
            string Status,
            string? Description,
            string? SiteUrl,
            string? Period,
            string? Players,
            string? FullStory,
            bool PullFromQutie,
            string? QutieGameId);

        [HttpPut("{gameId}")]
        public IActionResult UpdateGame(long gameId, [FromBody] UpdateGameRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.GameName))
                return BadRequest("Game name is required");

            if (!_statuses.Contains(request.Status))
                return BadRequest("Status must be Active, Upcoming or Previous");

            var existing = _games.GetGame(gameId);
            if (existing == null)
                return NotFound("Game not found");

            var success = _games.UpdateGame(existing with
            {
                GameName = request.GameName.Trim(),
                Status = request.Status,
                Description = request.Description,
                SiteUrl = request.SiteUrl,
                Period = request.Period,
                Players = request.Players,
                FullStory = request.FullStory,
                PullFromQutie = request.PullFromQutie,
                QutieGameId = string.IsNullOrWhiteSpace(request.QutieGameId) ? null : request.QutieGameId.Trim()
            });
            if (!success)
                return NotFound("Game not found");

            return Ok(new { success = true });
        }

        [HttpDelete("{gameId}")]
        public IActionResult DeleteGame(long gameId)
        {
            if (!_games.DeleteGame(gameId))
                return NotFound("Game not found");

            return Ok(new { success = true });
        }

        public record ReorderRequest(List<string> GameIds);

        [HttpPut("order")]
        public IActionResult ReorderGames([FromBody] ReorderRequest request)
        {
            if (request?.GameIds == null || request.GameIds.Count == 0)
                return BadRequest("No game ids provided");

            var ids = new List<long>();
            foreach (var s in request.GameIds)
            {
                if (!long.TryParse(s, out var id))
                    return BadRequest($"Invalid game id: {s}");
                ids.Add(id);
            }

            if (!_games.ReorderGames(ids))
                return StatusCode(500, "Failed to reorder games");

            return Ok(new { success = true });
        }

        // ---------- Image upload (card / banner / gallery) ----------

        private static readonly string[] _allowedImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        private static async Task<(string? url, string? error)> SaveImage(long gameId, string kind, IFormFile file, IWebHostEnvironment env)
        {
            if (file == null || file.Length == 0)
                return (null, "No file uploaded");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowedImageExtensions.Contains(extension))
                return (null, "Only jpg, png and webp images are allowed");

            var uploadDir = Path.Combine(env.ContentRootPath, "uploads", "games");
            Directory.CreateDirectory(uploadDir);

            var fileName = $"game{gameId}_{kind}_{DateTime.UtcNow:yyyyMMddHHmmssfff}{extension}";
            var filePath = Path.Combine(uploadDir, fileName);

            using (var stream = System.IO.File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }

            return ($"/api/games/images/{fileName}", null);
        }

        [HttpPost("{gameId}/image")]
        [RequestSizeLimit(8 * 1024 * 1024)]
        public async Task<IActionResult> UploadImage(long gameId, [FromQuery] string type, IFormFile file, [FromServices] IWebHostEnvironment env)
        {
            if (type != "card" && type != "banner")
                return BadRequest("type must be 'card' or 'banner'");

            if (_games.GetGame(gameId) == null)
                return NotFound("Game not found");

            var (url, error) = await SaveImage(gameId, type, file, env);
            if (url == null)
                return BadRequest(error);

            if (!_games.SetImage(gameId, type, url))
                return StatusCode(500, "Failed to save image url");

            return Ok(new { url });
        }

        // ---------- Achievements ----------

        public record AchievementRequest(string Icon, string Title, string? Description);

        [HttpPost("{gameId}/achievements")]
        public IActionResult AddAchievement(long gameId, [FromBody] AchievementRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest("Title is required");

            var achievement = _games.AddAchievement(gameId, new GameAchievementDTO
            {
                Icon = string.IsNullOrWhiteSpace(request.Icon) ? "fa-medal" : request.Icon.Trim(),
                Title = request.Title.Trim(),
                Description = request.Description?.Trim()
            });
            if (achievement == null)
                return NotFound("Game not found");

            return Ok(new { achievement.AchievementId, achievement.Icon, achievement.Title, achievement.Description });
        }

        [HttpDelete("{gameId}/achievements/{achievementId}")]
        public IActionResult DeleteAchievement(long gameId, long achievementId)
        {
            if (!_games.DeleteAchievement(gameId, achievementId))
                return NotFound("Achievement not found");

            return Ok(new { success = true });
        }

        // ---------- Gallery ----------

        /// <summary>Uploads a gallery image; returns its url. Pair with POST gallery to create the item.</summary>
        [HttpPost("{gameId}/gallery/upload")]
        [RequestSizeLimit(8 * 1024 * 1024)]
        public async Task<IActionResult> UploadGalleryImage(long gameId, IFormFile file, [FromServices] IWebHostEnvironment env)
        {
            if (_games.GetGame(gameId) == null)
                return NotFound("Game not found");

            var (url, error) = await SaveImage(gameId, "gallery", file, env);
            if (url == null)
                return BadRequest(error);

            return Ok(new { url });
        }

        public record GalleryItemRequest(string ItemType, string? ImageUrl, string? YoutubeId, string? Caption);

        [HttpPost("{gameId}/gallery")]
        public IActionResult AddGalleryItem(long gameId, [FromBody] GalleryItemRequest request)
        {
            if (request.ItemType != "image" && request.ItemType != "video")
                return BadRequest("ItemType must be 'image' or 'video'");
            if (request.ItemType == "image" && string.IsNullOrWhiteSpace(request.ImageUrl))
                return BadRequest("Image items need an imageUrl (upload first)");
            if (request.ItemType == "video" && string.IsNullOrWhiteSpace(request.YoutubeId))
                return BadRequest("Video items need a youtubeId");

            var item = _games.AddGalleryItem(gameId, new GameGalleryItemDTO
            {
                ItemType = request.ItemType,
                ImageUrl = request.ImageUrl?.Trim(),
                YoutubeId = request.YoutubeId?.Trim(),
                Caption = request.Caption?.Trim()
            });
            if (item == null)
                return NotFound("Game not found");

            return Ok(new { item.ItemId, item.ItemType, item.ImageUrl, item.YoutubeId, item.Caption });
        }

        [HttpDelete("{gameId}/gallery/{itemId}")]
        public IActionResult DeleteGalleryItem(long gameId, long itemId)
        {
            if (!_games.DeleteGalleryItem(gameId, itemId))
                return NotFound("Gallery item not found");

            return Ok(new { success = true });
        }
    }
}
