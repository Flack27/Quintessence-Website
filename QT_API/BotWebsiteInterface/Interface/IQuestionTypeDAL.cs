using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IQuestionTypeDAL
    {
        Task<List<QuestionTypeDTO>> GetQuestionTypes();
    }
}
