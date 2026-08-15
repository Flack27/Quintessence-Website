using Microsoft.Extensions.Options;

namespace Quintessence_Website.Services
{
    /// <summary>
    /// Per-game read access for the Codex, bound from the "GuideAccess" section of the
    /// committed guideaccess.json.
    /// </summary>
    public sealed class GuideAccessOptions
    {
        /// <summary>
        /// Game name (as written in a guide's frontmatter) to the Discord role id a member
        /// must hold to read that game's guides.
        /// </summary>
        public Dictionary<string, string> GameRoleIds { get; set; } = new();
    }

    /// <summary>
    /// Resolves the role a game's guides require.
    ///
    /// Read through <see cref="IOptionsMonitor{T}"/> rather than a snapshot so that a config
    /// reload is picked up if the file watcher fires. Do not rely on that: it did not fire on
    /// a OneDrive-synced dev checkout, so a restart or redeploy is the dependable way to apply
    /// an edit to guideaccess.json.
    /// </summary>
    public sealed class GuideAccessPolicy
    {
        private readonly IOptionsMonitor<GuideAccessOptions> _options;

        public GuideAccessPolicy(IOptionsMonitor<GuideAccessOptions> options) => _options = options;

        /// <summary>
        /// The role id required to read <paramref name="game"/>'s guides, or null if the game
        /// has no entry - in which case the caller must fail closed, not open.
        ///
        /// Matching ignores case so a guide whose frontmatter says "aion 2" still lines up with
        /// an "Aion 2" key; the publish form's dropdown is the only normal source of this value,
        /// but a hand-written guide file is not.
        /// </summary>
        public string? RoleIdFor(string? game)
        {
            if (string.IsNullOrWhiteSpace(game)) return null;

            foreach (var (name, roleId) in _options.CurrentValue.GameRoleIds)
            {
                if (string.Equals(name, game, StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(roleId))
                {
                    return roleId;
                }
            }

            return null;
        }
    }
}
