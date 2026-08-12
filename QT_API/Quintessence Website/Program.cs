using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteDAL.Store;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using Quintessence_Website.Services;
using Microsoft.AspNetCore.Authentication;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var environment = builder.Environment;
bool isDevelopment = environment.IsDevelopment();

builder.Configuration.AddUserSecrets<Program>();

// Persist the Data Protection keys, which encrypt the auth cookie. By default they live in
// the container filesystem, so every `docker compose up --build` generated a fresh set and
// silently signed everyone out - which made the 365-day cookie below last only until the
// next deploy. App_Data is a named volume, so keys (and sessions) now survive redeploys.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(
        Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys")))
    .SetApplicationName("QuintessenceWebsite");

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

string clientId = builder.Configuration["Discord:ClientId"] ?? throw (new Exception("Client id not found"));
string clientSecret = builder.Configuration["Discord:ClientSecret"] ?? throw (new Exception("Client secret not found"));

string frontendUrl = isDevelopment
    ? "https://localhost:4200"
    : "https://quintessence-eu.com";

// The old bot-synced role check is gone (the bot lives in Qutie now); admins are a
// plain allowlist of Discord user ids in config: "Discord": { "AdminUserIds": [ "123..." ] }.
var adminUserIds = builder.Configuration.GetSection("Discord:AdminUserIds").Get<string[]>() ?? Array.Empty<string>();

// Codex authoring access is decided by Discord roles, not by this allowlist - see
// CodexAccessService. Bound here so a missing section is an empty (deny-all) config
// rather than a crash.
var codexOptions = builder.Configuration.GetSection("Codex").Get<CodexOptions>() ?? new CodexOptions();
builder.Services.AddSingleton(codexOptions);
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<CodexAccessService>(http => http.Timeout = TimeSpan.FromSeconds(10));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("IsAdmin", policy =>
        policy.RequireClaim("is_admin", "true"));

    // Codex policies are assertions rather than claim checks: roles are resolved live on
    // each request (behind a short cache) instead of being stamped into the year-long auth
    // cookie at sign-in, so revoking a role takes effect in minutes, not at next logout.
    options.AddPolicy("CodexAuthor", policy =>
        policy.Requirements.Add(new CodexAccessRequirement(RequireManage: false)));

    options.AddPolicy("CodexManager", policy =>
        policy.Requirements.Add(new CodexAccessRequirement(RequireManage: true)));
});

builder.Services.AddSingleton<IAuthorizationHandler, CodexAccessHandler>();

// Discord Oauth2
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = DiscordAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "AuthCookie";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = isDevelopment ? CookieSecurePolicy.None : CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(365);

    options.Events.OnSigningIn = context =>
    {
        context.Properties.IsPersistent = true;
        return Task.CompletedTask;
    };

    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.Redirect(frontendUrl);
        return Task.CompletedTask;
    };
})
.AddDiscord(options =>
{
    options.ClientId = clientId;
    options.ClientSecret = clientSecret;
    options.Scope.Add("identify");
    options.SaveTokens = true;
    options.CallbackPath = "/api/accounts/auth-callback";

    options.Events.OnCreatingTicket = context =>
    {
        var user = context.Identity;

        // Retrieve user details from Discord
        var discordId = context.User.GetProperty("id").GetString();
        var displayname = context.User.GetProperty("global_name").GetString();
        var username = context.User.GetProperty("username").GetString();
        var avatar = context.User.GetProperty("avatar").GetString();
        var avatarUrl = $"https://cdn.discordapp.com/avatars/{discordId}/{avatar}.png";

        user.AddClaim(new Claim("id", discordId ?? string.Empty));
        user.AddClaim(new Claim("avatar_url", avatarUrl ?? string.Empty));
        user.AddClaim(new Claim("display_name", displayname ?? string.Empty));
        user.AddClaim(new Claim("user_name", username ?? string.Empty));

        if (!string.IsNullOrEmpty(discordId) && adminUserIds.Contains(discordId))
        {
            user.AddClaim(new Claim("is_admin", "true"));
        }

        return Task.CompletedTask;
    };

    options.Events.OnRemoteFailure = context =>
    {
        context.Response.Redirect(frontendUrl);
        context.HandleResponse();
        return Task.CompletedTask;
    };
});

// Data lives in JSON files under App_Data (no database). Stores are singletons so the
// in-process file lock actually serializes writes.
var dataDir = Path.Combine(builder.Environment.ContentRootPath, "App_Data");
builder.Services.AddSingleton(new JsonStore<GamesDTO>(Path.Combine(dataDir, "games.json"), Seed.Games));
builder.Services.AddSingleton(new JsonStore<GuildTimelineEntryDTO>(Path.Combine(dataDir, "timeline.json"), Seed.Timeline));

builder.Services.AddScoped<IGamesDAL, GamesDAL>();
builder.Services.AddScoped<ITimelineDAL, TimelineDAL>();

// Server-side client for the Qutie public API. Base url in config ("Qutie:ApiBase"),
// the read-only key in "Qutie:ApiKey" (user secrets / env / prod appsettings - never
// committed). Same-server prod: point ApiBase at Qutie's local API (e.g. http://localhost:5001).
builder.Services.AddHttpClient<QutieApiClient>((sp, http) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var baseUrl = cfg["Qutie:ApiBase"] ?? "https://localhost:5001";
    http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    http.Timeout = TimeSpan.FromSeconds(10);
})
.ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    // Trust Qutie's self-signed dev cert only in Development; prod uses a real cert or plain http localhost.
    ServerCertificateCustomValidationCallback = isDevelopment
        ? HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        : null
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseForwardedHeaders();

app.UseCors(policy =>
    policy.WithOrigins(frontendUrl)
          .AllowCredentials()
          .AllowAnyHeader()
          .AllowAnyMethod());

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (isDevelopment)
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.Run();
