namespace Precept.Api.Services;

using System;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

public class ReviewScheduler(Random? random = null) : IReviewScheduler
{
    private readonly Random _random = random ?? Random.Shared;

    public ReviewOutcome Apply(ConfidenceLevel current, ReviewRating rating, DateTime utcNow)
    {
        var newLevel = rating switch
        {
            ReviewRating.BlankPanic => ConfidenceLevel.Panic,
            ReviewRating.Partial => current,
            ReviewRating.NailedIt => Promote(current),
            _ => throw new ArgumentOutOfRangeException(nameof(rating))
        };

        var baseIntervalDays = GetBaseIntervalDays(newLevel);
        
        var effectiveIntervalDays = rating == ReviewRating.Partial 
            ? Math.Max(1.0, baseIntervalDays / 2.0)
            : baseIntervalDays;

        var fuzzedIntervalDays = ApplyFuzz(effectiveIntervalDays);
        
        return new ReviewOutcome(newLevel, utcNow.AddDays(fuzzedIntervalDays));
    }

    private static ConfidenceLevel Promote(ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.Panic => ConfidenceLevel.Shaky,
            ConfidenceLevel.Shaky => ConfidenceLevel.Okay,
            ConfidenceLevel.Okay => ConfidenceLevel.Solid,
            ConfidenceLevel.Solid => ConfidenceLevel.CanTeach,
            ConfidenceLevel.CanTeach => ConfidenceLevel.CanTeach,
            _ => ConfidenceLevel.Panic
        };
    }

    public double GetBaseIntervalDays(ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.Panic => 1.0,
            ConfidenceLevel.Shaky => 2.0,
            ConfidenceLevel.Okay => 4.0,
            ConfidenceLevel.Solid => 9.0,
            ConfidenceLevel.CanTeach => 21.0,
            _ => 1.0
        };
    }

    private double ApplyFuzz(double intervalDays)
    {
        // fuzz of +/- 15%
        var factor = 0.85 + (_random.NextDouble() * 0.30); // 0.85 to 1.15
        return intervalDays * factor;
    }
}
