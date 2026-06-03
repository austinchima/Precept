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
    }
}