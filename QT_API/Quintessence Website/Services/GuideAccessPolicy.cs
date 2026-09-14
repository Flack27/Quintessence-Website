namespace Quintessence_Website.Services
{
    /// <summary>
    /// Resolves which Discord roles may read a game's guides, from the "GuideAccess:GameRoleIds"
    /// section of the committed guideaccess.json.
    ///
    /// A game maps to one role id or a list of them - holding any one is enough:
    ///
    ///     "Aion 2": "123"                 one role
    ///     "Aion 2": [ "123", "456" ]      either role
    ///
    /// Both shapes are accepted on purpose. The file is hand-edited, and the config binder
    /// would read a string where it expected a list (or the reverse) as *no roles at all* -
    /// which fails closed and quietly hides every guide for that game. Accepting either
    /// removes that trap rather than documenting it.
    ///
    /// Read straight from <see cref="IConfiguration"/> on each call rather than bound once, so
    /// a config reload is picked up where the file watcher fires. Do not rely on that: it did
    /// not fire on a OneDrive-synced dev checkout, so a restart or redeploy is the dependable
    /// way to apply an edit.
    /// </summary>
    public sealed class GuideAccessPolicy
    {
        private const string SectionPath = "GuideAccess:GameRoleIds";

        private readonly IConfiguration _configuration;

        public GuideAccessPolicy(IConfiguration configuration) => _configuration = configuration;

        /// <summary>
        /// Role ids that may read <paramref name="game"/>'s guides. Empty when the game has no
        /// entry - in which case the caller must fail closed, not open.
        ///
        /// Matching ignores case so a guide whose frontmatter says "aion 2" still lines up with
        /// an "Aion 2" key; the publish form's dropdown is the normal source of this value, but a
        /// hand-written guide file is not.
        /// </summary>
        public IReadOnlyList<string> RoleIdsFor(string? game)
        {
            if (string.IsNullOrWhiteSpace(game)) return Array.Empty<string>();

            var entry = _configuration.GetSection(SectionPath)
                .GetChildren()
                .FirstOrDefault(child => string.Equals(child.Key, game, StringComparison.OrdinalIgnoreCase));

            if (entry is null) return Array.Empty<string>();

            // A scalar has a Value and no children; a list has children and no Value.
            var raw = entry.Value is not null
                ? new[] { entry.Value }
                : entry.GetChildren().Select(child => child.Value);

            return raw
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id!.Trim())
                .Distinct()
                .ToList();
        }
    }
}
