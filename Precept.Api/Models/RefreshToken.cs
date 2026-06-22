using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Precept.Api.Models;

/// <summary>
/// Represents a hashed refresh token stored in the database.
/// Only the SHA-256 hash is persisted — the raw token is never stored.
/// </summary>
public class RefreshToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// SHA-256 hash of the actual refresh token value.
    /// Used for lookup during the refresh flow.
    /// </summary>
    [Required]
    [MaxLength(128)]
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Foreign key to the user who owns this token.
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// When this token was revoked (null if still active).
    /// </summary>
    [ConcurrencyCheck]
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Hash of the token that replaced this one during rotation.
    /// Used for reuse detection: if a revoked token with a replacement
    /// is presented again, the entire token family is compromised.
    /// </summary>
    [MaxLength(128)]
    public string? ReplacedByToken { get; set; }

    /// <summary>
    /// User-Agent or device fingerprint for session auditing.
    /// </summary>
    [MaxLength(512)]
    public string? DeviceInfo { get; set; }

    [NotMapped]
    public bool IsRevoked => RevokedAt != null;

    [NotMapped]
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

    [NotMapped]
    public bool IsActive => !IsRevoked && !IsExpired;

    public bool RememberMe { get; set; } = true;
}
