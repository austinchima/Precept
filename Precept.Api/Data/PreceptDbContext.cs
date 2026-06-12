using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Models;

namespace Precept.Api.Data
{
    public class PreceptDbContext(DbContextOptions<PreceptDbContext> options) : IdentityDbContext<ApplicationUser>(options)
    {
        public DbSet<Story> Stories { get; set; } = null!;

        public DbSet<JobDescription> JobDescriptions { get; set; } = null!;

        public DbSet<Application> Applications { get; set; } = null!;

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
        }
    }
}