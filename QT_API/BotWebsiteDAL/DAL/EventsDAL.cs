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

        public async Task<List<dynamic>> GetServerEventsData(DateTime startDate, DateTime endDate)
        {
            try
            {
                var actualData = await _context.EventSignups
                    .Include(s => s.Event)
                    .Where(s => s.Event.Date >= startDate && s.Event.Date <= endDate)
                    .GroupBy(s => s.Event.Date.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        date = g.Key,
                        events = g.Count()
                    })
                    .ToListAsync();

                return GraphDataHelper.FillMissingDates(
                    actualData,
                    startDate,
                    endDate,
                    item => item.date,
                    item => new
                    {
                        date = item.date.ToString("yyyy-MM-dd"),
                        events = item.events
                    },
                    date => new
                    {
                        date = date.ToString("yyyy-MM-dd"),
                        events = 0
                    }
                );
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