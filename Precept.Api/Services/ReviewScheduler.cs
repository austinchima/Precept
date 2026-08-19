namespace Precept.Api.Services;

using System;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.SpacedRepetition;

/// <summary>
/// Spaced Repetition Review Scheduler utilizing the SuperMemo-2 (SM-2) engine.
/// Provides full backward compatibility with legacy 3-tier reviews while enabling
/// item-level Ease Factor compounding and repetition streak tracking.
/// </summary>
public class ReviewScheduler(ISpacedRepetitionAlgorithm? algorithm = null, Random? random = null) : IReviewScheduler
{
    private readonly ISpacedRepetitionAlgorithm _algorithm = algorithm ?? new Sm2Algorithm(random);
    private readonly Random _random = random ?? Random.Shared;

    /// <summary>
    /// Legacy interface method for backward-compatibility.
    /// </summary>
    public ReviewOutcome Apply(ConfidenceLevel current, ReviewRating rating, DateTime utcNow)
    {
        var quality = RatingToQualityGrade(rating);
        var initialRepetitions = LevelToDefaultRepetitions(current);
        var initialInterval = GetBaseIntervalDays(current);

        var item = new SpacedRepetitionItem(
            Repetitions: initialRepetitions,
            EaseFactor: Sm2Algorithm.DefaultEaseFactor,
            IntervalDays: initialInterval,
            ConfidenceLevel: current,
            LastReviewedAtUtc: utcNow,
            NextReviewAtUtc: null
        );

        var schedule = _algorithm.CalculateNext(item, quality, utcNow);
        return new ReviewOutcome(schedule.NewConfidenceLevel, schedule.NextReviewAtUtc);
    }

    /// <summary>
    /// Full SM-2 state transition using a 3-tier user review rating.
    /// </summary>
    public SpacedRepetitionSchedule Apply(SpacedRepetitionItem item, ReviewRating rating, DateTime utcNow)
    {
        var quality = RatingToQualityGrade(rating);
        return _algorithm.CalculateNext(item, quality, utcNow);
    }

    /// <summary>
    /// Full SM-2 state transition using standard SuperMemo-2 quality grade (0 to 5).
    /// </summary>
    public SpacedRepetitionSchedule Apply(SpacedRepetitionItem item, int qualityGrade, DateTime utcNow)
    {
        return _algorithm.CalculateNext(item, qualityGrade, utcNow);
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

    private static int RatingToQualityGrade(ReviewRating rating)
    {
        return rating switch
        {
            ReviewRating.NailedIt => 5,
            ReviewRating.Partial => 3,
            ReviewRating.BlankPanic => 1,
            _ => 3
        };
    }

    private static int LevelToDefaultRepetitions(ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.Panic => 0,
            ConfidenceLevel.Shaky => 1,
            ConfidenceLevel.Okay => 2,
            ConfidenceLevel.Solid => 3,
            ConfidenceLevel.CanTeach => 4,
            _ => 0
        };
    }
}
