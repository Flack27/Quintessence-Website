using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuintessenceWebsiteBLL.Container;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteBLL.CORE;
using System.ComponentModel;

namespace Quintessence_Website.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DropDownController : ControllerBase
    {
        private RolesContainer _roles;
        private ChannelsContainer _channels;
        private QuestionTypeContainer _questionType;
        private GamesContainer _games;
        public DropDownController(ChannelsContainer channels, RolesContainer roles, QuestionTypeContainer questionType, GamesContainer games) 
        { 
            _roles = roles;
            _channels = channels;
            _questionType = questionType;
            _games = games;

        }

        [HttpGet("roles", Name = "GetRoles")]
        public async Task<ActionResult<Roles>> GetRoles()
        {
            var roles = await _roles.GetRoleData();

            if (roles == null)
            {
                return NotFound("Roles not found");
            }

            return Ok(roles);
        }


        [HttpGet("channels", Name = "GetChannels")]
        public async Task<ActionResult<Channels>> GetChannels()
        {
            var channels = await _channels.GetChannelData();

            if (channels == null)
            {
                return NotFound("Channels not found");
            }

            return Ok(channels);
        }

        [HttpGet("quetiontypes", Name = "GetQuestionTypes")]
        public async Task<ActionResult<QuestionType>> GetQuestionTypes()
        {
            var types = await _questionType.GetQuestionTypes();

            if (types == null)
            {
                return NotFound("Question types not found");
            }

            return Ok(types);
        }

        [HttpGet("games", Name = "GetGames")]
        public async Task<ActionResult<Games>> GetGames()
        {
            var games = await _games.GetGames();

            if (games == null)
            {
                return NotFound("Question types not found");
            }

            return Ok(games);
        }
    }
}
