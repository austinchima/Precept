using System;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Xunit;
using FluentAssertions;

namespace Precept.Tests.Services;

public class ReviewSchedulerTests
{
    // A fixed random seed so tests are deterministic.
    // Assuming Random uses a predictable LCG, seeded with 42, the first NextDouble() will be stable.
    private readonly Random _seededRandom = new Random(42);
    private readonly DateTime _now = new DateTime(2024, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(ConfidenceLevel.Panic, ConfidenceLevel.Shaky)]
    [InlineData(ConfidenceLevel.Shaky, ConfidenceLevel.Okay)]
    [InlineData(ConfidenceLevel.Okay, ConfidenceLevel.Solid)]
    [InlineData(ConfidenceLevel.Solid, ConfidenceLevel.CanTeach)]
    [InlineData(ConfidenceLevel.CanTeach, ConfidenceLevel.CanTeach)]
    public void NailedIt_PromotesAndCapsAtCanTeach(ConfidenceLevel initial, ConfidenceLevel expected)
    {
        var scheduler = new ReviewScheduler(_seededRandom);
        var outcome = scheduler.Apply(initial, ReviewRating.NailedIt, _now);

        outcome.NewLevel.Should().Be(expected);
    }

    [Theory]
    [InlineData(ConfidenceLevel.Panic, ConfidenceLevel.Panic, 1.0)]
    [InlineData(ConfidenceLevel.Shaky, ConfidenceLevel.Shaky, 1.0)] // Base 2 -> half = 1 (min 1)
    [InlineData(ConfidenceLevel.Okay, ConfidenceLevel.Okay, 2.0)] // Base 4 -> half = 2
    [InlineData(ConfidenceLevel.Solid, ConfidenceLevel.Solid, 4.5)] // Base 9 -> half = 4.5
    [InlineData(ConfidenceLevel.CanTeach, ConfidenceLevel.CanTeach, 10.5)] // Base 21 -> half = 10.5
    public void Partial_HoldsLevelAndYieldsShorterInterval(ConfidenceLevel initial, ConfidenceLevel expected, double expectedEffectiveDays)
    {
        // By controlling the random seed, we can predict the exact fuzzed value.
        // Or we can just check if it's within +/- 15% of expectedEffectiveDays
        var scheduler = new ReviewScheduler(new Random(42));
        var outcome = scheduler.Apply(initial, ReviewRating.Partial, _now);

        outcome.NewLevel.Should().Be(expected);

        var actualDays = (outcome.NextReviewAtUtc - _now).TotalDays;
        
        actualDays.Should().BeInRange(expectedEffectiveDays * 0.85, expectedEffectiveDays * 1.15);
    }

    [Theory]
    [InlineData(ConfidenceLevel.Panic)]
    [InlineData(ConfidenceLevel.Shaky)]
    [InlineData(ConfidenceLevel.Okay)]
    [InlineData(ConfidenceLevel.Solid)]
    [InlineData(ConfidenceLevel.CanTeach)]
    public void BlankPanic_AlwaysLandsOnPanicWithOneDayInterval(ConfidenceLevel initial)
    {
        var scheduler = new ReviewScheduler(new Random(42));
        var outcome = scheduler.Apply(initial, ReviewRating.BlankPanic, _now);

        outcome.NewLevel.Should().Be(ConfidenceLevel.Panic);
        
        var actualDays = (outcome.NextReviewAtUtc - _now).TotalDays;
        actualDays.Should().BeInRange(1.0 * 0.85, 1.0 * 1.15);
    }

    [Fact]
    public void Interval_IsWithinFuzzBounds()
    {
        var scheduler = new ReviewScheduler(new Random(42));
        // Okay + NailedIt -> Solid (base 9 days)
        var outcome = scheduler.Apply(ConfidenceLevel.Okay, ReviewRating.NailedIt, _now);
        
        var actualDays = (outcome.NextReviewAtUtc - _now).TotalDays;
        
        actualDays.Should().BeInRange(9.0 * 0.85, 9.0 * 1.15);
    }
}
