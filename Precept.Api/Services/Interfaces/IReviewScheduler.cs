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
    ReviewOutcome Apply(ConfidenceLevel current, ReviewRating rating, DateTime utcNow);
    double GetBaseIntervalDays(ConfidenceLevel level);
}
