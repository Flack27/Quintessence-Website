
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using QuintessenceWebsiteDAL.Context;
using Microsoft.EntityFrameworkCore;

namespace QuintessenceWebsiteDAL.DAL
{
    public class EventChannelsDAL : IEventChannelsDAL
    {
        private readonly QuintessenceDbContext _context; 

        public EventChannelsDAL(QuintessenceDbContext context)
        {
            _context = context;
        }

        public async Task<List<ChannelsDTO>?> GetEventChannels()
        {
            try
            {
                return await _context.Channels.Where(c => c.IsEventChannel == true).Include(u => u.Role).Include(u => u.Game).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetEventChannelIds" + ex.Message);
                return null;
            }
        }

        public async Task<bool> AddEventChannel(ChannelsDTO config)
        {
            try
            {
                var channel = await _context.Channels.FirstOrDefaultAsync(c => c.ChannelId == config.ChannelId);
                if (channel != null)
                {
                    channel.IsEventChannel = true;
                    channel.RoleId = config.RoleId;
                    channel.GameId = config.GameId;
                    channel.SheetTabId = config.SheetTabId;

                    _context.Channels.Update(channel);
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;

            }
            catch (Exception ex)
            {
                Console.WriteLine("AddEventChannel" + ex.Message );
                return false;
            }
        }

        public async Task<bool> DeleteEventChannel(long channelId)
        {
            try
            {
                var channel = await _context.Channels.FirstOrDefaultAsync(c => c.ChannelId == channelId);
                if (channel != null)
                {
                    channel.IsEventChannel = null;
                    channel.RoleId = null;
                    channel.GameId = null;
                    channel.SheetTabId = null;

                    _context.Channels.Update(channel);
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DeleteEventChannel" + ex.Message);
                return false;
            }
        }
    }
}

