using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QuintessenceWebsiteBLL.Container;
using QuintessenceWebsiteBLL.CONTAINERS;
using QuintessenceWebsiteDAL.Context;
using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using Microsoft.AspNetCore.Authentication;
using AspNet.Security.OAuth.Discord;
using System;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using Quintessence_Website.Controllers;

var builder = WebApplication.CreateBuilder(args);

var environment = builder.Environment;
bool isDevelopment = environment.IsDevelopment();

builder.Configuration.AddUserSecrets<Program>();

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{environment.EnvironmentName}.json", optional: true) 
    .AddEnvironmentVariables()
    .Build();

string connectionString = configuration["Database:ConnectionString"] ?? throw (new Exception("Connectionstring not found"));
string clientId = builder.Configuration["Discord:ClientId"] ?? throw (new Exception("Client id not found"));
string clientSecret = builder.Configuration["Discord:ClientSecret"] ?? throw (new Exception("Client secret not found"));

string frontendUrl = isDevelopment
    ? "https://localhost:4200"
    : "https://quintessence-eu.com";

long adminId = 1152617541190041600;
long rosterId = 1137817925638684802;

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("IsAdmin", policy =>
        policy.RequireClaim("is_admin", "true"));

    options.AddPolicy("IsMainRoster", policy =>
        policy.RequireClaim("is_main_roster", "true"));
});

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
    options.ClientId = clientId ?? throw (new Exception("Client id not found"));
    options.ClientSecret = clientSecret ?? throw(new Exception("Client secret not found"));
    options.Scope.Add("identify");
    options.SaveTokens = true;

    options.Events.OnCreatingTicket = async context =>
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

        var userDal = context.HttpContext.RequestServices.GetRequiredService<IUserDAL>();

        if (!string.IsNullOrEmpty(discordId))
        {
            long userId = long.Parse(discordId);

            bool isAdmin = await userDal.UserHasRole(userId, adminId);
            bool isMainRoster = await userDal.UserHasRole(userId, rosterId);

            if (isAdmin)
            {
                user.AddClaim(new Claim("is_admin", "true"));
            }

            if (isMainRoster)
            {
                user.AddClaim(new Claim("is_main_roster", "true"));
            }
        }
    };

    options.Events.OnRemoteFailure = context =>
    {
        context.Response.Redirect(frontendUrl);
        context.HandleResponse(); 
        return Task.CompletedTask;
    };
});

builder.Services.AddSignalR();

// Add services to the container.
builder.Services.AddDbContext<QuintessenceDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<IUserDAL, UserDAL>();
builder.Services.AddScoped<UserContainer>();

builder.Services.AddScoped<IAutomationDAL, AutomationDAL>();
builder.Services.AddScoped<AutomationContainer>();

builder.Services.AddScoped<IUserDataDAL, UserDataDAL>();
builder.Services.AddScoped<UserDataContainer>();

builder.Services.AddScoped<IXPConfigDAL, XPConfigDAL>();
builder.Services.AddScoped<XPConfigContainer>();

builder.Services.AddScoped<IRolesDAL, RolesDAL>();
builder.Services.AddScoped<RolesContainer>();

builder.Services.AddScoped<IReactionRoleConfigDAL, ReactionRoleConfigDAL>();
builder.Services.AddScoped<ReactionRoleConfigContainer>();

builder.Services.AddScoped<ILevelVoiceConfigDAL, LevelToRoleVoiceDAL>();
builder.Services.AddScoped<LevelVoiceConfigContainer>();

builder.Services.AddScoped<ILevelMessageConfigDAL, LevelToRoleMessageDAL>();
builder.Services.AddScoped<LevelMessageConfigContainer>();

builder.Services.AddScoped<IEventSignupsDAL, EventSignupsDAL>();
builder.Services.AddScoped<EventSignupsContainer>();

builder.Services.AddScoped<IEventsDAL, EventsDAL>();
builder.Services.AddScoped<EventsContainer>();

builder.Services.AddScoped<IChannelsDAL, ChannelsDAL>();
builder.Services.AddScoped<ChannelsContainer>();

builder.Services.AddScoped<IEventChannelsDAL, EventChannelsDAL>();
builder.Services.AddScoped<EventChannelsContainer>();

builder.Services.AddScoped<IQuestionTypeDAL, QuestionTypeDAL>();
builder.Services.AddScoped<QuestionTypeContainer>();

builder.Services.AddScoped<IQuestionsDAL, QuestionsDAL>();
builder.Services.AddScoped<QuestionsContainer>();

builder.Services.AddScoped<IFormDAL, FormDAL>();
builder.Services.AddScoped<FormContainer>();

builder.Services.AddScoped<IAnswersDAL, AnswersDAL>();
builder.Services.AddScoped<AnswersContainer>();

builder.Services.AddScoped<IGamesDAL, GamesDAL>();
builder.Services.AddScoped<GamesContainer>();

builder.Services.AddScoped<IFormSubmissionsDAL, FormSubmissionsDAL>();
builder.Services.AddScoped<FormSubmissionsContainer>();

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

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

//Development Checklist
//The key items to check are:

//URLs(frontend and backend).
//Redirect and CORS settings.
//Cookie and security configurations.
//Logging and debugging cleanup.
//Sensitive data management.