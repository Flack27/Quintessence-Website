using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class EventsContainer
    {
        private readonly IEventsDAL dal;

        public EventsContainer(IEventsDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<Events>?> GetEvents(long channelId)
        {
            List<Events> events = new List<Events>();
            List<EventsDTO> eventDTOs = await dal.GetEvents(channelId);
            if (eventDTOs == null) { return null; }
            var sortedEventDTOs = eventDTOs.OrderByDescending(dto => dto.Date).ToList();
            foreach (EventsDTO dto in sortedEventDTOs)
            {
                Events newEvent = new Events(dto.EventId, dto.Title, dto.Date.ToString("yyyy-MM-dd"));
                events.Add(newEvent);
            }
            return events;
        }

        public async Task<int> GetEventsCount()
        {
            return await dal.GetTotalEvents();
        }


        public async Task<object> GetServerEventStats(DateTime start, DateTime end)
        {
            return await dal.GetServerEventsData(start, end);
        }

        public async Task<int> GetEventsCountForPeriod(DateTime startDate, DateTime endDate)
        {
            return await dal.GetEventsCountForPeriod(startDate, endDate);
        }
    }
}