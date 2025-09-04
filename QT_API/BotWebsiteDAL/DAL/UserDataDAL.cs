using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteDAL.Context;
using Microsoft.EntityFrameworkCore;

namespace QuintessenceWebsiteDAL.DAL
{
    public class UserDataDAL : IUserDataDAL
    {
        QuintessenceDbContext _context;

        public UserDataDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserDataDTO>?> GetUserData()
        {
            // Existing implementation
            try
            {
                return await _context.UserData.Include(u => u.User).Where(i => i.User.InGuild == true).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetUserData: " + ex.Message);
                return null;
            }
        }

        public async Task<(int MessageCountSum, decimal TotalVoiceTimeSum)> GetMenuItemsAsync()
        {
            // Existing implementation
            try
            {
                var result = await _context.UserData
                    .GroupBy(u => 1)
                    .Select(g => new
                    {
                        MessageCountSum = g.Sum(u => u.MessageCount),
                        TotalVoiceTimeSum = g.Sum(u => u.TotalVoiceTime)
                    })
                    .FirstOrDefaultAsync();
                if (result == null || result.MessageCountSum == null || result.TotalVoiceTimeSum == null) { return (0, 0); }
                return (result.MessageCountSum.Value, result.TotalVoiceTimeSum.Value);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetMenuItems: " + ex.Message);
                return (0, 0);
            }
        }

        public async Task<List<dynamic>> GetMessageActivityData(List<long> userIds, DateTime startDate, DateTime endDate)
        {
            try
            {
                // Get actual data grouped by user
                var actualData = await _context.UserMessageActivitySummary
                    .Where(a => userIds.Contains(a.UserId) && a.Date >= startDate && a.Date <= endDate)
                    .OrderBy(a => a.UserId)
                    .ThenBy(a => a.Date)
                    .Select(a => new
                    {
                        userId = a.UserId,
                        date = a.Date,
                        messageCount = a.MessageCount,
                        xpEarned = a.XpEarned
                    })
                    .ToListAsync();

                // Group by user for processing
                var userDataGroups = actualData.GroupBy(d => d.userId);
                var result = new List<dynamic>();

                // Fill missing dates for each user
                foreach (var userId in userIds)
                {
                    var userGroup = userDataGroups.FirstOrDefault(g => g.Key == userId);

                    if (userGroup != null)
                    {
                        var userDataList = userGroup.ToList();
                        var userDataDict = userDataList.ToDictionary(d => d.date.Date);

                        // Generate all dates for this user
                        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
                        {
                            if (userDataDict.TryGetValue(date, out var existingData))
                            {
                                result.Add(new
                                {
                                    userId = existingData.userId.ToString(),
                                    date = date.ToString("yyyy-MM-dd"),
                                    messageCount = existingData.messageCount,
                                    xpEarned = existingData.xpEarned
                                });
                            }
                            else
                            {
                                result.Add(new
                                {
                                    userId = userId.ToString(),
                                    date = date.ToString("yyyy-MM-dd"),
                                    messageCount = 0,
                                    xpEarned = 0
                                });
                            }
                        }
                    }
                    else
                    {
                        // User has no data, create zeros for all dates
                        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
                        {
                            result.Add(new
                            {
                                userId = userId.ToString(),
                                date = date.ToString("yyyy-MM-dd"),
                                messageCount = 0,
                                xpEarned = 0
                            });
                        }
                    }
                }

                return result.Cast<dynamic>().ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetMessageActivityData: " + ex.Message);
                return new List<dynamic>();
            }
        }

        public async Task<List<dynamic>> GetVoiceActivityData(List<long> userIds, DateTime startDate, DateTime endDate)
        {
            try
            {
                // Get actual data grouped by user
                var actualData = await _context.UserVoiceActivitySummary
                    .Where(a => userIds.Contains(a.UserId) && a.Date >= startDate && a.Date <= endDate)
                    .OrderBy(a => a.UserId)
                    .ThenBy(a => a.Date)
                    .Select(a => new
                    {
                        userId = a.UserId,
                        date = a.Date,
                        voiceHours = Math.Round((double)a.VoiceMinutes / 60, 2),
                        xpEarned = a.XpEarned
                    })
                    .ToListAsync();

                // Group by user for processing
                var userDataGroups = actualData.GroupBy(d => d.userId);
                var result = new List<dynamic>();

                // Fill missing dates for each user
                foreach (var userId in userIds)
                {
                    var userGroup = userDataGroups.FirstOrDefault(g => g.Key == userId);

                    // Fix: Handle the null case differently
                    if (userGroup != null)
                    {
                        var userDataList = userGroup.ToList();
                        var userDataDict = userDataList.ToDictionary(d => d.date.Date);

                        // Generate all dates for this user
                        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
                        {
                            if (userDataDict.TryGetValue(date, out var existingData))
                            {
                                result.Add(new
                                {
                                    userId = existingData.userId.ToString(),
                                    date = date.ToString("yyyy-MM-dd"),
                                    voiceHours = existingData.voiceHours,
                                    xpEarned = existingData.xpEarned
                                });
                            }
                            else
                            {
                                result.Add(new
                                {
                                    userId = userId.ToString(),
                                    date = date.ToString("yyyy-MM-dd"),
                                    voiceHours = 0.0,
                                    xpEarned = 0
                                });
                            }
                        }
                    }
                    else
                    {
                        // User has no data, create zeros for all dates
                        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
                        {
                            result.Add(new
                            {
                                userId = userId.ToString(),
                                date = date.ToString("yyyy-MM-dd"),
                                voiceHours = 0.0,
                                xpEarned = 0
                            });
                        }
                    }
                }

                return result.Cast<dynamic>().ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetVoiceActivityData: " + ex.Message);
                return new List<dynamic>();
            }
        }

        public async Task<List<dynamic>> GetServerMessageActivityData(DateTime startDate, DateTime endDate)
        {
            try
            {
                var actualData = await _context.UserMessageActivitySummary
                    .Where(a => a.Date >= startDate && a.Date <= endDate)
                    .GroupBy(a => a.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        date = g.Key,
                        messageCount = g.Sum(a => a.MessageCount),
                        xpEarned = g.Sum(a => a.XpEarned)
                    })
                    .ToListAsync();

                return GraphDataHelper.FillMissingDates(
                    actualData,
                    startDate,
                    endDate,
                    item => item.date,
                    item => new
                    {
                        date = item.date.ToString("yyyy-MM-dd"),
                        messageCount = item.messageCount,
                        xpEarned = item.xpEarned
                    },
                    date => new
                    {
                        date = date.ToString("yyyy-MM-dd"),
                        messageCount = 0,
                        xpEarned = 0
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetServerMessageActivityData: " + ex.Message);
                return new List<dynamic>();
            }
        }


        public async Task<List<dynamic>> GetServerVoiceActivityData(DateTime startDate, DateTime endDate)
        {
            try
            {
                var actualData = await _context.UserVoiceActivitySummary
                    .Where(a => a.Date >= startDate && a.Date <= endDate)
                    .GroupBy(a => a.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        date = g.Key,
                        voiceHours = Math.Round((double)g.Sum(a => a.VoiceMinutes) / 60, 2),
                        xpEarned = g.Sum(a => a.XpEarned)
                    })
                    .ToListAsync();

                return GraphDataHelper.FillMissingDates(
                    actualData,
                    startDate,
                    endDate,
                    item => item.date,
                    item => new
                    {
                        date = item.date.ToString("yyyy-MM-dd"),
                        voiceHours = item.voiceHours,
                        xpEarned = item.xpEarned
                    },
                    date => new
                    {
                        date = date.ToString("yyyy-MM-dd"),
                        voiceHours = 0.0,
                        xpEarned = 0
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetServerVoiceActivityData: " + ex.Message);
                return new List<dynamic>();
            }
        }

        // New method to get stats for a specific time period
        public async Task<(int messageCount, decimal voiceTime, int eventsCount, int submissions)> GetPeriodStats(DateTime startDate, DateTime endDate)
        {
            try
            {
                // Get message count for the period
                var messageCount = await _context.UserMessageActivitySummary
                    .Where(a => a.Date >= startDate && a.Date <= endDate)
                    .SumAsync(a => a.MessageCount);

                // Get voice time for the period
                var voiceMinutes = await _context.UserVoiceActivitySummary
                    .Where(a => a.Date >= startDate && a.Date <= endDate)
                    .SumAsync(a => a.VoiceMinutes);

                // Convert minutes to hours
                decimal voiceHours = Math.Round((decimal)voiceMinutes / 60, 2);

                // For events and submissions, we'll return 0 for now as these will be
                // implemented in the container by calling other services
                return (messageCount, voiceHours, 0, 0);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetPeriodStats: " + ex.Message);
                return (0, 0, 0, 0);
            }
        }
    }
}