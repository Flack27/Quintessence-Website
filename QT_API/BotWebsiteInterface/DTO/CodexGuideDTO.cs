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

        /// <summary>Discord id of whoever published it. The guide's owner - see <see cref="Editors"/>.</summary>
        public string? AuthorId { get; set; }

        /// <summary>
        /// Discord ids the owner has invited to edit this guide, beyond the owner themselves.
        ///
        /// Ids only, no names: the display name is resolved from Discord when the access dialog
        /// opens, so a rename never leaves a stale name on disk - and the frontmatter list stays
        /// free of the commas and quotes a username can contain, which the small YAML subset in
        /// GuideStore would not survive.
        ///
        /// Holders of a manager role are deliberately *never* written here. Their access comes
        /// from the role, read live on every request; materialising it into a file would mean
        /// taking the role away no longer takes the access away.
        /// </summary>
        public List<string> Editors { get; set; } = new();

        /// <summary>Image filename relative to the guide, or a root-absolute asset path.</summary>
        public string? Cover { get; set; }

        public bool Draft { get; set; }

        /// <summary>Markdown body, frontmatter stripped. Null in index responses.</summary>
        public string? Content { get; set; }

        /// <summary>
        /// Plain-text rendering of the body, for the Codex's full-text search. Sent on the
        /// index (where Content is omitted for weight) so searching still matches inside
        /// guides rather than only their titles.
        /// </summary>
        public string? SearchText { get; set; }

        /// <summary>
        /// Filenames already uploaded for this guide, so the editor can re-list them when
        /// reopening. Populated only on the single-guide read, not the index.
        /// </summary>
        public List<string> Images { get; set; } = new();

        /// <summary>Last write time, for sorting when no date is set.</summary>
        public DateTime UpdatedUtc { get; set; }
    }

    /// <summary>A guild member as the access dialog lists them.</summary>
    public class CodexMemberDTO
    {
        public string Id { get; set; } = string.Empty;

        /// <summary>Guild nickname if they have one, otherwise their Discord display name.</summary>
        public string Username { get; set; } = string.Empty;

        public string? Avatar { get; set; }

        /// <summary>Holds an author role, so is eligible to be invited to a guide.</summary>
        public bool CanWrite { get; set; }

        /// <summary>
        /// Holds a manager role. Already has access to every guide, so they are shown as such
        /// rather than being addable - there is no per-guide grant that could add anything.
        /// </summary>
        public bool CanManage { get; set; }
    }

    /// <summary>Who may edit one guide, for the access dialog.</summary>
    public class CodexGuideAccessDTO
    {
        /// <summary>
        /// The creator. Cannot be removed - there is no "no owner" state, and transferring a
        /// guide is not something the dialog offers.
        /// </summary>
        public CodexMemberDTO? Owner { get; set; }

        /// <summary>Everyone the owner has invited, resolved to names at read time.</summary>
        public List<CodexMemberDTO> Editors { get; set; } = new();

        /// <summary>Whether the caller may add and remove editors here (owner or manager).</summary>
        public bool CanManageAccess { get; set; }
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
