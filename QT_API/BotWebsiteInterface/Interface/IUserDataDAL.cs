
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IUserDataDAL
    {
        Task<List<UserDataDTO>> GetUserData();
        Task<(int MessageCountSum, decimal TotalVoiceTimeSum)> GetMenuItemsAsync();
        Task<List<dynamic>> GetMessageActivityData(List<long> userIds, DateTime startDate, DateTime endDate);
        Task<List<dynamic>> GetVoiceActivityData(List<long> userIds, DateTime startDate, DateTime endDate);

        Task<List<dynamic>> GetServerMessageActivityData(DateTime startDate, DateTime endDate);
        Task<List<dynamic>> GetServerVoiceActivityData(DateTime startDate, DateTime endDate);
        Task<(int messageCount, decimal voiceTime, int eventsCount, int submissions)> GetPeriodStats(DateTime startDate, DateTime endDate);
    }
}
