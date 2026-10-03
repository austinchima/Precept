using Microsoft.Extensions.Options;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Periodically deletes expired demo accounts and all of their data.
/// </summary>
public class DemoCleanupService(
    IServiceProvider serviceProvider,
    IOptions<DemoSettings> settings,
    ILogger<DemoCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var demoAccounts = scope.ServiceProvider.GetRequiredService<IDemoAccountService>();
                var deleted = await demoAccounts.DeleteExpiredAsync(DateTime.UtcNow, cancellationToken: stoppingToken);
                if (deleted > 0)
                {
                    logger.LogInformation("Deleted {Count} expired demo accounts.", deleted);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred deleting expired demo accounts.");
            }

            await Task.Delay(TimeSpan.FromMinutes(settings.Value.CleanupIntervalMinutes), stoppingToken);
        }
    }
}
