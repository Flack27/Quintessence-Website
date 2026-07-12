namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>Achievement card shown on the past-game popup (embedded on a game).</summary>
    public record GameAchievementDTO
    {
        public long AchievementId { get; set; }

        /// <summary>FontAwesome class, e.g. "fa-crown".</summary>
        public string Icon { get; set; } = "fa-medal";
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
