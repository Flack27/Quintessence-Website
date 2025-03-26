using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class EventSignupsContainer
    {
        private readonly IEventSignupsDAL dal;
        public EventSignupsContainer(IEventSignupsDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<EventSignups>?> GetEventSignups(long eventId)
        {
            List<EventSignups> events = new List<EventSignups>();
            List<EventSignupsDTO>? eventDTOs = await dal.GetEventSignups(eventId);

            if (eventDTOs == null) { return null; }

            foreach (var dto in eventDTOs)
            {
                EventSignups newEvent = new EventSignups(dto);
                events.Add(newEvent);
            }

            events = events.OrderBy(e => e.DisplayName).ToList();

            return events;
        }
    }
}