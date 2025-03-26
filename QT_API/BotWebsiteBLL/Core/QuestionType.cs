using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class QuestionType
    {
        private int typeId;
        private string type;

        [JsonConstructor]
        public QuestionType(int typeId, string type)
        {
            this.typeId = typeId;
            this.type = type;
        }

        public QuestionType(QuestionTypeDTO dto)
        {
            this.typeId = dto.TypeId;
            this.type = dto.Type;
        }

        public int TypeId { get { return this.typeId; } }
        public string Type { get { return this.type; } }
    }
}
