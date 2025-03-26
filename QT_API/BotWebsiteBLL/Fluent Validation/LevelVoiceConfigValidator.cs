using FluentValidation;
using QuintessenceWebsiteBLL.CORE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class LevelVoiceConfigValidator : AbstractValidator<LevelVoiceConfig>
    {
        public LevelVoiceConfigValidator()
        {
            RuleFor(x => x.Level)
                .NotEmpty()
                .WithMessage("Level is required.")
                .GreaterThan(0)
                .WithMessage("Level must be a positive number.");
        }
    }
}
