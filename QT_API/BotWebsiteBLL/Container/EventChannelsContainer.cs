using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Diagnostics.Tracing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class EventChannelsContainer
    {
        private readonly IEventChannelsDAL dal;
        public EventChannelsContainer(IEventChannelsDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<EventChannels>?> GetConfigurations()
        {
            List<EventChannels>? channels = new List<EventChannels>();
            List<ChannelsDTO>? channelDTOs = await dal.GetEventChannels();

            if (channelDTOs == null) { return null; }

            foreach (var dto in channelDTOs)
            {
                EventChannels? newChannels = new EventChannels(dto.ChannelId, dto.ChannelName, dto.RoleId, dto.Role?.RoleName, dto.GameId, dto.Game?.GameName, dto.SheetTabId);
                channels.Add(newChannels);
            }
            return channels;
        }

        public async Task<ValidationResult> UpdateEventChannel(EventChannels eventChannels)
        {
            EventChannelsValidator? validator = new EventChannelsValidator();
            ValidationResult? results = validator.Validate(eventChannels);
            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var updatedChannel = new ChannelsDTO
            {
                ChannelId = eventChannels.ChannelId,
                RoleId = eventChannels.RoleId,
                GameId = eventChannels.GameId,
                SheetTabId = eventChannels.SheetId
            };

            bool updateResult = await dal.AddEventChannel(updatedChannel);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }
            return new ValidationResult();
        }

        public async Task<bool> DeleteEventChannel(long eventChannel)
        {
            return await dal.DeleteEventChannel(eventChannel);
        }
    }
}


