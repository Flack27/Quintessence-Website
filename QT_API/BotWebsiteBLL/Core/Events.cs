using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Events
    {
        private readonly long eventId;
        private readonly string eventTitle;
        private readonly string formattedDate;

        public Events(long eventId, string eventTitle, string formattedDate)
        { 
            this.eventId = eventId;
            this.eventTitle = eventTitle;
            this.formattedDate = formattedDate;
        }

        [JsonConverter(typeof(JsonConverter))]
        public long EventId { get { return this.eventId; } }
        public string EventTitle { get { return this.eventTitle; } }
        public string FormattedDate { get { return this.formattedDate; } }
    }
}
