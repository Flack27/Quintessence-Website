namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>
    /// A game shown on the public games page, stored as JSON (no database).
    /// Achievements and gallery items are embedded on the game itself.
    /// </summary>
    public record GamesDTO
    {
        public long GameId { get; set; }
        public string GameName { get; set; } = string.Empty;

        /// <summary>Card artwork shown on the games page.</summary>
        public string? ImageUrl { get; set; }

        /// <summary>Wide banner used for the past-game popup header.</summary>
        public string? BannerUrl { get; set; }

        /// <summary>Card hover text on the public games page.</summary>
        public string? Description { get; set; }

        /// <summary>'Active' | 'Upcoming' | 'Previous'.</summary>
        public string Status { get; set; } = "Active";

        /// <summary>Optional official-website link shown on current-game card hover.</summary>
        public string? SiteUrl { get; set; }

        /// <summary>Era chip on prior-game cards/popup, e.g. "2024–2025".</summary>
        public string? Period { get; set; }

        /// <summary>Players chip on the popup, e.g. "100+".</summary>
        public string? Players { get; set; }

        /// <summary>Full chapter story shown on the past-game popup.</summary>
        public string? FullStory { get; set; }

        /// <summary>The Qutie game this maps to (events graph, rosters). Snowflake stored as string.</summary>
        public string? QutieGameId { get; set; }

        /// <summary>Whether the popup pulls the events graph / VODs from the Qutie public API.</summary>
        public bool PullFromQutie { get; set; }

        /// <summary>Manual sort order (lower = first).</summary>
        public int DisplayOrder { get; set; }

        public List<GameAchievementDTO> Achievements { get; set; } = new();
        public List<GameGalleryItemDTO> Gallery { get; set; } = new();
    }
}
