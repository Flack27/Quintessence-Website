using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;

[Authorize(Policy = "IsAdmin")]
[Route("api/[controller]")]
[ApiController]
public class MenuController : ControllerBase
{
    private UserDataContainer _userData;
    private FormSubmissionsContainer _formSubmissions;
    private EventsContainer _events;

    public MenuController(UserDataContainer userData, FormSubmissionsContainer formSubmissions, EventsContainer events)
    {
        _userData = userData;
        _formSubmissions = formSubmissions;
        _events = events;
    }

    [HttpGet("get-items", Name = "GetMenuItems")]
    public async Task<ActionResult> GetMenuItems()
    {
        var userData = await _userData.GetMenuItemsAsync();
        int messageCount = userData.messageCount;
        decimal voiceTime = userData.totalVoiceTime;
        int eventsCount = await _events.GetEventsCount();
        int submissions = await _formSubmissions.GetFormSubmissionCount();
        var menu = new
        {
            MessageCount = messageCount,
            VoiceTime = voiceTime,
            EventsCount = eventsCount,
            Submissions = submissions
        };
        return Ok(menu);
    }

    // New endpoints for activity graph

    [HttpGet("userdata/users")]
    public async Task<ActionResult> GetUsers()
    {
        var users = await _userData.GetUsersForActivityGraph();
        if (users == null)
        {
            return NotFound("No users found");
        }
        return Ok(users);
    }


    [HttpGet("server-stats/message")]
    public async Task<ActionResult> GetServerMessageStats(
    [FromQuery] string timeRange = null,
    [FromQuery] string startDate = null,
    [FromQuery] string endDate = null)
    {
        var (start, end) = GetDateRange(timeRange, startDate, endDate);

        var data = await _userData.GetServerMessageStats(start, end);

        var periodStats = await GetPeriodStats(start, end);

        var returnData = new
        {
            timelineData = data,
            periodStats = new
            {
                messageCount = periodStats.messageCount,
                voiceTime = periodStats.voiceTime,
                eventsCount = periodStats.eventsCount,
                submissions = periodStats.submissions
            }
        };

        return Ok(returnData);
    }

    [HttpGet("server-stats/voice")]
    public async Task<ActionResult> GetServerVoiceStats(
        [FromQuery] string timeRange = null,
        [FromQuery] string startDate = null,
        [FromQuery] string endDate = null)
    {
        var (start, end) = GetDateRange(timeRange, startDate, endDate);

        var data = await _userData.GetServerVoiceStats(start, end);

        var periodStats = await GetPeriodStats(start, end);

        var returnData = new
        {
            timelineData = data,
            periodStats = new
            {
                messageCount = periodStats.messageCount,
                voiceTime = periodStats.voiceTime,
                eventsCount = periodStats.eventsCount,
                submissions = periodStats.submissions
            }
        };

        return Ok(returnData);
    }


    [HttpGet("server-stats/events")]
    public async Task<ActionResult> GetServerEventsStats(
        [FromQuery] string timeRange = null,
        [FromQuery] string startDate = null,
        [FromQuery] string endDate = null)
    {
        var (start, end) = GetDateRange(timeRange, startDate, endDate);

        var data = await _events.GetServerEventStats(start, end);

        var periodStats = await GetPeriodStats(start, end);

        var returnData = new
        {
            timelineData = data,
            periodStats = new
            {
                messageCount = periodStats.messageCount,
                voiceTime = periodStats.voiceTime,
                eventsCount = periodStats.eventsCount,
                submissions = periodStats.submissions
            }
        };

        return Ok(returnData);
    }

    [HttpGet("server-stats/forms")]
    public async Task<ActionResult> GetServerFormsStats(
        [FromQuery] string timeRange = null,
        [FromQuery] string startDate = null,
        [FromQuery] string endDate = null)
    {
        var (start, end) = GetDateRange(timeRange, startDate, endDate);

        var data = await _formSubmissions.GetServerFormStats(start, end);

        var periodStats = await GetPeriodStats(start, end);

        var returnData = new
        {
            timelineData = data,
            periodStats = new
            {
                messageCount = periodStats.messageCount,
                voiceTime = periodStats.voiceTime,
                eventsCount = periodStats.eventsCount,
                submissions = periodStats.submissions
            }
        };

        return Ok(returnData);
    }



    [HttpGet("userdata/messages")]
    public async Task<ActionResult> GetMessagesData()
    {
        var messages = await _userData.GetMessages();
        if (messages == null)
        {
            return NotFound("No message data found");
        }
        return Ok(messages);
    }

    [HttpGet("userdata/voice-data")]
    public async Task<ActionResult> GetVoiceData()
    {
        var voice = await _userData.GetVoiceData();
        if (voice == null)
        {
            return NotFound("No voice data found");
        }
        return Ok(voice);
    }

    [HttpGet("activity/message")]
    public async Task<ActionResult> GetMessageActivity([FromQuery] string users,
                                                     [FromQuery] string timeRange = null,
                                                     [FromQuery] string startDate = null,
                                                     [FromQuery] string endDate = null)
    {
        if (string.IsNullOrEmpty(users))
        {
            return BadRequest("At least one user ID must be provided");
        }

        var (start, end) = GetDateRange(timeRange, startDate, endDate);
        var userIds = users.Split(',').Select(long.Parse).ToList();
        var data = await _userData.GetMessageActivityData(userIds, start, end);

        return Ok(data);
    }

    [HttpGet("activity/voice")]
    public async Task<ActionResult> GetVoiceActivity([FromQuery] string users,
                                                   [FromQuery] string timeRange = null,
                                                   [FromQuery] string startDate = null,
                                                   [FromQuery] string endDate = null)
    {
        if (string.IsNullOrEmpty(users))
        {
            return BadRequest("At least one user ID must be provided");
        }

        var (start, end) = GetDateRange(timeRange, startDate, endDate);
        var userIds = users.Split(',').Select(long.Parse).ToList();
        var data = await _userData.GetVoiceActivityData(userIds, start, end);

        return Ok(data);
    }



    // Helper method to get period-specific stats
    private async Task<(int messageCount, decimal voiceTime, int eventsCount, int submissions)> GetPeriodStats(DateTime start, DateTime end)
    {
        // Get base stats from UserDataDAL
        var baseStats = await _userData.GetPeriodStats(start, end);

        var submissions = await _formSubmissions.GetSubmissionsCountForPeriod(start, end);

        var eventsCount = await _events.GetEventsCountForPeriod(start, end);

        return (baseStats.messageCount, baseStats.voiceTime, eventsCount, submissions);
    }

    private (DateTime start, DateTime end) GetDateRange(string timeRange, string startDateStr, string endDateStr)
    {
        DateTime end = DateTime.UtcNow.Date;
        DateTime start;

        // If custom date range is provided
        if (!string.IsNullOrEmpty(startDateStr) && !string.IsNullOrEmpty(endDateStr) &&
            DateTime.TryParse(startDateStr, out var customStart) &&
            DateTime.TryParse(endDateStr, out var customEnd))
        {
            return (customStart.Date, customEnd.Date);
        }

        // Otherwise use predefined ranges
        switch (timeRange)
        {
            case "week":
                start = end.AddDays(-7);
                break;
            case "month":
                start = new DateTime(end.Year, end.Month, 1);
                break;
            case "alltime":  // Changed from "3months"
                             // For alltime, we set a very old date as the start
                             // The database query will naturally limit this to the first record
                start = new DateTime(2000, 1, 1);
                break;
            case "year":
                start = new DateTime(end.Year, 1, 1);
                break;
            default:
                // Default to last 30 days
                start = end.AddDays(-30);
                break;
        }

        return (start, end);
    }
}