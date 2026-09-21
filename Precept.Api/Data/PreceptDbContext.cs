using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Data
{
    public class PreceptDbContext(DbContextOptions<PreceptDbContext> options, ICurrentUser currentUser)
        : IdentityDbContext<ApplicationUser>(options)
    {
        // Resolved lazily per query from the scoped ICurrentUser — NOT captured in a
        // constructor field initializer. With Identity cookie auth, the security-stamp
        // validator constructs this DbContext inside the authentication handler (via
        // UserManager's EF store) BEFORE HttpContext.User is populated, so a
        // constructor-captured value would be permanently null for the whole request
        // and every tenant filter would compile to WHERE FALSE.
        // EF Core detects a reference to a context-instance member in a query filter
        // lambda and turns it into a per-query parameter — so the compiled model stays
        // cached and shared while each query evaluates the current user's value.
        // IMPORTANT: do NOT copy CurrentUserId to a local and close over that local;
        // doing so bakes the value into the cached model and every user gets the first
        // caller's filter.
        private string? CurrentUserId => currentUser.UserId;

        public DbSet<Story> Stories { get; set; } = null!;
        public DbSet<BehavioralStory> BehavioralStories { get; set; } = null!;
        public DbSet<JobDescription> JobDescriptions { get; set; } = null!;
        public DbSet<Application> Applications { get; set; } = null!;
        public DbSet<ApplicationEvent> ApplicationEvents { get; set; } = null!;
        public DbSet<Skill> Skills { get; set; } = null!;
        public DbSet<Testimonial> Testimonials { get; set; } = null!;

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
                .HasQueryFilter(a => !a.IsDeleted && a.UserId == CurrentUserId);

            // ApplicationEvent has a required FK to Application (which is filtered).
            // Filtering the dependent through the navigation silences EF's
            // RequiredNavigationWithQueryFilterInteractionWarning and keeps events
            // correctly scoped when queried directly.
            builder.Entity<ApplicationEvent>()
                .HasQueryFilter(e => !e.Application!.IsDeleted && e.Application!.UserId == CurrentUserId);

            builder.Entity<Story>()
                .HasQueryFilter(s => !s.IsDeleted && s.UserId == CurrentUserId);

            builder.Entity<BehavioralStory>()
                .HasQueryFilter(b => b.UserId == CurrentUserId);

            builder.Entity<JobDescription>()
                .HasQueryFilter(j => j.UserId == CurrentUserId);

            builder.Entity<Skill>()
                .HasQueryFilter(s => s.UserId == CurrentUserId);

            builder.Entity<Testimonial>()
                .HasQueryFilter(t => t.UserId == CurrentUserId);

            // ─────────────────────────────────────────────────────────
            //  Default SQL values
            // ─────────────────────────────────────────────────────────
            builder.Entity<Story>(entity => 
            {
                entity.Property(s => s.CreatedAt).HasDefaultValueSql("NOW()");
                entity.Property(s => s.UpdatedAt).HasDefaultValueSql("NOW()");
                entity.HasIndex(s => new { s.UserId, s.NextReviewAt });
            });
            builder.Entity<Application>()
                .Property(a => a.FollowUpDate).HasDefaultValueSql("NOW() + INTERVAL '7 days'");
            builder.Entity<ApplicationUser>()
                .Property(u => u.CreatedAt).HasDefaultValueSql("NOW()");

            // ─────────────────────────────────────────────────────────
            //  Relationship configuration (unchanged)
            // ─────────────────────────────────────────────────────────

            builder.Entity<Skill>(entity =>
            {
                // Cascade delete: when a user is deleted, remove all their skills
                entity.HasOne(s => s.User)
                    .WithMany(u => u.Skills)
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
