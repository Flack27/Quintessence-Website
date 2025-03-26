using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IEventsDAL
    {
        Task<List<EventsDTO>> GetEvents(long channelId);
        Task<int> GetTotalEvents();

        // New methods for server-wide stats
        Task<List<dynamic>> GetServerEventsData(DateTime startDate, DateTime endDate);
        Task<int> GetEventsCountForPeriod(DateTime startDate, DateTime endDate);
    }
}