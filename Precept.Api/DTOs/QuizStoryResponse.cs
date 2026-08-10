using System.ComponentModel.DataAnnotations;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.DTOs;

public class QuizStoryResponse<T>
{
    public T? Story { get; set; }
    public int DueCount { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int TotalStories { get; set; }
}

public class StoryReviewSummaryResponse
{
    public int DueCount { get; set; }
    public DateTime? NextDueAt { get; set; }
}

public class StoryReviewRequest
{
    [Required]
    public ReviewRating? Rating { get; set; }
}
