namespace QuintessenceWebsiteInterface.DTO
{
    /// <summary>
    /// A guide as the Codex frontend consumes it. Mirrors the frontmatter fields the
    /// markdown files already use (see codex/src/lib/frontmatter.ts) so a file written
    /// by hand and one written through the publish form are the same thing.
    /// </summary>
    public class CodexGuideDTO
    {
        /// <summary>Folder name under App_Data/guides - also the URL segment.</summary>
        public string Slug { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;
        public string? Subtitle { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Game { get; set; } = "General";
        public string Section { get; set; } = "Uncategorized";
        public List<string> Tags { get; set; } = new();

        /// <summary>ISO date. Absent on hand-written files; set when published here.</summary>
        public string? Date { get; set; }

        public string? Author { get; set; }

        /// <summary>Discord id of whoever published it. Decides who may edit it later.</summary>
        public string? AuthorId { get; set; }

        /// <summary>Image filename relative to the guide, or a root-absolute asset path.</summary>
        public string? Cover { get; set; }

        public bool Draft { get; set; }

        /// <summary>Markdown body, frontmatter stripped. Null in index responses.</summary>
        public string? Content { get; set; }

        /// <summary>Last write time, for sorting when no date is set.</summary>
        public DateTime UpdatedUtc { get; set; }
    }

    /// <summary>An image uploaded alongside a guide, sent as base64 by the publish form.</summary>
    public class CodexGuideImageDTO
    {
        public string FileName { get; set; } = string.Empty;
        public string Data { get; set; } = string.Empty;
    }

    /// <summary>Create/update payload from the publish form.</summary>
    public class CodexGuideWriteDTO
    {
        public string? Slug { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Subtitle { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Game { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public string? Cover { get; set; }
        public bool Draft { get; set; }
        public string Body { get; set; } = string.Empty;
        public List<CodexGuideImageDTO> Images { get; set; } = new();
    }
}
