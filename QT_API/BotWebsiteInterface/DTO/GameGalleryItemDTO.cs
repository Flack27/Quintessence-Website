namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>Gallery entry (image or YouTube video) on the past-game popup (embedded on a game).</summary>
    public record GameGalleryItemDTO
    {
        public long ItemId { get; set; }

        /// <summary>'image' | 'video'</summary>
        public string ItemType { get; set; } = "image";

        /// <summary>The image itself, or an optional thumbnail for videos.</summary>
        public string? ImageUrl { get; set; }

        /// <summary>YouTube video id (for ItemType 'video').</summary>
        public string? YoutubeId { get; set; }

        public string? Caption { get; set; }
    }
}
