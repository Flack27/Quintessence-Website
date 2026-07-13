using System.Net.Http.Headers;
using System.Text.Json.Nodes;

namespace Quintessence_Website.Services
{
    /// <summary>
    /// Server-side client for the Qutie keyed public API (docs/design/public-api.md).
    /// The read-only API key lives here (config "Qutie:ApiKey"), never in the browser -
    /// the Angular site calls our own /api/qutie proxy, which calls Qutie with the key.
    /// Qutie derives the guild from the key, so no guild id is sent.
    /// Paginated endpoints are pulled fully (up to a safety cap) and returned combined.
    /// </summary>
    public class QutieApiClient
    {
        private const int PageSize = 200;
        private const int MaxItems = 5000;

        private readonly HttpClient _http;
        private readonly bool _configured;

        public QutieApiClient(HttpClient http, IConfiguration config)
        {
            _http = http;
            var key = config["Qutie:ApiKey"];
            _configured = !string.IsNullOrWhiteSpace(key);
            if (_configured)
                _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
        }

        /// <summary>True once an API key is configured; false = every call returns null (site degrades).</summary>
        public bool Configured => _configured;

        /// <summary>GET /api/v1/games - a bare array, passed through as-is.</summary>
        public Task<string?> GetGamesJson() => GetRawJson("api/v1/games");

        /// <summary>GET /api/v1/members[?roleId=&rankRoleIds=] - paged, returned as { members:[...], total }.
        /// roleId scopes the roster to members holding that Discord role; rankRoleIds (comma-separated,
        /// highest first) adds each member's highest-held rankRole + its live name.</summary>
        public Task<string?> GetGuildMembersJson(string? roleId, string? rankRoleIds)
        {
            var query = new List<string>();
            if (!string.IsNullOrWhiteSpace(roleId)) query.Add($"roleId={Uri.EscapeDataString(roleId)}");
            if (!string.IsNullOrWhiteSpace(rankRoleIds)) query.Add($"rankRoleIds={Uri.EscapeDataString(rankRoleIds)}");
            var path = "api/v1/members" + (query.Count > 0 ? "?" + string.Join("&", query) : "");
            return GetPagedJson(path, "members");
        }

        /// <summary>GET /api/v1/games/{gameId}/members - paged, returned as { members:[...], total }.</summary>
        public Task<string?> GetGameMembersJson(string gameId) =>
            GetPagedJson($"api/v1/games/{Uri.EscapeDataString(gameId)}/members", "members");

        /// <summary>GET /api/v1/events?gameId=... - paged, returned as { events:[...], total }.</summary>
        public Task<string?> GetGameEventsJson(string gameId) =>
            GetPagedJson($"api/v1/events?gameId={Uri.EscapeDataString(gameId)}", "events");

        /// <summary>GET /api/v1/events/{eventId}/vods - paged, returned as { data:[...], total }.</summary>
        public Task<string?> GetEventVodsJson(string eventId) =>
            GetPagedJson($"api/v1/events/{Uri.EscapeDataString(eventId)}/vods", "data");

        private async Task<string?> GetRawJson(string path)
        {
            if (!_configured) return null;
            try
            {
                var resp = await _http.GetAsync(path);
                if (!resp.IsSuccessStatusCode) return null;
                return await resp.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"QutieApiClient GET {path}: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Pulls every page of a paginated list endpoint and returns them combined under
        /// <paramref name="arrayKey"/>. Returns null when unconfigured or the first page fails.
        /// </summary>
        private async Task<string?> GetPagedJson(string path, string arrayKey)
        {
            if (!_configured) return null;
            var sep = path.Contains('?') ? "&" : "?";
            var combined = new JsonArray();
            int offset = 0, total = 0;

            try
            {
                while (combined.Count < MaxItems)
                {
                    var resp = await _http.GetAsync($"{path}{sep}limit={PageSize}&offset={offset}");
                    if (!resp.IsSuccessStatusCode)
                        return offset == 0 ? null : Wrap(combined, arrayKey, total);

                    var node = JsonNode.Parse(await resp.Content.ReadAsStringAsync());
                    total = node?["total"]?.GetValue<int>() ?? 0;
                    var arr = node?[arrayKey]?.AsArray();
                    if (arr == null || arr.Count == 0) break;

                    // RemoveAt detaches each node from the source array so it can be re-parented.
                    while (arr.Count > 0)
                    {
                        var item = arr[0];
                        arr.RemoveAt(0);
                        combined.Add(item);
                    }

                    offset += PageSize;
                    if (offset >= total) break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"QutieApiClient paged {path}: {ex.Message}");
                return offset == 0 ? null : Wrap(combined, arrayKey, total);
            }

            return Wrap(combined, arrayKey, total);
        }

        private static string Wrap(JsonArray arr, string key, int total)
        {
            var obj = new JsonObject { [key] = arr, ["total"] = total };
            return obj.ToJsonString();
        }
    }
}
