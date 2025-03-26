using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Container
{
    public class QuestionTypeContainer
    {
        private readonly IQuestionTypeDAL dal;

        public QuestionTypeContainer(IQuestionTypeDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<QuestionType>?> GetQuestionTypes()
        {
            List<QuestionType> types = new List<QuestionType>();
            List<QuestionTypeDTO> questionDTO = await dal.GetQuestionTypes();

            if (questionDTO == null) { return null; }

            foreach (var dto in questionDTO)
            {
                QuestionType newType = new QuestionType(dto);
                types.Add(newType);
            }
            return types;
        }
    }
}
