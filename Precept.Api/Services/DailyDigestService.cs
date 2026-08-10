using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class DailyDigestService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DailyDigestService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    public DailyDigestService(IServiceProvider serviceProvider, ILogger<DailyDigestService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DailyDigestService is starting.");
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDigestsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing ProcessDigestsAsync.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task ProcessDigestsAsync(CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var currentHour = utcNow.Hour;
        var today = utcNow.Date;

        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PreceptDbContext>();
        var digestQueryService = scope.ServiceProvider.GetRequiredService<IDigestQueryService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var appUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";

        var usersToProcess = await dbContext.Users
            .Where(u => u.EmailDigestEnabled 
                     && u.DigestHourUtc == currentHour 
                     && (u.LastDigestSentAt == null || u.LastDigestSentAt < today))
            .ToListAsync(cancellationToken);

        if (usersToProcess.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Found {Count} users for daily digest at hour {Hour}.", usersToProcess.Count, currentHour);

        foreach (var user in usersToProcess)
        {
            try
            {
                var digest = await digestQueryService.GetDigestAsync(user.Id, utcNow);
                
                // Idempotency guard
                user.LastDigestSentAt = today;
                await dbContext.SaveChangesAsync(cancellationToken);

                if (digest == null)
                {
                    continue;
                }

                int totalReviews = digest.TechnicalReviewsDue + digest.BehavioralReviewsDue;
                int totalFollowUps = digest.FollowUpsDue.Count;

                var subjectParts = new List<string>();
                if (totalFollowUps > 0) subjectParts.Add($"{totalFollowUps} follow-ups");
                if (totalReviews > 0) subjectParts.Add($"{totalReviews} reviews due");
                
                var subject = $"Precept: {string.Join(", ", subjectParts)}";

                var textBody = $"Hi {user.FirstName},\n\nHere is your daily digest.\n\n";
                var htmlBody = $"<p>Hi {user.FirstName},</p><p>Here is your daily digest.</p>";

                if (totalFollowUps > 0)
                {
                    textBody += "FOLLOW-UPS OVERDUE:\n";
                    htmlBody += "<h3>Follow-ups Overdue</h3><ul>";
                    foreach (var f in digest.FollowUpsDue)
                    {
                        var overdueText = f.DaysOverdue == 0 ? "due today" : $"{f.DaysOverdue} days overdue";
                        textBody += $"- {f.CompanyName} ({f.RoleTitle}) - {overdueText}\n";
                        htmlBody += $"<li><strong>{f.CompanyName}</strong> ({f.RoleTitle}) - {overdueText}</li>";
                    }
                    textBody += "\n";
                    htmlBody += "</ul>";
                }

                if (totalReviews > 0)
                {
                    textBody += $"REVIEWS DUE: {digest.TechnicalReviewsDue} technical, {digest.BehavioralReviewsDue} behavioral.\n";
                    textBody += $"Drill them here: {appUrl}/story-bank/quiz\n\n";
                    
                    htmlBody += $"<h3>Reviews Due</h3><p>{digest.TechnicalReviewsDue} technical, {digest.BehavioralReviewsDue} behavioral.</p>";
                    htmlBody += $"<p><a href=\"{appUrl}/story-bank/quiz\">Start Review Quiz</a></p>";

                    if (digest.WeakestCategoryLevel.HasValue && !string.IsNullOrEmpty(digest.WeakestCategoryName))
                    {
                        var weakestText = $"Your {digest.WeakestCategoryName} stories average {digest.WeakestCategoryLevel} — worth a drill.";
                        textBody += $"{weakestText}\n\n";
                        htmlBody += $"<p><em>{weakestText}</em></p>";
                    }
                }

                textBody += $"Manage your email preferences here: {appUrl}/settings\n";
                htmlBody += $"<p><small><a href=\"{appUrl}/settings\">Unsubscribe or manage preferences</a></small></p>";

                await emailService.SendEmailAsync(user.Email!, subject, textBody, htmlBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process daily digest for User ID {UserId}", user.Id);
            }
        }
    }
}
