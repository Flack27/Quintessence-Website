using MiNET.Utils.Skins;
using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Form
    {
        public long? FormId { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
        public List<Questions>? Questions { get; set; }

        public Form() { }

        public Form(long formId, string title, string description, bool isActive, List<Questions> questions)
        {
            FormId = formId;
            Title = title;
            Description = description;
            IsActive = isActive;
            Questions = questions;
        }

        public Form(FormDTO dto)
        {
            FormId = dto.FormId;
            Title = dto.Title;
            Description = dto.Description;
            IsActive = dto.IsActive;
            Questions = dto.Questions?.Select(q => new Questions(q)).ToList() ?? new List<Questions>();
        }
    }
}
