
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IEventChannelsDAL
    {
        Task<List<ChannelsDTO>?> GetEventChannels();
        Task<bool> AddEventChannel(ChannelsDTO config);
        Task<bool> DeleteEventChannel(long channelId);
    }
}
