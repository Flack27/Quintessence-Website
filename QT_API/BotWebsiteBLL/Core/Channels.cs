using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Channels
    {
        private readonly long channelId;
        private readonly string channelName;

        public Channels(long channelId, string channelName)
        {
            this.channelId = channelId;
            this.channelName = channelName;
        }

        public Channels(ChannelsDTO dto)
        {
            this.channelId = dto.ChannelId;
            this.channelName = dto.ChannelName;
        }

        [JsonConverter(typeof(JsonConverter))]
        public long ChannelId { get { return this.channelId; } }
        public string ChannelName { get { return this.channelName; } }
    }
}
