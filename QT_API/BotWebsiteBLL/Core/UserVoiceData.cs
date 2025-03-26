using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class UserVoiceData
    {
        private readonly string? displayname;
        private readonly bool? inguild;
        private readonly int? voicexp;
        private readonly int? voicelevel;
        private readonly int? voicerequiredxp;
        private readonly int? totalvoicetime;
        private readonly string? avatar;

        public UserVoiceData(string? displayname, bool? inguild, int? voicexp, int? voicelevel, int? voicerequiredxp, int? totalvoicetime, string? avatar)
        {
            this.displayname = displayname;
            this.inguild = inguild;
            this.voicexp = voicexp;
            this.voicelevel = voicelevel;
            this.voicerequiredxp = voicerequiredxp;
            this.totalvoicetime = totalvoicetime;
            this.avatar = avatar;
        }

        public string? Displayname { get { return displayname; } }
        public bool? InGuild { get { return inguild; } }
        public int? VoiceLevel { get { return voicelevel; } }
        public int? VoiceXP { get { return voicexp; } }
        public int? VoiceRequiredXP { get { return voicerequiredxp; } }
        public int? TotalVoiceTime { get { return totalvoicetime; } }
        public string? Avatar { get { return avatar; } }
    }
}
