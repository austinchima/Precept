using System.Security.Claims;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Reads the authenticated user id from the current HTTP request's claims principal.
///
/// Claim mapping note: the Identity application-cookie handler issues the
/// user id as ClaimTypes.NameIdentifier (the Identity default), which is the
/// claim read below.
/// </summary>
public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId =>
        accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
}
