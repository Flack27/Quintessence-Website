using FluentValidation;
using QuintessenceWebsiteBLL.CORE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class EventChannelsValidator : AbstractValidator<EventChannels>
    {
        public EventChannelsValidator() 
        {
            RuleFor(x => x.RoleId)
                .NotEmpty()
                .WithMessage("RoleId cannot be empty.");

            RuleFor(x => x.ChannelId)
                .NotEmpty()
                .WithMessage("ChannelId cannot be empty.");

            RuleFor(x => x.GameId)
                .NotEmpty()
                .WithMessage("GameId cannot be empty.");
        }
    }
}
