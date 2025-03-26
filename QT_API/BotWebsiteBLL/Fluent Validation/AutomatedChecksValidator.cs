using FluentValidation;
using QuintessenceWebsiteBLL.CORE;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class AutomatedChecksValidator : AbstractValidator<AutomatedChecks>
    {
        public AutomatedChecksValidator()
        {
            RuleFor(x => x.CheckDelayMinutes)
                .NotEmpty()
                .WithMessage("CheckDelayMinutes cannot be empty.")
                .GreaterThan(0)
                .WithMessage("CheckDelayMinutes must be greater than 0.");
        }
    }
}