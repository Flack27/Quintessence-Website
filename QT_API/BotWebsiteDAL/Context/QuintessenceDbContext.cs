using Microsoft.EntityFrameworkCore;
using MiNET.Entities;
using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteDAL.Context
{
    public class QuintessenceDbContext : DbContext
    {
        public QuintessenceDbContext(DbContextOptions<QuintessenceDbContext> options) : base(options) { }

        // DbSets for all entities
        public DbSet<AutomatedChecksDTO> AutomatedChecks { get; set; }
        public DbSet<UserMessageActivitySummaryDTO> UserMessageActivitySummary { get; set; }
        public DbSet<UserVoiceActivitySummaryDTO> UserVoiceActivitySummary { get; set; }
        public DbSet<AnswersDTO> Answers { get; set; }
        public DbSet<ChannelsDTO> Channels { get; set; }
        public DbSet<EventsDTO> Events { get; set; }
        public DbSet<EventSignupsDTO> EventSignups { get; set; }
        public DbSet<FormDTO> Form { get; set; }
        public DbSet<LevelToRoleMessagesDTO> LevelToRoleMessage { get; set; }
        public DbSet<LevelToRoleVoiceDTO> LevelToRoleVoice { get; set; }
        public DbSet<QuestionsDTO> Questions { get; set; }
        public DbSet<QuestionDependencyDTO> QuestionDependency { get; set; }
        public DbSet<OptionsDTO> Options { get; set; }
        public DbSet<QuestionTypeDTO> QuestionType { get; set; }
        public DbSet<ReactionRoleConfigDTO> ReactionRoleConfig { get; set; }
        public DbSet<RolesDTO> Roles { get; set; }
        public DbSet<UserDataDTO> UserData { get; set; }
        public DbSet<UsersDTO> Users { get; set; }
        public DbSet<XPConfigDTO> XPConfigs { get; set; }
        public DbSet<FormSubmissionDTO> FormSubmission { get; set; }
        public DbSet<GamesDTO> Games { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            //Configure GamesDTO
            modelBuilder.Entity<GamesDTO>()
                .HasKey(r => r.GameId);

            // Configure AutomatedChecksDTO
            modelBuilder.Entity<AutomatedChecksDTO>()
                .HasKey(r => r.Id);

            // Configure AnswersDTO
            modelBuilder.Entity<AnswersDTO>()
                .HasKey(r => r.AnswerId);

            modelBuilder.Entity<AnswersDTO>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId);

            modelBuilder.Entity<AnswersDTO>()
                .HasOne(r => r.Question)
                .WithMany(a => a.Answers)
                .HasForeignKey(r => r.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);


            modelBuilder.Entity<UserVoiceActivitySummaryDTO>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.VoiceMinutes).HasPrecision(18, 2);
                entity.HasOne(d => d.User).WithOne()
                    .HasForeignKey<UserVoiceActivitySummaryDTO>(d => d.UserId);
            });
            modelBuilder.Entity<UserMessageActivitySummaryDTO>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(d => d.User).WithOne()
                    .HasForeignKey<UserMessageActivitySummaryDTO>(d => d.UserId);
            });

            // Configure ChannelsDTO
            modelBuilder.Entity<ChannelsDTO>()
                .HasKey(r => r.ChannelId);

            modelBuilder.Entity<ChannelsDTO>()
                .HasOne(r => r.Role)
                .WithMany()
                .HasForeignKey(r => r.RoleId);

            modelBuilder.Entity<ChannelsDTO>()
                .HasOne(r => r.Game)
                .WithMany()
                .HasForeignKey(r => r.GameId);

            // Configure EventsDTO
            modelBuilder.Entity<EventsDTO>()
                .HasKey(u => u.EventId);

            modelBuilder.Entity<EventsDTO>()
                .HasOne(r => r.Channel)
                .WithMany()
                .HasForeignKey(r => r.ChannelId);

            modelBuilder.Entity<EventsDTO>()
                .HasMany(r => r.Signups)
                .WithOne(r => r.Event)
                .HasForeignKey(r => r.EventId);

            // Configure EventSignupsDTO
            modelBuilder.Entity<EventSignupsDTO>()
                .HasKey(u => u.SignupId);

            // Configure FormDTO
            modelBuilder.Entity<FormDTO>()
                .HasKey(r => r.FormId);

            modelBuilder.Entity<FormDTO>()
                .Property(f => f.FormId)
                .ValueGeneratedOnAdd();


            // Configure LevelToRoleMessagesDTO
            modelBuilder.Entity<LevelToRoleMessagesDTO>()
                .HasKey(u => u.Level);

            modelBuilder.Entity<LevelToRoleMessagesDTO>()
                .HasOne(r => r.Role)
                .WithMany()
                .HasForeignKey(r => r.RoleId);

            // Configure LevelToRoleVoiceDTO
            modelBuilder.Entity<LevelToRoleVoiceDTO>()
                .HasKey(u => u.Level);

            modelBuilder.Entity<LevelToRoleVoiceDTO>()
                .HasOne(r => r.Role)
                .WithMany()
                .HasForeignKey(r => r.RoleId);

            // Configure QuestionsDTO
            modelBuilder.Entity<QuestionsDTO>()
                .HasKey(r => r.QuestionId);

            modelBuilder.Entity<QuestionsDTO>()
                .HasOne(r => r.Type)
                .WithMany()
                .HasForeignKey(r => r.TypeId);

            modelBuilder.Entity<QuestionsDTO>()
                .HasMany(r => r.Options)
                .WithOne()
                .HasForeignKey(r => r.QuestionId);

            modelBuilder.Entity<QuestionsDTO>()
                .HasOne(qd => qd.QuestionDependency)
                .WithOne(q => q.Question)
                .HasForeignKey<QuestionsDTO>(qd => qd.QuestionId);

            modelBuilder.Entity<QuestionsDTO>()
                .HasOne(qd => qd.Form)
                .WithMany(qd => qd.Questions)
                .HasForeignKey(r => r.FormId);

            // Configure QuestionDependencyDTO
            modelBuilder.Entity<QuestionDependencyDTO>()
                .HasKey(r => r.QuestionId);

            modelBuilder.Entity<QuestionDependencyDTO>()
                .HasOne(q => q.Question)
                .WithOne(qd => qd.QuestionDependency)
                .HasForeignKey<QuestionDependencyDTO>(qd => qd.QuestionId)
                .IsRequired(false);

            // Configure OptionsDTO
            modelBuilder.Entity<OptionsDTO>()
                .HasKey(r => r.OptionId);

            // Configure QuestionTypeDTO
            modelBuilder.Entity<QuestionTypeDTO>()
                .HasKey(r => r.TypeId);

            // Configure ReactionRoleConfigDTO
            modelBuilder.Entity<ReactionRoleConfigDTO>()
                .HasKey(r => r.ConfigId);

            modelBuilder.Entity<ReactionRoleConfigDTO>()
                .HasOne(r => r.VerificationRole)
                .WithMany()
                .HasForeignKey(r => r.VerificationRoleId);

            modelBuilder.Entity<ReactionRoleConfigDTO>()
                .HasOne(r => r.ModeratorRole)
                .WithMany()
                .HasForeignKey(r => r.ModeratorRoleId);

            modelBuilder.Entity<ReactionRoleConfigDTO>()
                .HasOne(r => r.OnlyOneChannel)
                .WithMany()
                .HasForeignKey(r => r.OnlyOneChannelId);

            // Configure RolesDTO
            modelBuilder.Entity<RolesDTO>()
                .HasKey(r => r.RoleId);

            // Configure UserDataDTO
            modelBuilder.Entity<UserDataDTO>()
                .HasKey(ud => ud.UserId);

            modelBuilder.Entity<UserDataDTO>()
                .Property(u => u.TotalVoiceTime)
                .HasColumnType("decimal(18,2)");

            // Configure UserDTO
            modelBuilder.Entity<UsersDTO>()
                .HasKey(u => u.UserId);

            modelBuilder.Entity<UsersDTO>()
                .HasMany(u => u.Roles)
                .WithMany(r => r.Users)
                .UsingEntity<Dictionary<string, object>>(
                    "UserRoles",
                    j => j
                        .HasOne<RolesDTO>()
                        .WithMany()
                        .HasForeignKey("RoleId"),
                    j => j
                        .HasOne<UsersDTO>()
                        .WithMany()
                        .HasForeignKey("UserId")
                );


            modelBuilder.Entity<EventSignupsDTO>()
                .HasOne(e => e.User)
                .WithMany(u => u.Signups)
                .HasForeignKey(e => e.UserId);

            modelBuilder.Entity<AnswersDTO>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId);

            modelBuilder.Entity<FormSubmissionDTO>()
                .HasOne(a => a.User)
                .WithMany(u => u.FormSubmissions)
                .HasForeignKey(a => a.UserId);

            modelBuilder.Entity<UserDataDTO>()
                .HasOne(ud => ud.User)
                .WithOne(u => u.UserData)
                .HasForeignKey<UserDataDTO>(ud => ud.UserId);

            //Configure XPConfigDTO
            modelBuilder.Entity<XPConfigDTO>()
                .HasKey(r => r.ConfigId);

            //Configure FormSubmissionDTO
            modelBuilder.Entity<FormSubmissionDTO>()
                .HasKey(r => r.SubmissionId);

            modelBuilder.Entity<FormSubmissionDTO>()
                .HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId);
        }
    }
}
