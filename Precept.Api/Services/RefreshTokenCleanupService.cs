using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;

namespace Precept.Api.Services;

public class RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<PreceptDbContext>();

                var now = DateTime.UtcNow;
                var deletedCount = await dbContext.RefreshTokens
                    .Where(t => t.ExpiresAt < now || t.RevokedAt != null)
                    .ExecuteDeleteAsync(stoppingToken);

                if (deletedCount > 0)
                {
                    logger.LogInformation("Refresh token cleanup: removed {Count} expired/revoked tokens.", deletedCount);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error occurred during refresh token cleanup execution.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
