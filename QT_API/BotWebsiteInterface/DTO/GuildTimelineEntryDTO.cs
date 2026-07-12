namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>Guild-wide "Our journey" timeline entry (below Previous Games).</summary>
    public record GuildTimelineEntryDTO
    {
        public long EntryId { get; set; }

        /// <summary>Era label, e.g. "2024 – 2025".</summary>
        public string Period { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
    }
}
