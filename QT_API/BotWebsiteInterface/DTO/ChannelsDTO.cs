using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Channels")]
    public record ChannelsDTO
    {
        [Key]
        public long ChannelId { get; set; }
        public string ChannelName { get; set; }
        public bool? IsEventChannel { get; set; }



        public long? RoleId { get; set; }
        public RolesDTO? Role {  get; set; }

        public long? GameId { get; set; }
        public GamesDTO? Game { get; set; }


        public int? SheetTabId { get; set; }
    }
}
