using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class EventSignups
    {
        private readonly long signupId;
        private readonly long eventId;
        private readonly string displayName;
        private readonly string avatar;

        public EventSignups(long signupId, long eventId, string displayName, string avatar)
        { 
            this.signupId = signupId;
            this.eventId = eventId;
            this.displayName = displayName;
            this.avatar = avatar;   
        }

        public EventSignups(EventSignupsDTO dto)
        {
            this.signupId = dto.SignupId;
            this.eventId = dto.EventId;
            this.displayName = dto.User.DisplayName!;
            this.avatar = dto.User.Avatar!;
        }

        [JsonConverter(typeof(JsonConverter))]
        public long SignupId { get { return signupId; } }

        [JsonConverter(typeof(JsonConverter))]
        public long EventId { get { return eventId; } }
        public string DisplayName { get { return displayName; } }
        public string Avatar { get { return avatar; } }
    }
}
