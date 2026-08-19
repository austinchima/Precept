using System;
using FluentAssertions;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.SpacedRepetition;
using Xunit;

namespace Precept.Tests.Services;

public class ReviewSchedulerTests
{
    private readonly DateTime _now = new DateTime(2026, 8, 19, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Apply_WithSpacedRepetitionItem_NailedIt_IncrementsStreakAndEaseFactor()
    {
        var scheduler = new ReviewScheduler(new Sm2Algorithm(new Random(42)));
        var item = new SpacedRepetitionItem(0, 2.5, 1.0, ConfidenceLevel.Panic, null, null);

        var outcome = scheduler.Apply(item, ReviewRating.NailedIt, _now);

        outcome.NewRepetitions.Should().Be(1);
        outcome.NewIntervalDays.Should().Be(1.0);
        outcome.NewEaseFactor.Should().Be(2.6);
        outcome.NewConfidenceLevel.Should().Be(ConfidenceLevel.Shaky);
    }

    [Fact]
    public void Apply_WithSpacedRepetitionItem_Partial_MaintainsStreakAtCurrentInterval()
    {
        var scheduler = new ReviewScheduler(new Sm2Algorithm(new Random(42)));
        var item = new SpacedRepetitionItem(1, 2.5, 1.0, ConfidenceLevel.Shaky, _now.AddDays(-1), _now);

        var outcome = scheduler.Apply(item, ReviewRating.Partial, _now);

        outcome.NewRepetitions.Should().Be(2);
        outcome.NewIntervalDays.Should().Be(6.0);
        outcome.NewEaseFactor.Should().Be(2.36);
    }

    [Fact]
    public void Apply_WithSpacedRepetitionItem_BlankPanic_ResetsStreakToZeroAndIntervalToOne()
    {
        var scheduler = new ReviewScheduler(new Sm2Algorithm(new Random(42)));
        var item = new SpacedRepetitionItem(3, 2.6, 16.0, ConfidenceLevel.CanTeach, _now.AddDays(-16), _now);

        var outcome = scheduler.Apply(item, ReviewRating.BlankPanic, _now);

        outcome.NewRepetitions.Should().Be(0);
        outcome.NewIntervalDays.Should().Be(1.0);
        outcome.NewConfidenceLevel.Should().Be(ConfidenceLevel.Panic);
    }

    [Theory]
    [InlineData(ConfidenceLevel.Panic, ConfidenceLevel.Panic)]
    [InlineData(ConfidenceLevel.Shaky, ConfidenceLevel.Panic)]
    [InlineData(ConfidenceLevel.Okay, ConfidenceLevel.Panic)]
    [InlineData(ConfidenceLevel.Solid, ConfidenceLevel.Panic)]
    [InlineData(ConfidenceLevel.CanTeach, ConfidenceLevel.Panic)]
    public void LegacyApply_BlankPanic_AlwaysReturnsPanic(ConfidenceLevel initial, ConfidenceLevel expected)
    {
        var scheduler = new ReviewScheduler(new Sm2Algorithm(new Random(42)));
        var outcome = scheduler.Apply(initial, ReviewRating.BlankPanic, _now);

        outcome.NewLevel.Should().Be(expected);
    }

    [Fact]
    public void LegacyApply_NailedIt_ReturnsPromotedConfidenceLevel()
    {
        var scheduler = new ReviewScheduler(new Sm2Algorithm(new Random(42)));
        var outcome = scheduler.Apply(ConfidenceLevel.Shaky, ReviewRating.NailedIt, _now);

        outcome.NewLevel.Should().Be(ConfidenceLevel.Okay);
    }
}
