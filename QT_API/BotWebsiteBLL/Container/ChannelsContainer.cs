using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;


namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class ChannelsContainer
    {
        private readonly IChannelsDAL dal;

        public ChannelsContainer(IChannelsDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<Channels>?> GetChannelData()
        {
            List<Channels>? botData = new List<Channels>();
            List<ChannelsDTO>? botDataDTOs = await dal.GetChannels();

            if (botDataDTOs == null) { return null; }

            foreach (ChannelsDTO dto in botDataDTOs)
            {
                Channels? newBotData = new Channels(dto);
                botData.Add(newBotData);
            }
            return botData;
        }

        public async Task<List<Channels>?> GetEventChannels()
        {
            List<Channels>? botData = new List<Channels>();
            List<ChannelsDTO>? botDataDTOs = await dal.GetEventChannels();

            if (botDataDTOs == null) { return null; }

            foreach (ChannelsDTO dto in botDataDTOs)
            {
                Channels? newBotData = new Channels(dto);
                botData.Add(newBotData);
            }
            return botData;
        }
    }
}
