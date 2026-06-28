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
    /// [Pillar II - Optimistic Concurrency]: Annotated with [ConcurrencyCheck] so EF Core appends
    /// 'WHERE RevokedAt IS NULL' during updates. If two concurrent requests hit the database at the exact
    /// same millisecond racing to rotate this token, the second update affects 0 rows and throws
    /// DbUpdateConcurrencyException, preventing dead-heat phantom session creation.
    /// </summary>
    [ConcurrencyCheck]
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// SHA-256 hash of the token that replaced this one during rotation.
    /// [Pillar I - Lineage Guard]: Acts as a family pointer (A -> B -> C).
    /// When a revoked token is presented during refresh, we verify if it is the immediate parent
    /// of the active token. If direct parent + within 10s grace window, it is a benign concurrent retry.
    /// If an older ancestor (e.g. token A replayed when C is active), it is flagged as a replay attack
    /// triggering immediate family-wide cascade revocation.
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
