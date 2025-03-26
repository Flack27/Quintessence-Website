
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteDAL.Context;
using Microsoft.EntityFrameworkCore;

namespace QuintessenceWebsiteDAL.DAL
{
    public class EventSignupsDAL : IEventSignupsDAL
    {
        private QuintessenceDbContext _context;

        public EventSignupsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<EventSignupsDTO>?> GetEventSignups(long eventId)
        {
            try
            {
                return await _context.EventSignups.Where(u => u.EventId == eventId).Include(u => u.User).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEvents" +  ex.Message);
                return null;
            }
        }
    }
}
