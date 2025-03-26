using FluentValidation;
using QuintessenceWebsiteBLL.CORE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class GamesValidator : AbstractValidator<Games>
    {
        public GamesValidator() 
        {
            RuleFor(x => x.GameId)
                .NotEmpty()
                .WithMessage("GameId cannot be empty.");

            RuleFor(x => x.GameName)
                .NotEmpty()
                .WithMessage("GameName cannot be empty.");
        }
    }
}
