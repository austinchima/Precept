using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Creates and expires per-visitor demo accounts. Each visitor gets an isolated tenant
/// with no password, seeded with sample data, so demo visitors cannot affect each other.
/// </summary>
public class DemoAccountService(
    UserManager<ApplicationUser> userManager,
    PreceptDbContext dbContext,
    IStoryService storyService,
    IBehavioralStoryService behavioralStoryService,
    IOptions<DemoSettings> settings,
    ILogger<DemoAccountService> logger) : IDemoAccountService
{
    public async Task<ApplicationUser> CreateDemoUserAsync()
    {
        var utcNow = DateTime.UtcNow;
        var email = $"demo-{Guid.NewGuid():N}@demo.invalid";

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = "Demo",
            LastName = "Visitor",
            EmailConfirmed = true,
            EmailDigestEnabled = false,
            CreatedAt = utcNow,
            IsDemo = true,
            DemoExpiresAt = utcNow.AddHours(settings.Value.LifetimeHours)
        };

        // No password: a demo account can only be entered through the demo-login cookie.
        var createResult = await userManager.CreateAsync(user);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException(
                "Demo account creation failed: " + string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        await storyService.SeedExampleStoriesAsync(user.Id);
        await behavioralStoryService.SeedExampleStoriesAsync(user.Id);
        await SeedSampleApplicationsAsync(user.Id, utcNow);

        return user;
    }

    public Task<bool> IsDemoUserAsync(string userId) =>
        dbContext.Users.AsNoTracking().AnyAsync(u => u.Id == userId && u.IsDemo);

    public async Task<int> DeleteExpiredAsync(DateTime utcNow, int maxAccounts = 500, CancellationToken cancellationToken = default)
    {
        var expired = await dbContext.Users
            .Where(u => u.IsDemo && u.DemoExpiresAt != null && u.DemoExpiresAt <= utcNow)
            .OrderBy(u => u.DemoExpiresAt)
            .Take(maxAccounts)
            .ToListAsync(cancellationToken);

        var deleted = 0;
        foreach (var user in expired)
        {
            // Stories, applications and other owned rows are removed by the database's cascade rules.
            var result = await userManager.DeleteAsync(user);
            if (result.Succeeded)
            {
                deleted++;
            }
            else
            {
                logger.DemoAccountDeletionFailed(user.Id);
            }
        }

        return deleted;
    }

    private async Task SeedSampleApplicationsAsync(string userId, DateTime utcNow)
    {
        dbContext.Applications.AddRange(
            new Application
            {
                UserId = userId,
                CompanyName = "Stripe",
                RoleTitle = "Staff Systems Engineer",
                Location = "San Francisco, CA (Hybrid)",
                SalaryRange = "$240k - $310k",
                Status = ApplicationStatus.Interviewing,
                DateApplied = utcNow.AddDays(-12),
                FollowUpDate = utcNow.AddDays(2),
                ResumeVersion = "v4.2-Infrastructure",
                Notes = "Completed technical screen with bar raiser. Final round loop scheduled for Thursday.",
                IsRemote = false,
                Source = "Referral"
            },
            new Application
            {
                UserId = userId,
                CompanyName = "Vercel",
                RoleTitle = "Senior Frontend Architect",
                Location = "Remote (US)",
                SalaryRange = "$210k - $270k",
                Status = ApplicationStatus.PhoneScreen,
                DateApplied = utcNow.AddDays(-5),
                FollowUpDate = utcNow.AddDays(1),
                ResumeVersion = "v4.1-Frontend",
                Notes = "Recruiter chat about Next.js performance and design system architecture.",
                IsRemote = true,
                Source = "LinkedIn"
            },
            new Application
            {
                UserId = userId,
                CompanyName = "Datadog",
                RoleTitle = "Senior Software Engineer",
                Location = "New York, NY (Remote)",
                SalaryRange = "$195k - $250k",
                Status = ApplicationStatus.Offer,
                DateApplied = utcNow.AddDays(-28),
                FollowUpDate = utcNow.AddDays(-2),
                ResumeVersion = "v3.9",
                Notes = "Offer letter received ($220k base + $80k equity). Negotiating start date.",
                IsRemote = true,
                Source = "Company Site"
            });

        await dbContext.SaveChangesAsync();
    }
}

public static partial class DemoAccountServiceLoggerExtensions
{
    // Warning, not Error: another instance may already have deleted the same account.
    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to delete expired demo account {UserId}")]
    public static partial void DemoAccountDeletionFailed(this ILogger logger, string userId);
}
