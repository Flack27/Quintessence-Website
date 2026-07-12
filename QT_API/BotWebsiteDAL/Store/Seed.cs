using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteDAL.Store
{
    /// <summary>
    /// Initial contents written the first time each JSON store is created.
    /// Six upcoming games (card + title only) and Throne and Liberty as the one prior
    /// chapter, plus its two timeline entries. Everything is editable in the admin UI.
    /// </summary>
    public static class Seed
    {
        public static List<GamesDTO> Games()
        {
            // Upcoming cards: title + card image only, no description. Reorderable in the admin view.
            var upcoming = new (string Name, string Card)[]
            {
                ("Aion 2", "Aion2_Gamecard.jpg"),
                ("Archeage Chronicles", "Archeage_Chronicles_Gamecard.jpg"),
                ("Bellatores", "Bellatores_Gamecard.jpg"),
                ("Chrono Odyssey", "Chrono_Odyssey_Gamecard.jpg"),
                ("Lord of the Mysteries", "LOTM_Gamecard.jpg"),
                ("Scars of Honor", "Scars_of_Honor_Gamecard.jpg")
            };

            var games = new List<GamesDTO>();
            long id = 1;
            int order = 0;
            foreach (var (name, card) in upcoming)
            {
                games.Add(new GamesDTO
                {
                    GameId = id++,
                    GameName = name,
                    Status = "Upcoming",
                    DisplayOrder = order++,
                    ImageUrl = $"/assets/gamecards/{card}"
                });
            }

            // The one prior chapter, with its full popup content.
            games.Add(new GamesDTO
            {
                GameId = id,
                GameName = "Throne and Liberty",
                Status = "Previous",
                DisplayOrder = order,
                ImageUrl = "/assets/gamecards/Throne_and_Liberty_Gamecard.jpg",
                BannerUrl = "/assets/games/TL/Throne_and_Liberty_Banner.png",
                Description = "Siege the Day champions, rank 1 guild leaderboard, top-15 kill rankings.",
                Period = "2024–2025",
                Players = "100+",
                FullStory =
                    "Through our knowledge, optimized builds, and collective experience, we stayed ahead of the curve during the game's early stages. " +
                    "We are proud to have achieved multiple siege victories, dominated the top-15 kill rankings, and secured rank 1 in both activity and the guild leaderboard for an extended period.\n\n" +
                    "Furthermore, Quintessence had the privilege of attending & ultimately winning the Amazon Games' \"Siege the Day\" live Twitch event in front of thousands of people. " +
                    "During our time within Throne & Liberty, we gained invaluable leadership and management experience which we are carrying into our next priority MMO.",
                Achievements = new()
                {
                    new GameAchievementDTO { AchievementId = 1, Icon = "fa-crown", Title = "Siege the Day", Description = "Winners of the AGS \"Siege the Day\" event" },
                    new GameAchievementDTO { AchievementId = 2, Icon = "fa-skull", Title = "Top kill ranking", Description = "Dominated the top-15 kill rankings" },
                    new GameAchievementDTO { AchievementId = 3, Icon = "fa-medal", Title = "Rank 1 guild", Description = "Rank 1 guild leaderboard for an extended period" }
                },
                Gallery = new()
                {
                    new GameGalleryItemDTO { ItemId = 1, ItemType = "image", ImageUrl = "/assets/games/TL/Throne_and_Liberty_Kills.png", Caption = "Kill ranking" },
                    new GameGalleryItemDTO { ItemId = 2, ItemType = "image", ImageUrl = "/assets/games/TL/Throne_and_Liberty_GuildRank.png", Caption = "Guild ranking" },
                    new GameGalleryItemDTO { ItemId = 3, ItemType = "image", ImageUrl = "/assets/games/TL/Throne_and_Liberty_Siege.png", Caption = "Siege ranking" },
                    new GameGalleryItemDTO { ItemId = 4, ItemType = "image", ImageUrl = "/assets/games/TL/Throne_and_Liberty_Attendance.png", Caption = "Attendance sheet" },
                    new GameGalleryItemDTO { ItemId = 5, ItemType = "image", ImageUrl = "/assets/games/TL/Throne_and_Liberty_Roster.png", Caption = "Roster sheet" },
                    new GameGalleryItemDTO { ItemId = 6, ItemType = "video", YoutubeId = "z03gNmZfAnI", ImageUrl = "/assets/games/TL/Throne_and_Liberty_Thumbnail.jpg", Caption = "Siege the Day" }
                }
            });

            return games;
        }

        public static List<GuildTimelineEntryDTO> Timeline() => new()
        {
            new GuildTimelineEntryDTO { EntryId = 1, DisplayOrder = 0, Period = "April 2024", Title = "Throne and Liberty Beta",
                Description = "Quintessence participated in the closed beta, establishing strategies and preparing for the full release." },
            new GuildTimelineEntryDTO { EntryId = 2, DisplayOrder = 1, Period = "October 2024", Title = "Throne and Liberty Launch",
                Description = "We secured our first castle during the Siege the Day event, claiming another in the first release castle siege." }
        };

        // The main roster starts empty - add the real members in the admin view so no
        // placeholder people go live.
        public static List<RosterMemberDTO> Roster() => new();
    }
}
