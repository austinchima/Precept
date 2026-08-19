namespace Precept.Api.Services.SpacedRepetition;

using System;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

/// <summary>
/// Free Spaced Repetition Scheduler (FSRS) - Machine Learning Architecture Stub.
/// 
/// Status: DEFERRED TO FUTURE ITERATION
/// Initial Version: SM-2 Algorithm is actively shipped and enabled.
/// 
/// FSRS Theoretical Model & Architectural Specification for Next Phase:
/// -------------------------------------------------------------------
/// FSRS is a modern, machine-learning-based spaced repetition model based on the DSR (Difficulty, Stability, Retrievability) memory model:
/// 1. Stability (S): The time (in days) required for the probability of recall (Retrievability R) to decay from 100% to target retention (default 90%).
/// 2. Difficulty (D): The inherent complexity of the item (1 to 10 scale).
/// 3. Retrievability (R): R(t, S) = (1 + factor * (t / S))^(-decay)
/// 4. Rating Grades: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
/// 
/// Machine learning weights (17 parameters w[0..16]) are optimized using maximum likelihood estimation (MLE)
/// or Adam gradient descent against historical user review logs.
/// 
/// This stub provides the extension interface and graceful fallback to SM-2 until ML weight training
/// pipeline is integrated in the follow-up release.
/// </summary>
public class FsrsAlgorithm(ISpacedRepetitionAlgorithm? fallbackSm2 = null) : ISpacedRepetitionAlgorithm
{
    public SpacedRepetitionAlgorithmType AlgorithmType => SpacedRepetitionAlgorithmType.Fsrs;
    private readonly ISpacedRepetitionAlgorithm _fallback = fallbackSm2 ?? new Sm2Algorithm();

    public SpacedRepetitionSchedule CalculateNext(SpacedRepetitionItem item, int qualityGrade, DateTime utcNow)
    {
        // FSRS ML Engine is deferred for the next iteration.
        // Fallback to SM-2 core calculation while tagging algorithm metadata as FSRS-Deferred.
        var schedule = _fallback.CalculateNext(item, qualityGrade, utcNow);
        return schedule with { AlgorithmUsed = SpacedRepetitionAlgorithmType.Fsrs };
    }
}
