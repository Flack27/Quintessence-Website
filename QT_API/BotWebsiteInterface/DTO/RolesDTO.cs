using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.DTO
{
    [Table("Roles")]
    public record RolesDTO
    {
        [Key]
        public long RoleId { get; set; }
        public string RoleName { get; set; }
        public virtual ICollection<UsersDTO> Users { get; set; }
    }
}
