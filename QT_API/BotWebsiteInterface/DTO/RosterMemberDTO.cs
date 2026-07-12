namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>
    /// A main-roster member. The main roster is a static, admin-managed list
    /// (stored as JSON); only the per-game attendance rosters come from Qutie.
    /// </summary>
    public record RosterMemberDTO
    {
        public long MemberId { get; set; }
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>Rank label, e.g. "Guild Master", "Officer", "Member".</summary>
        public string Rank { get; set; } = "Member";

        /// <summary>Tier for coloring/sorting: owner | admin | officer | member.</summary>
        public string RankTier { get; set; } = "member";

        /// <summary>Optional avatar URL (Discord CDN or uploaded); initials shown when null.</summary>
        public string? AvatarUrl { get; set; }

        /// <summary>Ids of local games this member has played (drives the icon tokens).</summary>
        public List<long> GameIds { get; set; } = new();

        public int DisplayOrder { get; set; }
    }
}
