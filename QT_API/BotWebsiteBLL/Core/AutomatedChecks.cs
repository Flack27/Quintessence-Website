using System.Text.Json.Serialization;

namespace QuintessenceWebsiteBLL.CORE
{
    public class AutomatedChecks
    {
        public int Id { get; set; }
        public int CheckDelayMinutes { get; set; }
        public bool AutoRemoveAbsentUsers { get; set; }
        public bool AutoRemoveLateUsers { get; set; }
        public bool PingUsers { get; set; }

        public AutomatedChecks() { }

        public AutomatedChecks(int id, int checkDelayMinutes, bool autoRemoveAbsentUsers, bool autoRemoveLateUsers, bool pingUsers)
        {
            Id = id;
            CheckDelayMinutes = checkDelayMinutes;
            AutoRemoveAbsentUsers = autoRemoveAbsentUsers;
            AutoRemoveLateUsers = autoRemoveLateUsers;
            PingUsers = pingUsers;
        }
    }
}