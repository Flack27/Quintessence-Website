using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Games")]
    public record GamesDTO
    {
        [Key]
        public long GameId { get; set; }
        public string GameName { get; set; }

    }
}
