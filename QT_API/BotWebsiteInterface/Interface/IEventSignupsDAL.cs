using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IEventSignupsDAL
    {
        Task<List<EventSignupsDTO>?> GetEventSignups(long id);
    }
}
