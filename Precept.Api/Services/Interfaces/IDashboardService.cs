using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Interface defining operations for retrieving dashboard statistics.
/// </summary>
public interface IDashboardService
{
    Task<DashboardStatsResponse> GetDashboardStatsAsync(string userId);
}
