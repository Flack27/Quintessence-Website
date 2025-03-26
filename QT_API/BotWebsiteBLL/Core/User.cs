using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace QuintessenceWebsiteBLL.CORE
{
    public class User
    {
        private readonly long userId;
        private readonly string? userName;
        private readonly List<Roles>? roles;
        private readonly string? displayName;
        private readonly string? avatar;
        private readonly bool? inGuild;
        private readonly string? steam;
        private readonly string? x;
        private readonly string? twitch;
        private readonly string? youtube;
        private readonly string? description;

        public User(long userId, string userName, List<Roles> roles, string displayName, string avatar, bool inGuid, string steam, string x, string twitch, string youtube, string description)
        {
            this.userId = userId;
            this.userName = userName;
            this.roles = roles; 
            this.displayName = displayName;
            this.avatar = avatar;
            this.inGuild = inGuid;
            this.steam = steam;
            this.x = x;
            this.twitch = twitch;
            this.youtube = youtube;
            this.description = description;
        }

        [JsonConstructor]
        public User(long userId, string steam = "", string x = "", string twitch = "", string youtube = "", string description = "") : this(userId, "", new List<Roles>(), "", "", true, steam, x, twitch, youtube, description) { }

        public User(UsersDTO dto)
        {
            this.userId = dto.UserId;
            this.userName = dto.UserName;
            this.roles = dto.Roles?.Select(role => new Roles(role)).ToList() ?? new List<Roles>();
            this.displayName = dto.DisplayName;
            this.avatar = dto.Avatar;
            this.inGuild = dto.InGuild;
            this.steam = dto.Steam;
            this.x = dto.X;
            this.twitch = dto.Twitch;
            this.youtube = dto.Youtube;
            this.description = dto.Description;
        }

        [JsonConverter(typeof(JsonConverter))]
        public long UserId { get { return userId; } }
        public string? UserName { get { return userName; } }
        public List<Roles>? Roles { get { return roles; } } 
        public string? DisplayName { get { return displayName; } }
        public string? Avatar { get { return avatar; } }
        public bool? InGuild { get { return inGuild; } }
        public string? Steam { get { return steam; } }
        public string? X { get { return x; } }
        public string? Twitch { get { return twitch; } }
        public string? Youtube { get { return youtube; } }
        public string? Description { get { return description; } }
    }
}

