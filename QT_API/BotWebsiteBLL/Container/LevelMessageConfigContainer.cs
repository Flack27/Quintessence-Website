using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class LevelMessageConfigContainer
    {
        private readonly ILevelMessageConfigDAL dal;

        public LevelMessageConfigContainer(ILevelMessageConfigDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<LevelMessageConfig>?> GetLevelMessageConfig()
        {
            List<LevelMessageConfig> levelMessageConfigs = new List<LevelMessageConfig>();
            List<LevelToRoleMessagesDTO> levelToRoleMessages = await dal.GetLevelMessageConfigs();

            if (levelToRoleMessages == null) { return null; }

            var sortedLevelToRoleMessages = levelToRoleMessages.OrderByDescending(dto => dto.Level).ToList();

            foreach (var dto in sortedLevelToRoleMessages)
            {
                LevelMessageConfig level = new LevelMessageConfig(dto.Level, dto.RoleId, dto.Role.RoleName);
                levelMessageConfigs.Add(level);
            }
            return levelMessageConfigs;
        }

        public async Task<ValidationResult> AddLevelMessageConfig(LevelMessageConfig config)
        {
            LevelMessageConfigValidator validator = new LevelMessageConfigValidator();
            ValidationResult results = validator.Validate(config);
            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }
            var levelMessageConfigDTO = new LevelToRoleMessagesDTO
            {
                Level = config.Level,
                RoleId = config.RoleId
            };

            bool updateResult = await dal.AddLevelMessageConfig(levelMessageConfigDTO);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }

        public async Task<bool> DeleteLevelMessageConfig(int Level)
        {
            return await dal.DeleteLevelMessageConfig(Level);
        }
    }
}