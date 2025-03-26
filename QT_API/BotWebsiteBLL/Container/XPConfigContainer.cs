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
    public class XPConfigContainer
    {
        private readonly IXPConfigDAL dal;

        public XPConfigContainer(IXPConfigDAL dal)
        {
            this.dal = dal;
        }

        public async Task<XPConfig?> GetXPConfig()
        {
            XPConfigDTO xpConfigDTO = await dal.GetXPConfig();

            if (xpConfigDTO == null) { return null; }

            return new XPConfig(xpConfigDTO);
        }

        public async Task<ValidationResult> UpdateXPConfig(XPConfig xpConfig)
        {
            XPConfigValidator validator = new XPConfigValidator();
            ValidationResult results = validator.Validate(xpConfig);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var xpConfigDTO = new XPConfigDTO
            {
                VoiceMinXP = xpConfig.VoiceMinXP,
                VoiceMaxXP = xpConfig.VoiceMaxXP,
                VoiceCooldown = xpConfig.VoiceCooldown,
                MessageMinXP = xpConfig.MessageMinXP,
                MessageMaxXP = xpConfig.MessageMaxXP,
                MessageCooldown = xpConfig.MessageCooldown,
            };

            bool updateResult = await dal.UpdateXPConfig(xpConfigDTO);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property " + "DAL" + " failed validation. Error was: " + "Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }
    }
}
