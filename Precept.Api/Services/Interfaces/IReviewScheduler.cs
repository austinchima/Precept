namespace Precept.Api.Services.Interfaces;

using System;
using Precept.Api.Models;

public enum ReviewRating 
{ 
    NailedIt, 
    Partial, 
    BlankPanic 
}

public record ReviewOutcome(ConfidenceLevel NewLevel, DateTime NextReviewAtUtc);

public interface IReviewScheduler
{
    /// <summary>
    /// Legacy interface method for backward-compatibility.
    /// </summary>
    ReviewOutcome Apply(ConfidenceLevel current, ReviewRating rating, DateTime utcNow);

    /// <summary>
    /// Full SM-2 state transition using a simplified 3-tier user review rating.
    /// </summary>
    SpacedRepetitionSchedule Apply(SpacedRepetitionItem item, ReviewRating rating, DateTime utcNow);

    /// <summary>
    /// Full SM-2 state transition using standard SuperMemo-2 quality grade (0 to 5).
    /// </summary>
    SpacedRepetitionSchedule Apply(SpacedRepetitionItem item, int qualityGrade, DateTime utcNow);

    double GetBaseIntervalDays(ConfidenceLevel level);
}
