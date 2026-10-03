namespace Precept.Api.DTOs;

/// <summary>
/// Configuration for ephemeral per-visitor demo accounts.
/// </summary>
public class DemoSettings
{
    public const string SectionName = "Demo";

    /// <summary>
    /// How long a demo account lives before the cleanup job deletes it.
    /// </summary>
    public int LifetimeHours { get; set; } = 24;

    /// <summary>
    /// Maximum demo accounts one client IP may create per hour.
    /// </summary>
    public int MaxCreationsPerIpPerHour { get; set; } = 5;

    /// <summary>
    /// How often the cleanup job looks for expired demo accounts.
    /// </summary>
    public int CleanupIntervalMinutes { get; set; } = 60;
}
