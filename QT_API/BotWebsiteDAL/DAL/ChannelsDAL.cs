
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
    public class ChannelsDAL : IChannelsDAL
    {
        private QuintessenceDbContext _context;

        public ChannelsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<ChannelsDTO>> GetChannels()
        {
            return await _context.Channels.ToListAsync();
        }


        public async Task<List<ChannelsDTO>?> GetEventChannels()
        {
            try
            {
                return await _context.Events.Include(e => e.Channel).Select(e => e.Channel).Distinct().ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEventChannels" + ex.Message);
                return null;
            }
        }
    }
}
