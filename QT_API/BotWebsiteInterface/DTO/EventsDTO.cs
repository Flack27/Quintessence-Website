using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Events")]
    public record EventsDTO
    {
        [Key]
        public long EventId { get; set; }

        public long ChannelId { get; set; }
        public ChannelsDTO Channel { get; set; }

        public string Title { get; set; }
        public DateTime Date { get; set; }

        public virtual ICollection<EventSignupsDTO>? Signups { get; set; }
    }
}
