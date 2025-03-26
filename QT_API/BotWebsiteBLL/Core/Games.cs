using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class Games
    {
        private long gameId;
        private string gameName;

        public Games(long gameId, string gameName) 
        { 
            this.gameId = gameId;
            this.gameName = gameName;
        }

        public long GameId { get {  return gameId; } }
        public string GameName { get { return gameName; } }
    }
}
