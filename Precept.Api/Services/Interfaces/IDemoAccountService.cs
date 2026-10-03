using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

public interface IDemoAccountService
{
    /// <summary>
    /// Creates a new, seeded demo account that belongs to one visitor and expires automatically.
    /// </summary>
    Task<ApplicationUser> CreateDemoUserAsync();

    /// <summary>
    /// Returns true when the user is a demo account.
    /// </summary>
    Task<bool> IsDemoUserAsync(string userId);

    /// <summary>
    /// Deletes demo accounts whose expiry is at or before <paramref name="utcNow"/>, with all their data.
    /// Returns the number of accounts deleted.
    /// </summary>
    Task<int> DeleteExpiredAsync(DateTime utcNow, CancellationToken cancellationToken = default);
}
