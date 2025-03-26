using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{

    public class EventChannels
    {
        [JsonConverter(typeof(JsonConverter))]
        public long ChannelId { get; set; } 
        public string? ChannelName { get; set; }

        [JsonConverter(typeof(JsonConverter))]
        public long? RoleId { get; set; }
        public string? RoleName { get; set; }

        public long? GameId { get; set; }
        public string? GameName { get; set; }

        public int? SheetId { get; set; }

        public EventChannels() { }

        public EventChannels(long channelId, string? channelName, long? roleId, string? roleName, long? gameId, string? gameName, int? sheetId)
        {
            ChannelId = channelId;
            ChannelName = channelName;
            RoleId = roleId;
            RoleName = roleName;
            GameId = gameId;
            GameName = gameName;
            SheetId = sheetId;
        }
    }
}
