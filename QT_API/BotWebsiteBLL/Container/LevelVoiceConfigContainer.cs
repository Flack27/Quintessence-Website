using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class LevelVoiceConfigContainer
    {
        private readonly ILevelVoiceConfigDAL dal;
        public LevelVoiceConfigContainer(ILevelVoiceConfigDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<LevelVoiceConfig>?> GetLevelVoiceConfigs()
        {
            List<LevelVoiceConfig> levelVoiceConfigs = new List<LevelVoiceConfig>();
            List<LevelToRoleVoiceDTO> LevelToRoleVoice = await dal.GetLevelVoiceConfigs();

            if (LevelToRoleVoice == null) { return null; }

            var sortedLevelToRoleVoice = LevelToRoleVoice.OrderByDescending(dto => dto.Level).ToList();

            foreach (var dto in sortedLevelToRoleVoice)
            {
                LevelVoiceConfig newConfig = new LevelVoiceConfig(dto.Level, dto.RoleId, dto.Role.RoleName);
                levelVoiceConfigs.Add(newConfig);
            }
            return levelVoiceConfigs;
        }

        public async Task<ValidationResult> AddLevelVoiceConfig(LevelVoiceConfig config)
        {
            LevelVoiceConfigValidator validator = new LevelVoiceConfigValidator();
            ValidationResult results = validator.Validate(config);
            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var levelVoiceConfigDTO = new LevelToRoleVoiceDTO
            {
                Level = config.Level,
                RoleId = config.RoleId
            };

            bool updateResult = await dal.AddLevelVoiceConfig(levelVoiceConfigDTO);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }

        public async Task<bool> DeleteLevelVoiceConfig(int Level)
        {
            return await dal.DeleteLevelVoiceConfig(Level);
        }
    }
}
