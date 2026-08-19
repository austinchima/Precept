using System;
using FluentAssertions;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.SpacedRepetition;
using Xunit;

namespace Precept.Tests.Unit;

public class Sm2AlgorithmTests
{
    private readonly DateTime _now = new(2026, 8, 19, 12, 0, 0, DateTimeKind.Utc);
    private readonly Sm2Algorithm _algorithm = new(new Random(42));

    [Fact]
    public void CalculateNext_InitialItem_WithQuality5_Schedules1DayAndIncreasesEaseFactor()
    {
        var item = new SpacedRepetitionItem(
            Repetitions: 0,
            EaseFactor: 2.5,
            IntervalDays: 1.0,
            ConfidenceLevel: ConfidenceLevel.Panic,
            LastReviewedAtUtc: null,
            NextReviewAtUtc: null
        );

        var result = _algorithm.CalculateNext(item, qualityGrade: 5, _now);

        result.NewRepetitions.Should().Be(1);
        result.NewIntervalDays.Should().Be(1.0);
        result.NewEaseFactor.Should().Be(2.6); // 2.5 + (0.1 - 0) = 2.6
        result.AlgorithmUsed.Should().Be(SpacedRepetitionAlgorithmType.Sm2);
    }

    [Fact]
    public void CalculateNext_Repetition1_WithQuality5_Schedules6Days()
    {
        var item = new SpacedRepetitionItem(
            Repetitions: 1,
            EaseFactor: 2.6,
            IntervalDays: 1.0,
            ConfidenceLevel: ConfidenceLevel.Shaky,
            LastReviewedAtUtc: _now.AddDays(-1),
            NextReviewAtUtc: _now
        );

        var result = _algorithm.CalculateNext(item, qualityGrade: 5, _now);

        result.NewRepetitions.Should().Be(2);
        result.NewIntervalDays.Should().Be(6.0);
        result.NewEaseFactor.Should().Be(2.7);
    }

    [Fact]
    public void CalculateNext_Repetition2_WithQuality5_CompoundsIntervalByEaseFactor()
    {
        var item = new SpacedRepetitionItem(
            Repetitions: 2,
            EaseFactor: 2.5,
            IntervalDays: 6.0,
            ConfidenceLevel: ConfidenceLevel.Okay,
            LastReviewedAtUtc: _now.AddDays(-6),
            NextReviewAtUtc: _now
        );

        var result = _algorithm.CalculateNext(item, qualityGrade: 5, _now);

        result.NewRepetitions.Should().Be(3);
        // round(6.0 * 2.6) = 16.0
        result.NewIntervalDays.Should().Be(16.0);
        result.NewEaseFactor.Should().Be(2.6);
        result.NewConfidenceLevel.Should().Be(ConfidenceLevel.Solid);
    }

    [Fact]
    public void CalculateNext_QualityLessThan3_LapsesTo0RepetitionsAnd1Day()
    {
        var item = new SpacedRepetitionItem(
            Repetitions: 4,
            EaseFactor: 2.5,
            IntervalDays: 25.0,
            ConfidenceLevel: ConfidenceLevel.CanTeach,
            LastReviewedAtUtc: _now.AddDays(-25),
            NextReviewAtUtc: _now
        );

        // Grade 1 = BlankPanic (failed recall)
        var result = _algorithm.CalculateNext(item, qualityGrade: 1, _now);

        result.NewRepetitions.Should().Be(0);
        result.NewIntervalDays.Should().Be(1.0);
        result.NewEaseFactor.Should().BeLessThan(2.5);
        result.NewConfidenceLevel.Should().Be(ConfidenceLevel.Panic);
    }

    [Fact]
    public void CalculateNext_EaseFactor_ClampsAtMinimumFloor1_3()
    {
        var item = new SpacedRepetitionItem(
            Repetitions: 0,
            EaseFactor: 1.35,
            IntervalDays: 1.0,
            ConfidenceLevel: ConfidenceLevel.Panic,
            LastReviewedAtUtc: null,
            NextReviewAtUtc: null
        );

        // Quality 0 (massive blackout) causes maximum EF penalty (-0.8)
        var result = _algorithm.CalculateNext(item, qualityGrade: 0, _now);

        result.NewEaseFactor.Should().Be(Sm2Algorithm.MinimumEaseFactor);
    }

    [Fact]
    public void FsrsAlgorithm_Blueprint_GracefullyDelegatesToSm2Fallback()
    {
        var fsrs = new FsrsAlgorithm();
        var item = new SpacedRepetitionItem(0, 2.5, 1.0, ConfidenceLevel.Okay, null, null);

        var result = fsrs.CalculateNext(item, qualityGrade: 4, _now);

        result.AlgorithmUsed.Should().Be(SpacedRepetitionAlgorithmType.Fsrs);
        result.NewRepetitions.Should().Be(1);
        result.NewIntervalDays.Should().Be(1.0);
    }
}
