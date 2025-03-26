using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class UserMessageData
    {
        private readonly string? displayname;
        private readonly bool? inguild;
        private readonly int? messagecount;
        private readonly int? messagexp;
        private readonly int? messagelevel;
        private readonly int? messagerequiredxp;
        private readonly string? avatar;

        public UserMessageData(string? displayname, bool? inguild, int? messagecount, int? messagexp, int? messagelevel, int? messagerequiredxp, string? avatar)
        {
            this.displayname = displayname;
            this.inguild = inguild;
            this.messagecount = messagecount;
            this.messagexp = messagexp;
            this.messagelevel = messagelevel;
            this.messagerequiredxp = messagerequiredxp;
            this.avatar = avatar;
        }

        public string? Displayname { get { return displayname; } }
        public bool? InGuild { get { return inguild; } }
        public int? Messagecount { get { return messagecount; } }
        public int? MessageXP { get { return messagexp; } }
        public int? MessageLevel { get { return messagelevel; } }
        public int? MessageRequiredXP { get { return messagerequiredxp; } }
        public string? Avatar { get { return avatar; } }
    }

}
