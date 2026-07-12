using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IGamesDAL
    {
        List<GamesDTO> GetGames();
        GamesDTO? GetGame(long gameId);
        GamesDTO CreateGame(string gameName);
        bool UpdateGame(GamesDTO game);
        bool ReorderGames(List<long> orderedGameIds);
        bool DeleteGame(long gameId);
        bool SetImage(long gameId, string type, string url);

        // Past-game popup content (embedded on the game)
        GameAchievementDTO? AddAchievement(long gameId, GameAchievementDTO achievement);
        bool DeleteAchievement(long gameId, long achievementId);
        GameGalleryItemDTO? AddGalleryItem(long gameId, GameGalleryItemDTO item);
        bool DeleteGalleryItem(long gameId, long itemId);
    }

    public interface ITimelineDAL
    {
        List<GuildTimelineEntryDTO> GetEntries();
        GuildTimelineEntryDTO AddEntry(GuildTimelineEntryDTO entry);
        bool DeleteEntry(long entryId);
    }

    public interface IRosterDAL
    {
        List<RosterMemberDTO> GetMembers();
        RosterMemberDTO AddMember(RosterMemberDTO member);
        bool UpdateMember(RosterMemberDTO member);
        bool DeleteMember(long memberId);
        bool ReorderMembers(List<long> orderedMemberIds);
    }
}
