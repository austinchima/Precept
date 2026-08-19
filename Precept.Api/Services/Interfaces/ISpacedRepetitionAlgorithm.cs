namespace Precept.Api.Services.Interfaces;

using System;
using Precept.Api.Models;

/// <summary>
/// Supported spaced repetition algorithms.
/// SM-2 is currently active; FSRS is deferred to a future machine-learning iteration.
/// </summary>
public enum SpacedRepetitionAlgorithmType
{
    Sm2,
    Fsrs
}

/// <summary>
/// Encapsulates the current spaced repetition state of a recall item.
/// </summary>
public record SpacedRepetitionItem(
    int Repetitions,
    double EaseFactor,
    double IntervalDays,
    ConfidenceLevel ConfidenceLevel,
    DateTime? LastReviewedAtUtc,
    DateTime? NextReviewAtUtc
);

/// <summary>
/// Result of evaluating an active recall drill using a spaced repetition algorithm.
/// </summary>
public record SpacedRepetitionSchedule(
    int NewRepetitions,
    double NewEaseFactor,
    double NewIntervalDays,
    ConfidenceLevel NewConfidenceLevel,
    DateTime NextReviewAtUtc,
    SpacedRepetitionAlgorithmType AlgorithmUsed
);

/// <summary>
/// Algorithm abstraction enabling seamless transition between SM-2 and future FSRS scheduler.
/// </summary>
public interface ISpacedRepetitionAlgorithm
{
    SpacedRepetitionAlgorithmType AlgorithmType { get; }

    /// <summary>
    /// Computes the next review schedule given the item's state and an active recall grade (0 to 5).
    /// </summary>
    SpacedRepetitionSchedule CalculateNext(SpacedRepetitionItem item, int qualityGrade, DateTime utcNow);
}
