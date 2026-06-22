

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Provides the authenticated user id for the current HTTP request.
/// Injected as a scoped dependency so query filters have per-request identity.
/// </summary>
public interface ICurrentUser
{
    string? UserId { get; }
}
