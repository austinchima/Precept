using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class RefreshTokenService(PreceptDbContext dbContext, TimeProvider timeProvider, ILogger<RefreshTokenService> logger)
    : IRefreshTokenService
{
    public string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToBase64String(bytes);
    }

    public async Task<RefreshToken> CreateAsync(string userId, string rawToken, string? deviceInfo, bool rememberMe, int expiryDays)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = HashToken(rawToken),
            CreatedAt = now,
            ExpiresAt = now.AddDays(expiryDays),
            DeviceInfo = deviceInfo,
            RememberMe = rememberMe
        };

        dbContext.RefreshTokens.Add(token);
        await dbContext.SaveChangesAsync();
        logger.LogInformation("Refresh token created for user {UserId}", userId);
        return token;
    }

    public async Task<RefreshToken?> FindByTokenHashAsync(string tokenHash)
    {
        return await dbContext.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == tokenHash);
    }

    public async Task RevokeAsync(RefreshToken token, string? replacedByTokenHash = null)
    {
        token.RevokedAt = timeProvider.GetUtcNow().UtcDateTime;
        if (!string.IsNullOrEmpty(replacedByTokenHash))
        {
            token.ReplacedByToken = replacedByTokenHash;
        }

        await dbContext.SaveChangesAsync();
        logger.LogInformation("Refresh token {TokenId} revoked", token.Id);
    }

    public async Task RevokeAllForUserAsync(string userId)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var activeTokens = await dbContext.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync();

        foreach (var t in activeTokens)
        {
            t.RevokedAt = now;
        }

        await dbContext.SaveChangesAsync();
        logger.LogInformation("All refresh tokens revoked for user {UserId}", userId);
    }

    public async Task<bool> RevokeSessionByIdAsync(string userId, string sessionId)
    {
        if (!Guid.TryParse(sessionId, out var guid))
            return false;

        var token = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(t => t.Id == guid && t.UserId == userId && t.RevokedAt == null);

        if (token is null)
            return false;

        token.RevokedAt = timeProvider.GetUtcNow().UtcDateTime;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<SessionDto>> GetActiveSessionsAsync(string userId, string? currentRawToken = null)
    {
        var currentHash = string.IsNullOrEmpty(currentRawToken) ? null : HashToken(currentRawToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var activeTokens = await dbContext.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return activeTokens.Select(t => new SessionDto
        {
            Id = t.Id.ToString(),
            DeviceInfo = t.DeviceInfo ?? "Unknown Device",
            CreatedAt = t.CreatedAt,
            ExpiresAt = t.ExpiresAt,
            IsCurrent = currentHash != null && t.Token == currentHash
        }).ToList();
    }
}
