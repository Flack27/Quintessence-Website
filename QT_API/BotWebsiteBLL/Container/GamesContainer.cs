using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Diagnostics.Tracing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class GamesContainer
    {
        private IGamesDAL dal;
        public GamesContainer(IGamesDAL dal)
        {
            this.dal = dal;
        }

        public async Task<List<Games>?> GetGames()
        {
            List<Games> games = new List<Games>();
            List<GamesDTO>? gameDTOs = await dal.GetGames();

            if (gameDTOs == null) { return null; }

            foreach (var dto in gameDTOs)
            {
                Games game = new Games(dto.GameId, dto.GameName);
                games.Add(game);
            }
            return games;
        }
    }
}


