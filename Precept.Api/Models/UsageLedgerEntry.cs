using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Precept.Api.Models
{
    /// <summary>
    /// One row per LLM call attempt, written by the metered client whether the call
    /// succeeded or failed. Limits and the global budget are computed from these rows.
    /// </summary>
    public class UsageLedgerEntry
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public ApplicationUser? User { get; set; }

        [Required, MaxLength(64)]
        public string Feature { get; set; } = string.Empty;

        public int Units { get; set; } = 1;

        public int InputTokens { get; set; }

        public int OutputTokens { get; set; }

        /// <summary>True when the provider did not report usage and the counts are a character-based estimate.</summary>
        public bool TokensEstimated { get; set; }

        /// <summary>Null when the model has no entry in the configured price table.</summary>
        [Column(TypeName = "numeric(12,6)")]
        public decimal? EstimatedCostUsd { get; set; }

        [MaxLength(64)]
        public string Provider { get; set; } = string.Empty;

        [MaxLength(128)]
        public string Model { get; set; } = string.Empty;

        [MaxLength(64)]
        public string PromptVersion { get; set; } = string.Empty;

        public bool Succeeded { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
