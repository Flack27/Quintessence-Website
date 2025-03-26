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
    public class EventsDAL : IEventsDAL
    {
        private QuintessenceDbContext _context;

        public EventsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<EventsDTO>> GetEvents(long channelId)
        {
            try
            {
                return await _context.Events.Where(c => c.ChannelId == channelId).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEvents" + ex.Message);
                return null;
            }
        }

        public async Task<int> GetTotalEvents()
        {
            try
            {
                int totalSignups = await _context.EventSignups.CountAsync();
                return totalSignups;
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetTotalEvents: " + ex.Message);
                return 0;
            }
        }

        // New methods for server-wide stats

        public async Task<List<dynamic>> GetServerEventsData(DateTime startDate, DateTime endDate)
        {
            try
            {
                // Group signups by event date and count them
                var data = await _context.EventSignups
                    .Include(s => s.Event) // Include the Event to access its Date
                    .Where(s => s.Event.Date >= startDate && s.Event.Date <= endDate)
                    .GroupBy(s => s.Event.Date.Date) // Group by the event date
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-dd"),
                        events = g.Count() // Count signups per date
                    })
                    .ToListAsync();

                return data.Cast<dynamic>().ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetServerEventsData: " + ex.Message);
                return new List<dynamic>();
            }
        }

        public async Task<int> GetEventsCountForPeriod(DateTime startDate, DateTime endDate)
        {
            try
            {
                // Count signups within date range
                return await _context.EventSignups
                    .Include(s => s.Event)
                    .CountAsync(s => s.Event.Date >= startDate && s.Event.Date <= endDate);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEventsCountForPeriod: " + ex.Message);
                return 0;
            }
        }
    }
}