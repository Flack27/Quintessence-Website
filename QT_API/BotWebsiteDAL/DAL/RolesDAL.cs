
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
    public class RolesDAL : IRolesDAL
    {
        private QuintessenceDbContext _context;

        public RolesDAL(QuintessenceDbContext dbContext)
        {
           _context = dbContext;
        }

        public async Task<List<RolesDTO>> GetBotRoles()
        {
            return await _context.Roles.ToListAsync();
        }
    }
}
