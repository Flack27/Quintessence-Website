
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class QuestionTypeDAL : IQuestionTypeDAL
    {
        private QuintessenceDbContext _context;

        public QuestionTypeDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<QuestionTypeDTO>> GetQuestionTypes()
        {
            return await _context.QuestionType.ToListAsync();
        }
    }
}
