namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>
    /// One member's read count for one guide. Persisted in App_Data/guide-views.json via
    /// JsonStore - one row per (Slug, DiscordId) pair, incremented on every read.
    /// </summary>
    public class GuideViewDTO
    {
        public string Slug { get; set; } = string.Empty;
        public string DiscordId { get; set; } = string.Empty;
        public int Count { get; set; }
        public DateTime LastViewedUtc { get; set; }
    }

    /// <summary>A guide's viewer resolved to a member card, for the "who's read this" list.</summary>
    public class CodexGuideViewerDTO
    {
        public CodexMemberDTO Member { get; set; } = new();
        public int Count { get; set; }
        public DateTime LastViewedUtc { get; set; }
    }
}
