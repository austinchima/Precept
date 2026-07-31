using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

public interface IRefreshTokenService
{
    Task<RefreshToken> CreateAsync(string userId, string rawToken, string? deviceInfo, bool rememberMe, int expiryDays);
    Task<RefreshToken?> FindByTokenHashAsync(string tokenHash);
    Task RevokeAsync(RefreshToken token, string? replacedByTokenHash = null);
    Task RevokeAllForUserAsync(string userId);
    Task<bool> RevokeSessionByIdAsync(string userId, string sessionId);
    Task<List<SessionDto>> GetActiveSessionsAsync(string userId, string? currentRawToken = null);
    string HashToken(string rawToken);
}
