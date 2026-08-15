using System.Globalization;
using System.Text;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteDAL.Store
{
    /// <summary>
    /// File-backed store for Codex guides.
    ///
    /// Guides are markdown-with-frontmatter on disk, one folder per guide:
    ///     App_Data/guides/&lt;slug&gt;/index.md
    ///     uploads/guides/&lt;slug&gt;/&lt;image&gt;
    ///
    /// That is deliberately the same layout the Codex repo uses for `contents/`, so a
    /// guide written by hand in the repo and one written through the publish form are
    /// the same artifact - and seeding is a straight folder copy.
    ///
    /// Why files rather than the JSON store the rest of the site uses: guide bodies are
    /// long markdown with their own images, and keeping them as files means an author can
    /// still drop one in by hand, and a backup of the volume is readable without this app.
    /// </summary>
    public class GuideStore
    {
        private readonly string _guidesDir;
        private readonly string _imagesDir;
        private readonly string? _seedDir;
        private readonly object _lock = new();

        public GuideStore(string guidesDir, string imagesDir, string? seedDir = null)
        {
            _guidesDir = guidesDir;
            _imagesDir = imagesDir;
            _seedDir = seedDir;
        }

        /// <summary>Copies the shipped guides in on first run, when the store is empty.</summary>
        public void SeedIfEmpty()
        {
            lock (_lock)
            {
                Directory.CreateDirectory(_guidesDir);
                Directory.CreateDirectory(_imagesDir);

                if (Directory.EnumerateDirectories(_guidesDir).Any()) return;
                if (string.IsNullOrWhiteSpace(_seedDir) || !Directory.Exists(_seedDir)) return;

                foreach (var src in Directory.EnumerateDirectories(_seedDir))
                {
                    var slug = Path.GetFileName(src);
                    if (!File.Exists(Path.Combine(src, "index.md"))) continue;

                    Directory.CreateDirectory(Path.Combine(_guidesDir, slug));
                    File.Copy(Path.Combine(src, "index.md"),
                              Path.Combine(_guidesDir, slug, "index.md"), overwrite: true);

                    // Images live beside index.md in the repo; they move to uploads/ here.
                    var imageTarget = Path.Combine(_imagesDir, slug);
                    foreach (var file in Directory.EnumerateFiles(src))
                    {
                        if (Path.GetFileName(file).Equals("index.md", StringComparison.OrdinalIgnoreCase)) continue;
                        Directory.CreateDirectory(imageTarget);
                        File.Copy(file, Path.Combine(imageTarget, Path.GetFileName(file)), overwrite: true);
                    }
                }
            }
        }

        public List<CodexGuideDTO> ReadAll(bool includeBody = false)
        {
            lock (_lock)
            {
                if (!Directory.Exists(_guidesDir)) return new List<CodexGuideDTO>();

                return Directory.EnumerateDirectories(_guidesDir)
                    .Select(dir => ReadUnlocked(Path.GetFileName(dir), includeBody))
                    .Where(g => g is not null)
                    .Select(g => g!)
                    .OrderByDescending(g => g.Date ?? g.UpdatedUtc.ToString("o"))
                    .ToList();
            }
        }

        public CodexGuideDTO? Read(string slug)
        {
            lock (_lock) return ReadUnlocked(slug, includeBody: true);
        }

        public bool Exists(string slug)
        {
            lock (_lock) return File.Exists(PathFor(slug));
        }

        /// <summary>Writes (creating or replacing) a guide's markdown file.</summary>
        public void Write(CodexGuideDTO guide)
        {
            lock (_lock)
            {
                var dir = Path.Combine(_guidesDir, guide.Slug);
                Directory.CreateDirectory(dir);
                File.WriteAllText(Path.Combine(dir, "index.md"), Serialize(guide), new UTF8Encoding(false));
            }
        }

        public bool Delete(string slug)
        {
            lock (_lock)
            {
                var dir = Path.Combine(_guidesDir, slug);
                if (!Directory.Exists(dir)) return false;

                Directory.Delete(dir, recursive: true);

                var images = Path.Combine(_imagesDir, slug);
                if (Directory.Exists(images)) Directory.Delete(images, recursive: true);
                return true;
            }
        }

        public string SaveImage(string slug, string fileName, byte[] bytes)
        {
            lock (_lock)
            {
                var dir = Path.Combine(_imagesDir, slug);
                Directory.CreateDirectory(dir);
                File.WriteAllBytes(Path.Combine(dir, fileName), bytes);
                return fileName;
            }
        }

        public bool DeleteImage(string slug, string fileName)
        {
            lock (_lock)
            {
                var path = Path.Combine(_imagesDir, slug, fileName);
                if (!File.Exists(path)) return false;
                File.Delete(path);
                return true;
            }
        }

        public string ImagePath(string slug, string fileName) =>
            Path.Combine(_imagesDir, slug, fileName);

        // ---------------------------------------------------------------------
        // Draft image staging.
        //
        // A new guide's slug is derived from its title client-side and can change while
        // the author is still typing, so images picked before the first save can't be
        // written straight into `<slug>/` - there is no stable slug yet. The publish form
        // instead stages them under a random id it generates once per form session; once
        // Create() has settled on a real slug, AdoptDraftImages moves them over.
        //
        // Editing an existing guide never uses this path - its slug is already fixed, so
        // new images there upload straight into its own folder.
        // ---------------------------------------------------------------------

        private string DraftsRoot => Path.Combine(_imagesDir, "_drafts");

        public string SaveDraftImage(string draftId, string fileName, byte[] bytes)
        {
            lock (_lock)
            {
                CleanupStaleDraftsUnlocked();
                var dir = Path.Combine(DraftsRoot, draftId);
                Directory.CreateDirectory(dir);
                File.WriteAllBytes(Path.Combine(dir, fileName), bytes);
                return fileName;
            }
        }

        public bool DeleteDraftImage(string draftId, string fileName)
        {
            lock (_lock)
            {
                var path = Path.Combine(DraftsRoot, draftId, fileName);
                if (!File.Exists(path)) return false;
                File.Delete(path);
                return true;
            }
        }

        public List<string> ListDraftImages(string draftId)
        {
            lock (_lock)
            {
                var dir = Path.Combine(DraftsRoot, draftId);
                if (!Directory.Exists(dir)) return new List<string>();

                return Directory.EnumerateFiles(dir)
                    .Select(Path.GetFileName)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .Select(name => name!)
                    .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
        }

        /// <summary>Moves everything staged under a draft into the guide's real image folder. No-op if the draft is missing - editing an existing guide never creates one.</summary>
        public void AdoptDraftImages(string draftId, string slug)
        {
            lock (_lock)
            {
                var draftDir = Path.Combine(DraftsRoot, draftId);
                if (!Directory.Exists(draftDir)) return;

                var targetDir = Path.Combine(_imagesDir, slug);
                Directory.CreateDirectory(targetDir);
                foreach (var file in Directory.EnumerateFiles(draftDir))
                {
                    File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), overwrite: true);
                }
                Directory.Delete(draftDir, recursive: true);
            }
        }

        /// <summary>Sweeps drafts abandoned by a closed tab, so staged uploads don't accumulate forever without a background job.</summary>
        private void CleanupStaleDraftsUnlocked()
        {
            if (!Directory.Exists(DraftsRoot)) return;

            var cutoff = DateTime.UtcNow.AddDays(-2);
            foreach (var dir in Directory.EnumerateDirectories(DraftsRoot))
            {
                if (Directory.GetLastWriteTimeUtc(dir) >= cutoff) continue;
                try { Directory.Delete(dir, recursive: true); } catch { /* best effort */ }
            }
        }

        /// <summary>Filenames already uploaded for a guide, so an editor can re-list them.</summary>
        public List<string> ListImages(string slug)
        {
            lock (_lock)
            {
                var dir = Path.Combine(_imagesDir, slug);
                if (!Directory.Exists(dir)) return new List<string>();

                return Directory.EnumerateFiles(dir)
                    .Select(Path.GetFileName)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .Select(name => name!)
                    .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
        }

        private string PathFor(string slug) => Path.Combine(_guidesDir, slug, "index.md");

        private CodexGuideDTO? ReadUnlocked(string slug, bool includeBody)
        {
            var path = PathFor(slug);
            if (!File.Exists(path)) return null;

            var raw = File.ReadAllText(path);
            var guide = Deserialize(slug, raw, includeBody);
            guide.UpdatedUtc = File.GetLastWriteTimeUtc(path);
            return guide;
        }

        // ---------------------------------------------------------------------
        // Frontmatter. A deliberately small YAML subset matching the parser the
        // Codex already uses (codex/src/lib/frontmatter.ts): `key: value` pairs,
        // inline [a, b] lists, quoted strings. Anything richer is not written by
        // either side, and pulling in a YAML dependency to read six scalars would
        // be the wrong trade.
        // ---------------------------------------------------------------------

        internal static CodexGuideDTO Deserialize(string slug, string raw, bool includeBody)
        {
            var text = raw.Replace("\r\n", "\n").TrimStart('﻿');
            var guide = new CodexGuideDTO { Slug = slug, Title = slug };

            var body = text;
            if (text.StartsWith("---\n"))
            {
                var end = text.IndexOf("\n---", 4, StringComparison.Ordinal);
                if (end > 0)
                {
                    var block = text.Substring(4, end - 4);
                    body = text.Substring(end + 4).TrimStart('\n');

                    foreach (var line in block.Split('\n'))
                    {
                        var idx = line.IndexOf(':');
                        if (idx <= 0 || line.TrimStart().StartsWith("#")) continue;

                        var key = line.Substring(0, idx).Trim();
                        var value = line.Substring(idx + 1).Trim();

                        switch (key.ToLowerInvariant())
                        {
                            case "title": guide.Title = Unquote(value); break;
                            case "subtitle": guide.Subtitle = Unquote(value); break;
                            case "description": guide.Description = Unquote(value); break;
                            case "game": guide.Game = Unquote(value); break;
                            case "section": guide.Section = Unquote(value); break;
                            case "author": guide.Author = Unquote(value); break;
                            case "authorid": guide.AuthorId = Unquote(value); break;
                            case "editors": guide.Editors = ParseList(value); break;
                            case "cover": guide.Cover = Unquote(value); break;
                            case "date": guide.Date = Unquote(value); break;
                            case "draft": guide.Draft = Unquote(value).Equals("true", StringComparison.OrdinalIgnoreCase); break;
                            case "tags": guide.Tags = ParseList(value); break;
                        }
                    }
                }
            }

            if (includeBody) guide.Content = body;
            else guide.SearchText = StripMarkdown(body);
            return guide;
        }

        internal static string Serialize(CodexGuideDTO g)
        {
            var sb = new StringBuilder();
            sb.Append("---\n");
            sb.Append($"title: {Quote(g.Title)}\n");
            if (!string.IsNullOrWhiteSpace(g.Subtitle)) sb.Append($"subtitle: {Quote(g.Subtitle!)}\n");
            sb.Append($"description: {Quote(g.Description)}\n");
            sb.Append($"game: {Quote(g.Game)}\n");
            sb.Append($"section: {Quote(g.Section)}\n");
            if (g.Tags.Count > 0) sb.Append($"tags: [{string.Join(", ", g.Tags)}]\n");
            if (!string.IsNullOrWhiteSpace(g.Date)) sb.Append($"date: {Quote(g.Date!)}\n");
            if (!string.IsNullOrWhiteSpace(g.Author)) sb.Append($"author: {Quote(g.Author!)}\n");
            if (!string.IsNullOrWhiteSpace(g.AuthorId)) sb.Append($"authorId: {Quote(g.AuthorId!)}\n");
            // Snowflake ids only, so the inline-list form is safe here - no quoting needed and
            // nothing in a value that ParseList's comma split could trip over.
            if (g.Editors.Count > 0) sb.Append($"editors: [{string.Join(", ", g.Editors)}]\n");
            if (!string.IsNullOrWhiteSpace(g.Cover)) sb.Append($"cover: {Quote(g.Cover!)}\n");
            if (g.Draft) sb.Append("draft: true\n");
            sb.Append("---\n\n");
            sb.Append((g.Content ?? string.Empty).Replace("\r\n", "\n").TrimStart('\n'));
            if (!sb.ToString().EndsWith("\n")) sb.Append('\n');
            return sb.ToString();
        }

        /// <summary>
        /// Mirrors stripMarkdown() in codex/src/lib/content.ts - fences, inline code,
        /// images, link syntax and marker punctuation out, so search matches prose.
        /// </summary>
        internal static string StripMarkdown(string markdown)
        {
            var text = System.Text.RegularExpressions.Regex.Replace(markdown, @"```[\s\S]*?```", " ");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"`[^`]*`", " ");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"!\[[^\]]*\]\([^)]*\)", " ");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"\[([^\]]*)\]\([^)]*\)", "$1");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"[#>*_~|-]", " ");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ");
            return text.Trim().ToLowerInvariant();
        }

        private static string Quote(string v) => "\"" + v.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";

        private static string Unquote(string v)
        {
            if (v.Length >= 2 && ((v[0] == '"' && v[^1] == '"') || (v[0] == '\'' && v[^1] == '\'')))
                v = v.Substring(1, v.Length - 2);
            return v.Replace("\\\"", "\"").Replace("\\\\", "\\");
        }

        private static List<string> ParseList(string v)
        {
            if (!v.StartsWith("[") || !v.EndsWith("]")) return new List<string>();
            var inner = v.Substring(1, v.Length - 2).Trim();
            if (inner.Length == 0) return new List<string>();
            return inner.Split(',')
                        .Select(p => Unquote(p.Trim()))
                        .Where(p => p.Length > 0)
                        .ToList();
        }

        /// <summary>Folder-safe, URL-safe slug. Falls back to a timestamp if nothing survives.</summary>
        public static string Slugify(string input)
        {
            var lower = (input ?? string.Empty).ToLowerInvariant().Trim();
            var sb = new StringBuilder();
            foreach (var ch in lower)
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                else if (ch is ' ' or '-' or '_') sb.Append('-');
            }

            var slug = sb.ToString();
            while (slug.Contains("--")) slug = slug.Replace("--", "-");
            slug = slug.Trim('-');

            return slug.Length == 0
                ? "guide-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture)
                : slug;
        }
    }
}
