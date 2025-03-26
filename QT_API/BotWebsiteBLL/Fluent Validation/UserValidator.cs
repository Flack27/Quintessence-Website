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
    public class UserValidator : AbstractValidator<User>
    {

        private enum UrlType
        {
            Steam,
            X,
            Twitch,
            Youtube
        }


        public UserValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty()
                .WithMessage("UserId not found.");
            RuleFor(x => x.Steam)
                .Must(url => IsValidUrl(url, UrlType.Steam))
                .WithMessage("Invalid Steam URL.");

            RuleFor(x => x.X)
                .Must(url => IsValidUrl(url, UrlType.X))
                .WithMessage("Invalid X URL.");

            RuleFor(x => x.Twitch)
                .Must(url => IsValidUrl(url, UrlType.Twitch))
                .WithMessage("Invalid Twitch URL.");

            RuleFor(x => x.Youtube)
                .Must(url => IsValidUrl(url, UrlType.Youtube))
                .WithMessage("Invalid Youtube URL.");
        }
        private bool IsValidUrl(string url, UrlType type)
        {
            string pattern = "";
            switch (type)
            {
                case UrlType.Steam:
                    pattern = @"^(https?://)?(www\.)?steam.*(\/)?$";
                    break;
                case UrlType.X:
                    pattern = @"^(https?://)?(www\.)?(x|twitter).*(\/)?$";
                    break;
                case UrlType.Twitch:
                    pattern = @"^(https?://)?(www\.)?twitch.*(\/)?$";
                    break;
                case UrlType.Youtube:
                    pattern = @"^(https?://)?(www\.)?youtube.*(\/)?$";
                    break;
            }

            if (!string.IsNullOrEmpty(url))
            {
                Regex regex = new Regex(pattern, RegexOptions.IgnoreCase);
                return regex.IsMatch(url);
            }

            return true;
        }
    }
}
