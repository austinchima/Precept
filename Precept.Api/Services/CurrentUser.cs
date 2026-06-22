using System.Security.Claims;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Reads the authenticated user id from the current HTTP request's claims principal.
///
/// Claim mapping note: TokenService writes JwtRegisteredClaimNames.Sub ("sub").
/// The default JwtBearer handler maps "sub" → ClaimTypes.NameIdentifier automatically
/// because MapInboundClaims is not disabled anywhere in Program.cs.
/// If MapInboundClaims = false were ever added, this must change to FindFirstValue("sub").
/// </summary>
public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId =>
        accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
}
