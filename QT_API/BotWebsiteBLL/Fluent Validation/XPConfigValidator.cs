using FluentValidation;
using QuintessenceWebsiteBLL.CORE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class XPConfigValidator : AbstractValidator<XPConfig>
    {
        public XPConfigValidator()
        {
            RuleFor(x => x.VoiceMinXP)
                .NotEmpty()
                .WithMessage("VoiceMinXP is required.")
                .GreaterThan(0)
                .WithMessage("VoiceMinXP must be a positive number.");

            RuleFor(x => x.VoiceMaxXP)
                .NotEmpty()
                .WithMessage("VoiceMaxXP is required.")
                .GreaterThan(0)
                .WithMessage("VoiceMaxXP must be a positive number.")
                .GreaterThan(x => x.VoiceMinXP)
                .WithMessage("VoiceMaxXP must be greater than VoiceMinXP.");

            RuleFor(x => x.VoiceCooldown)
                .NotEmpty()
                .WithMessage("VoiceCooldown is required.")
                .GreaterThan(0)
                .WithMessage("VoiceCooldown must be a positive number.");

            RuleFor(x => x.MessageMinXP)
                .NotEmpty()
                .WithMessage("MessageMinXP is required.")
                .GreaterThan(0)
                .WithMessage("MessageMinXP must be a positive number.");

            RuleFor(x => x.MessageMaxXP)
                .NotEmpty()
                .WithMessage("MessageMaxXP is required.")
                .GreaterThan(0)
                .WithMessage("MessageMaxXP must be a positive number.")
                .GreaterThan(x => x.MessageMinXP)
                .WithMessage("MessageMaxXP must be greater than MessageMinXP.");

            RuleFor(x => x.MessageCooldown)
                .NotEmpty()
                .WithMessage("MessageCooldown is required.")
                .GreaterThan(0)
                .WithMessage("MessageCooldown must be a positive number.");
        }
    }
}
