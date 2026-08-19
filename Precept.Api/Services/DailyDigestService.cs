using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class DailyDigestService(IServiceProvider serviceProvider, ILogger<DailyDigestService> logger)
    : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("DailyDigestService is starting.");
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
                logger.LogError(ex, "Error occurred executing ProcessDigestsAsync.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task ProcessDigestsAsync(CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var currentHour = utcNow.Hour;
        var today = utcNow.Date;

        using var scope = serviceProvider.CreateScope();
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

        logger.LogInformation("Found {Count} users for daily digest at hour {Hour}.", usersToProcess.Count, currentHour);

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

                var textBody = $"Hi {user.FirstName},\n\nHere is your daily interview prep digest.\n\n";
                
                var followUpsHtml = "";
                if (totalFollowUps > 0)
                {
                    textBody += "FOLLOW-UPS OVERDUE:\n";
                    var itemsHtml = "";
                    foreach (var f in digest.FollowUpsDue)
                    {
                        var overdueText = f.DaysOverdue == 0 ? "due today" : $"{f.DaysOverdue} days overdue";
                        textBody += $"- {f.CompanyName} ({f.RoleTitle}) - {overdueText}\n";
                        itemsHtml += $"<li style=\"margin-bottom: 6px;\"><strong>{f.CompanyName}</strong> &mdash; {f.RoleTitle} <span style=\"color: #f43f5e; font-weight: 600;\">({overdueText})</span></li>";
                    }
                    textBody += "\n";
                    followUpsHtml = $@"
                        <div style=""background: #fff1f2; border: 1px solid #ffe4e6; border-left: 4px solid #f43f5e; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;"">
                            <h3 style=""margin: 0 0 10px 0; color: #9f1239; font-size: 15px;"">📬 Follow-ups Requiring Attention</h3>
                            <ul style=""margin: 0; padding-left: 20px; color: #374151; font-size: 14px;"">{itemsHtml}</ul>
                        </div>";
                }

                var reviewsHtml = "";
                if (totalReviews > 0)
                {
                    textBody += $"REVIEWS DUE: {digest.TechnicalReviewsDue} technical, {digest.BehavioralReviewsDue} behavioral.\n";
                    textBody += $"Drill them here: {appUrl}/story-bank/quiz\n\n";

                    var weakestHtml = "";
                    if (digest.WeakestCategoryLevel.HasValue && !string.IsNullOrEmpty(digest.WeakestCategoryName))
                    {
                        var weakestText = $"Your {digest.WeakestCategoryName} stories average {digest.WeakestCategoryLevel} — worth a drill.";
                        textBody += $"{weakestText}\n\n";
                        weakestHtml = $"<p style=\"margin: 10px 0 0 0; color: #6b7280; font-size: 13px; font-style: italic;\">{weakestText}</p>";
                    }

                    reviewsHtml = $@"
                        <div style=""background: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #0d9488; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;"">
                            <h3 style=""margin: 0 0 6px 0; color: #115e59; font-size: 15px;"">🎯 Spaced Repetition Drills Due</h3>
                            <p style=""margin: 0; color: #374151; font-size: 14px;"">You have <strong>{digest.TechnicalReviewsDue} technical</strong> and <strong>{digest.BehavioralReviewsDue} behavioral</strong> drills due today.</p>
                            {weakestHtml}
                        </div>";
                }

                textBody += $"Manage your email preferences: {appUrl}/settings\n";

                var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{subject}</title>
</head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;"">
  <table align=""center"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);"">
    <tr>
      <td style=""background-color: #02050a; padding: 24px 32px; border-bottom: 2px solid #2dd4bf;"">
        <h1 style=""margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em;"">Precept <span style=""color: #2dd4bf; font-weight: 400; font-size: 14px; font-family: monospace;"">Career OS</span></h1>
      </td>
    </tr>
    <tr>
      <td style=""padding: 32px;"">
        <h2 style=""margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #0f172a;"">Good morning, {user.FirstName}! 👋</h2>
        <p style=""margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #475569;"">Here is your daily interview readiness summary and action items.</p>
        
        {followUpsHtml}
        {reviewsHtml}

        <div style=""text-align: center; margin: 32px 0 16px 0;"">
          <a href=""{appUrl}/story-bank/quiz"" style=""display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"">Start Today's Drill &rarr;</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style=""background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;"">
        <p style=""margin: 0 0 6px 0;"">You received this because Daily Digest is enabled on your Precept account.</p>
        <a href=""{appUrl}/settings"" style=""color: #64748b; text-decoration: underline;"">Manage Preferences or Unsubscribe</a>
      </td>
    </tr>
  </table>
</body>
</html>";

                await emailService.SendEmailAsync(user.Email!, subject, textBody, htmlBody);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process daily digest for User ID {UserId}", user.Id);
            }
        }
    }
}
