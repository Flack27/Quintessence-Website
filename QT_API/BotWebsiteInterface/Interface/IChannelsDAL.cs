
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IChannelsDAL
    {
        Task<List<ChannelsDTO>> GetChannels();
        Task<List<ChannelsDTO>?> GetEventChannels();
    }
}
