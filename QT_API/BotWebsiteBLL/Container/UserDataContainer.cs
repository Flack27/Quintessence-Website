using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class UserDataContainer
    {
        private readonly IUserDataDAL dal;
        private readonly FormSubmissionsContainer formSubmissions;
        private readonly EventsContainer events;

        public UserDataContainer(
            IUserDataDAL dal,
            FormSubmissionsContainer formSubmissions = null,
            EventsContainer events = null)
        {
            this.dal = dal;
            this.formSubmissions = formSubmissions;
            this.events = events;
        }

        // Existing methods...
        public async Task<List<UserMessageData>?> GetMessages()
        {
            // Keep existing implementation
            List<UserMessageData> message = new();
            List<UserDataDTO> UserData = await dal.GetUserData();

            var orderedUserData = UserData.OrderByDescending(m => m.MessageCount).ToList();

            if (UserData == null) { return null; }

            foreach (UserDataDTO dto in orderedUserData)
            {
                UserMessageData newMessage = new(dto.User.DisplayName, dto.User.InGuild, dto.MessageCount, dto.MessageXP, dto.MessageLevel, dto.MessageRequiredXP, dto.User.Avatar);
                message.Add(newMessage);
            }

            return message;
        }

        public async Task<List<UserVoiceData>?> GetVoiceData()
        {
            // Keep existing implementation
            List<UserVoiceData> voice = new();
            List<UserDataDTO> UserData = await dal.GetUserData();

            var orderedUserData = UserData.OrderByDescending(m => (int?)m.TotalVoiceTime).ToList();

            if (UserData == null) { return null; }

            foreach (UserDataDTO dto in orderedUserData)
            {
                UserVoiceData newVoice = new(dto.User.DisplayName, dto.User.InGuild, dto.VoiceXP, dto.VoiceLevel, dto.VoiceRequiredXP, (int?)dto.TotalVoiceTime, dto.User.Avatar);
                voice.Add(newVoice);
            }

            return voice;
        }

        public async Task<(int messageCount, decimal totalVoiceTime)> GetMenuItemsAsync()
        {
            return await dal.GetMenuItemsAsync();
        }

        public async Task<List<dynamic>> GetUsersForActivityGraph()
        {
            var userData = await dal.GetUserData();
            if (userData == null) { return null; }

            return userData
                .Where(u => u.User.InGuild)
                .OrderByDescending(u => u.MessageCount)
                .Select(u => new
                {
                    id = u.User.UserId.ToString(),
                    displayname = u.User.DisplayName,
                    avatar = u.User.Avatar
                })
                .ToList<dynamic>();
        }

        public async Task<List<dynamic>> GetMessageActivityData(List<long> userIds, DateTime start, DateTime end)
        {
            return await dal.GetMessageActivityData(userIds, start, end);
        }

        public async Task<List<dynamic>> GetVoiceActivityData(List<long> userIds, DateTime start, DateTime end)
        {
            return await dal.GetVoiceActivityData(userIds, start, end);
        }

        // New method for server-wide message activity
        public async Task<object> GetServerMessageStats(DateTime start, DateTime end)
        {
            return await dal.GetServerMessageActivityData(start, end);
        }

        // New method for server-wide voice activity
        public async Task<object> GetServerVoiceStats(DateTime start, DateTime end)
        {
            return await dal.GetServerVoiceActivityData(start, end);
        }

        public async Task<(int messageCount, decimal voiceTime)> GetPeriodStats(DateTime start, DateTime end)
        {
            var baseStats = await dal.GetPeriodStats(start, end);
            return (baseStats.messageCount, baseStats.voiceTime);
        }
    }
}