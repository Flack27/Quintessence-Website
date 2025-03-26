using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class AutomationContainer
    {
        private readonly IAutomationDAL dal;

        public AutomationContainer(IAutomationDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<AutomatedChecks>?> GetConfigurations()
        {
            List<AutomatedChecks> checks = new List<AutomatedChecks>();
            List<AutomatedChecksDTO>? checkDTOs = await dal.GetAutomatedChecks();

            if (checkDTOs == null) { return null; }

            foreach (var dto in checkDTOs)
            {
                AutomatedChecks newCheck = new AutomatedChecks(
                    dto.Id,
                    dto.CheckDelayMinutes,
                    dto.AutoRemoveAbsentUsers,
                    dto.AutoRemoveLateUsers,
                    dto.PingUsers
                );
                checks.Add(newCheck);
            }

            return checks;
        }

        public async Task<ValidationResult> UpdateAutomatedCheck(AutomatedChecks automatedCheck)
        {
            AutomatedChecksValidator validator = new AutomatedChecksValidator();
            ValidationResult results = validator.Validate(automatedCheck);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var updatedCheck = new AutomatedChecksDTO
            {
                Id = automatedCheck.Id,
                CheckDelayMinutes = automatedCheck.CheckDelayMinutes,
                AutoRemoveAbsentUsers = automatedCheck.AutoRemoveAbsentUsers,
                AutoRemoveLateUsers = automatedCheck.AutoRemoveLateUsers,
                PingUsers = automatedCheck.PingUsers
            };

            bool updateResult = await dal.AddAutomatedCheck(updatedCheck);

            if (!updateResult)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update the database."));
                Console.WriteLine("Property DAL failed validation. Error was: Failed to update the database.");
                return results;
            }

            return new ValidationResult();
        }

        public async Task<bool> DeleteAutomatedCheck(int id)
        {
            return await dal.DeleteAutomatedCheck(id);
        }
    }
}