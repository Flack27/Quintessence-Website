using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class ReactionRoleConfigContainer
    {
        private readonly IReactionRoleConfigDAL dal;
        public ReactionRoleConfigContainer(IReactionRoleConfigDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<ReactionRoleConfig>?> GetConfigurations()
        {
            List<ReactionRoleConfig> configs = new List<ReactionRoleConfig>();
            List<ReactionRoleConfigDTO> configurations = await dal.GetConfigurations();

            if (configurations == null) { return null; }

            foreach (ReactionRoleConfigDTO dto in configurations)
            {
                ReactionRoleConfig newConfig = new ReactionRoleConfig(
                    dto.ConfigId,
                    dto.Emoji,
                    dto.ModeratorRoleId,
                    dto.ModeratorRole.RoleName,
                    dto.VerificationRoleId,
                    dto.VerificationRole.RoleName,
                    dto.OnlyOneChannelId,
                    dto.OnlyOneChannel.ChannelName
                );

                configs.Add(newConfig);
            }

            return configs;

        }

        public async Task<ValidationResult> UpdateReactionRoleConfig(ReactionRoleConfig config)
        {
            ReactionRoleConfigValidator validator = new ReactionRoleConfigValidator();
            ValidationResult results = validator.Validate(config);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var updatedConfig = new ReactionRoleConfigDTO
            {
                ConfigId = config.Id,
                Emoji = config.Emoji,
                ModeratorRoleId = config.ModeratorRoleId,
                VerificationRoleId = config.VerificationRoleId,
                OnlyOneChannelId = config.OnlyOneChannelId
            };

            bool updateResult = await dal.UpdateConfiguration(updatedConfig);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }


        public async Task<bool> ClearConfiguration(int id)
        {
            return await dal.ClearConfiguration(id);
        }
    }
}
