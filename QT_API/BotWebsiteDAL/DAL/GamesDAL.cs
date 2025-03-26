using Microsoft.EntityFrameworkCore;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteDAL.DAL
{
    public class GamesDAL : IGamesDAL
    {
        private QuintessenceDbContext _context;
        public GamesDAL(QuintessenceDbContext context) 
        {
            _context = context;
        }

        public async Task<List<GamesDTO>?> GetGames()
        {
            try
            {
                return await _context.Games.ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEventChannelIds" + ex.Message);
                return null;
            }
        }
    }
}
