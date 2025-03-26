using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class XPConfig
    {
        private readonly int voiceMinXP;
        private readonly int voiceMaxXP;
        private readonly int voiceCooldown;
        private readonly int messageMinXP;
        private readonly int messageMaxXP;
        private readonly int messageCooldown;

        [JsonConstructor]
        public XPConfig(int voiceMinXP, int voiceMaxXP, int voiceCooldown, int messageMinXP, int messageMaxXP, int messageCooldown)
        {
            this.voiceMinXP = voiceMinXP;
            this.voiceMaxXP = voiceMaxXP;
            this.voiceCooldown = voiceCooldown;
            this.messageMinXP = messageMinXP;
            this.messageMaxXP = messageMaxXP;
            this.messageCooldown = messageCooldown;
        }

        public XPConfig(XPConfigDTO dto)
        {
            voiceMinXP = dto.VoiceMinXP;
            voiceMaxXP = dto.VoiceMaxXP;
            voiceCooldown = dto.VoiceCooldown;
            messageMinXP = dto.MessageMinXP;
            messageMaxXP = dto.MessageMaxXP;
            messageCooldown = dto.MessageCooldown;
        }

        public int VoiceMinXP { get { return voiceMinXP; } }
        public int VoiceMaxXP { get { return voiceMaxXP; } }
        public int VoiceCooldown { get { return voiceCooldown; } }
        public int MessageMinXP { get { return messageMinXP; } }
        public int MessageMaxXP { get { return messageMaxXP; } }
        public int MessageCooldown { get { return messageCooldown; } }
    }
}

