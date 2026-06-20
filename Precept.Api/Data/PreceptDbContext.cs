using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Models;

namespace Precept.Api.Data
{
    public class PreceptDbContext(DbContextOptions<PreceptDbContext> options) : IdentityDbContext<ApplicationUser>(options)
    {
        public DbSet<Story> Stories { get; set; } = null!;
        public DbSet<BehavioralStory> BehavioralStories { get; set; } = null!;

        public DbSet<JobDescription> JobDescriptions { get; set; } = null!;

        public DbSet<Application> Applications { get; set; } = null!;

        public DbSet<ApplicationEvent> ApplicationEvents { get; set; } = null!;

        public DbSet<Skill> Skills { get; set; } = null!;

        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<RefreshToken>(entity =>
            {
                // Index on the hashed token for fast lookups during refresh
                entity.HasIndex(rt => rt.Token);

                // Index on UserId for bulk revocation queries
                entity.HasIndex(rt => rt.UserId);

                // Cascade delete: when a user is deleted, remove all their refresh tokens
                entity.HasOne(rt => rt.User)
                    .WithMany()
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Skill>(entity =>
            {
                // Cascade delete: when a user is deleted, remove all their skills
                entity.HasOne(s => s.User)
                    .WithMany(u => u.Skills)
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<BehavioralStory>(entity =>
            {
                // Cascade delete: when a user is deleted, remove all their behavioral stories
                entity.HasOne(bs => bs.User)
                    .WithMany(u => u.BehavioralStories)
                    .HasForeignKey(bs => bs.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Application>(entity =>
            {
                // SetNull: when a JobDescription is deleted, null out the FK on Application
                // rather than deleting the application itself (it may still be relevant)
                entity.HasOne(a => a.JobDescription)
                    .WithMany(jd => jd.Applications)
                    .HasForeignKey(a => a.JobDescriptionId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            builder.Entity<ApplicationEvent>(entity =>
            {
                // Cascade delete: when an application is deleted, delete its events
                entity.HasOne(ae => ae.Application)
                    .WithMany(a => a.Events)
                    .HasForeignKey(ae => ae.ApplicationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}