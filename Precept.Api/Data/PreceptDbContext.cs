using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Data
{
    public class PreceptDbContext : IdentityDbContext<ApplicationUser>
    {
        // Captured at construction time from the scoped ICurrentUser.
        // EF Core detects a reference to a context-instance field in a query filter lambda
        // and turns it into a per-query parameter — so the compiled model stays cached and
        // shared while each query gets the correct user's value.
        // IMPORTANT: do NOT copy _currentUserId to a local and close over that local;
        // doing so bakes the value into the cached model and every user gets the first
        // caller's filter.
        private readonly string? _currentUserId;

        public PreceptDbContext(DbContextOptions<PreceptDbContext> options, ICurrentUser currentUser)
            : base(options)
        {
            _currentUserId = currentUser.UserId;
        }

        public DbSet<Story> Stories { get; set; } = null!;
        public DbSet<BehavioralStory> BehavioralStories { get; set; } = null!;
        public DbSet<JobDescription> JobDescriptions { get; set; } = null!;
        public DbSet<Application> Applications { get; set; } = null!;
        public DbSet<ApplicationEvent> ApplicationEvents { get; set; } = null!;
        public DbSet<Skill> Skills { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // IdentityDbContext configuration must run first
            base.OnModelCreating(builder);

            // ─────────────────────────────────────────────────────────
            //  Global query filters — per-user ownership scoping
            // ─────────────────────────────────────────────────────────
            //
            // These filters are a defence-in-depth backstop. Service-layer WHERE clauses
            // remain in place. If a future endpoint forgets to scope by user, the filter
            // catches it. Bypass with .IgnoreQueryFilters() only for legitimate system queries.
            //
            // Identity tables (AspNetUsers etc.) are NOT filtered — email lookups during
            // login run before any principal exists, so filtering those tables breaks auth.

            builder.Entity<Application>()
                .HasQueryFilter(a => a.UserId == _currentUserId);

            // ApplicationEvent has a required FK to Application (which is filtered).
            // Filtering the dependent through the navigation silences EF's
            // RequiredNavigationWithQueryFilterInteractionWarning and keeps events
            // correctly scoped when queried directly.
            builder.Entity<ApplicationEvent>()
                .HasQueryFilter(e => e.Application!.UserId == _currentUserId);

            builder.Entity<Story>()
                .HasQueryFilter(s => s.UserId == _currentUserId);

            // ─────────────────────────────────────────────────────────
            //  Relationship configuration (unchanged)
            // ─────────────────────────────────────────────────────────

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