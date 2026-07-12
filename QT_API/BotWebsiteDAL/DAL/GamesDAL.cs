using QuintessenceWebsiteDAL.Store;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteDAL.DAL
{
    /// <summary>Games (with embedded achievements + gallery), backed by a JSON file.</summary>
    public class GamesDAL : IGamesDAL
    {
        private readonly JsonStore<GamesDTO> _store;

        public GamesDAL(JsonStore<GamesDTO> store)
        {
            _store = store;
        }

        public List<GamesDTO> GetGames() =>
            _store.Read().OrderBy(g => g.DisplayOrder).ThenBy(g => g.GameName).ToList();

        public GamesDTO? GetGame(long gameId) =>
            _store.Read().FirstOrDefault(g => g.GameId == gameId);

        public GamesDTO CreateGame(string gameName) =>
            _store.Update(list =>
            {
                var game = new GamesDTO
                {
                    GameId = NextId(list, g => g.GameId),
                    GameName = gameName,
                    Status = "Upcoming",
                    DisplayOrder = list.Count == 0 ? 0 : list.Max(g => g.DisplayOrder) + 1
                };
                list.Add(game);
                return game;
            });

        public bool UpdateGame(GamesDTO game) =>
            _store.Update(list =>
            {
                var i = list.FindIndex(g => g.GameId == game.GameId);
                if (i < 0) return false;

                // Preserve server-managed fields; only the editable display fields come from the caller.
                var existing = list[i];
                list[i] = existing with
                {
                    GameName = game.GameName,
                    Description = game.Description,
                    Status = game.Status,
                    SiteUrl = game.SiteUrl,
                    Period = game.Period,
                    Players = game.Players,
                    FullStory = game.FullStory,
                    QutieGameId = game.QutieGameId,
                    PullFromQutie = game.PullFromQutie
                };
                return true;
            });

        public bool SetImage(long gameId, string type, string url) =>
            _store.Update(list =>
            {
                var i = list.FindIndex(g => g.GameId == gameId);
                if (i < 0) return false;
                list[i] = type == "card" ? list[i] with { ImageUrl = url } : list[i] with { BannerUrl = url };
                return true;
            });

        public bool ReorderGames(List<long> orderedGameIds) =>
            _store.Update(list =>
            {
                for (int pos = 0; pos < orderedGameIds.Count; pos++)
                {
                    var i = list.FindIndex(g => g.GameId == orderedGameIds[pos]);
                    if (i >= 0) list[i] = list[i] with { DisplayOrder = pos };
                }
                return true;
            });

        public bool DeleteGame(long gameId) =>
            _store.Update(list => list.RemoveAll(g => g.GameId == gameId) > 0);

        // ---- Achievements (embedded) ----

        public GameAchievementDTO? AddAchievement(long gameId, GameAchievementDTO achievement) =>
            _store.Update<GameAchievementDTO?>(list =>
            {
                var i = list.FindIndex(g => g.GameId == gameId);
                if (i < 0) return null;
                achievement.AchievementId = NextId(list[i].Achievements, a => a.AchievementId);
                list[i].Achievements.Add(achievement);
                return achievement;
            });

        public bool DeleteAchievement(long gameId, long achievementId) =>
            _store.Update(list =>
            {
                var i = list.FindIndex(g => g.GameId == gameId);
                return i >= 0 && list[i].Achievements.RemoveAll(a => a.AchievementId == achievementId) > 0;
            });

        // ---- Gallery (embedded) ----

        public GameGalleryItemDTO? AddGalleryItem(long gameId, GameGalleryItemDTO item) =>
            _store.Update<GameGalleryItemDTO?>(list =>
            {
                var i = list.FindIndex(g => g.GameId == gameId);
                if (i < 0) return null;
                item.ItemId = NextId(list[i].Gallery, x => x.ItemId);
                list[i].Gallery.Add(item);
                return item;
            });

        public bool DeleteGalleryItem(long gameId, long itemId) =>
            _store.Update(list =>
            {
                var i = list.FindIndex(g => g.GameId == gameId);
                return i >= 0 && list[i].Gallery.RemoveAll(x => x.ItemId == itemId) > 0;
            });

        private static long NextId<TItem>(List<TItem> items, Func<TItem, long> id) =>
            items.Count == 0 ? 1 : items.Max(id) + 1;
    }

    /// <summary>Guild-wide timeline, backed by a JSON file.</summary>
    public class TimelineDAL : ITimelineDAL
    {
        private readonly JsonStore<GuildTimelineEntryDTO> _store;

        public TimelineDAL(JsonStore<GuildTimelineEntryDTO> store)
        {
            _store = store;
        }

        public List<GuildTimelineEntryDTO> GetEntries() =>
            _store.Read().OrderBy(e => e.DisplayOrder).ThenBy(e => e.EntryId).ToList();

        public GuildTimelineEntryDTO AddEntry(GuildTimelineEntryDTO entry) =>
            _store.Update(list =>
            {
                entry.EntryId = list.Count == 0 ? 1 : list.Max(e => e.EntryId) + 1;
                entry.DisplayOrder = list.Count == 0 ? 0 : list.Max(e => e.DisplayOrder) + 1;
                list.Add(entry);
                return entry;
            });

        public bool DeleteEntry(long entryId) =>
            _store.Update(list => list.RemoveAll(e => e.EntryId == entryId) > 0);
    }
}
