namespace Precept.Api.Services.SpacedRepetition;

using System;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

/// <summary>
/// Production implementation of the SuperMemo-2 (SM-2) Spaced Repetition Algorithm.
/// 
/// Mathematical Specification:
/// 1. Quality Grade (q): Integer from 0 (complete failure/blackout) to 5 (flawless recall).
/// 2. Ease Factor (EF): Initialized at 2.5, clamped to a floor of 1.3.
///    EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
/// 3. Repetition count (n) and Interval (I in days):
///    - If q < 3 (failure): n' = 0, I' = 1
///    - If q >= 3 (success):
///        - n = 0 => n' = 1, I' = 1
///        - n = 1 => n' = 2, I' = 6
///        - n >= 2 => n' = n + 1, I' = round(I * EF')
/// 4. Confidence level is mapped from the updated repetition streak and compounding interval.
/// </summary>
public class Sm2Algorithm(Random? random = null) : ISpacedRepetitionAlgorithm
{
    public SpacedRepetitionAlgorithmType AlgorithmType => SpacedRepetitionAlgorithmType.Sm2;
    private readonly Random _random = random ?? Random.Shared;

    public const double DefaultEaseFactor = 2.5;
    public const double MinimumEaseFactor = 1.3;

    public SpacedRepetitionSchedule CalculateNext(SpacedRepetitionItem item, int qualityGrade, DateTime utcNow)
    {
        // Clamp quality grade between 0 and 5
        var q = Math.Clamp(qualityGrade, 0, 5);

        // Normalize existing item state
        var currentEf = item.EaseFactor < MinimumEaseFactor ? DefaultEaseFactor : item.EaseFactor;
        var currentRepetitions = Math.Max(0, item.Repetitions);
        var currentInterval = item.IntervalDays <= 0 ? 1.0 : item.IntervalDays;

        // 1. Calculate new Ease Factor (EF')
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        var efDelta = 0.1 - ((5 - q) * (0.08 + ((5 - q) * 0.02)));
        var newEf = Math.Max(MinimumEaseFactor, Math.Round(currentEf + efDelta, 4));

        int newRepetitions;
        double newInterval;

        // 2. Calculate new repetitions and interval
        if (q < 3)
        {
            // Failed recall (lapse): reset repetitions streak to 0, schedule 1-day interval
            newRepetitions = 0;
            newInterval = 1.0;
        }
        else
        {
            // Successful recall
            if (currentRepetitions == 0)
            {
                newRepetitions = 1;
                newInterval = 1.0;
            }
            else if (currentRepetitions == 1)
            {
                newRepetitions = 2;
                newInterval = 6.0;
            }
            else
            {
                newRepetitions = currentRepetitions + 1;
                newInterval = Math.Max(1.0, Math.Round(currentInterval * newEf));
            }
        }

        // 3. Map to human-readable Confidence Level
        var newConfidenceLevel = MapConfidenceLevel(q, newRepetitions, newInterval, item.ConfidenceLevel);

        // 4. Apply anti-bunching fuzz (+/- 10%) on intervals > 2 days to prevent review clumping
        var scheduledInterval = ApplyAntiClumpingFuzz(newInterval);
        var nextReviewAtUtc = utcNow.AddDays(scheduledInterval);

        return new SpacedRepetitionSchedule(
            NewRepetitions: newRepetitions,
            NewEaseFactor: newEf,
            NewIntervalDays: newInterval,
            NewConfidenceLevel: newConfidenceLevel,
            NextReviewAtUtc: nextReviewAtUtc,
            AlgorithmUsed: SpacedRepetitionAlgorithmType.Sm2
        );
    }

    private static ConfidenceLevel MapConfidenceLevel(int qualityGrade, int repetitions, double intervalDays, ConfidenceLevel previousLevel)
    {
        if (qualityGrade <= 1 || repetitions == 0)
        {
            return ConfidenceLevel.Panic;
        }

        // For partial recall (grade 3), maintain current level
        if (qualityGrade == 3)
        {
            return previousLevel == ConfidenceLevel.Panic ? ConfidenceLevel.Shaky : previousLevel;
        }

        // For strong recall (grade >= 4), promote confidence level along the mastery ladder
        return previousLevel switch
        {
            ConfidenceLevel.Panic => ConfidenceLevel.Shaky,
            ConfidenceLevel.Shaky => ConfidenceLevel.Okay,
            ConfidenceLevel.Okay => ConfidenceLevel.Solid,
            ConfidenceLevel.Solid => ConfidenceLevel.CanTeach,
            ConfidenceLevel.CanTeach => ConfidenceLevel.CanTeach,
            _ => ConfidenceLevel.Okay
        };
    }

    private double ApplyAntiClumpingFuzz(double intervalDays)
    {
        if (intervalDays <= 2.0)
        {
            return intervalDays;
        }

        // Apply +/- 10% jitter for longer intervals
        var factor = 0.90 + (_random.NextDouble() * 0.20); // 0.90 to 1.10
        return Math.Round(intervalDays * factor, 2);
    }
}
