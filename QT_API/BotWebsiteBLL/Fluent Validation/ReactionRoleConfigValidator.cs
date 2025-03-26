using FluentValidation;
using QuintessenceWebsiteBLL.CORE;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class ReactionRoleConfigValidator : AbstractValidator<ReactionRoleConfig>
    {
        public ReactionRoleConfigValidator()
        {
            RuleFor(x => x.Emoji)
                .NotEmpty()
                .WithMessage("Emoji cannot be empty.")
                .Must(IsValidUnicodeEmoji)
                .WithMessage("Invalid Unicode Emoji.");
        }

        private static bool IsValidUnicodeEmoji(string emoji)
        {
            string emojiPattern = @"[\u2600-\u27BF]|[\uD83C][\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]";
            return Regex.IsMatch(emoji, emojiPattern, RegexOptions.Singleline);
        }
    }
}
