using System.ComponentModel.DataAnnotations;
using Precept.Api.Models;

namespace Precept.Api.DTOs;

/// <summary>
/// What the frontend sends TO us when creating a story.
/// No Id or UserId here, because the server handles those securely!
/// </summary>
public class CreateStoryRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MinLength(50, ErrorMessage = "Explanation must be at least 50 characters")]
    public string Explanation { get; set; } = string.Empty;
    
    public string SourceProject { get; set; } = string.Empty;
    
    [Required]
    public string CodeSnippet { get; set; } = string.Empty;
    
    public Category Category { get; set; }
    
    // It has a default, but the user can override it in the JSON!
    public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay; 
}

public class UpdateStoryRequest
{
    [Required]
    public string Id { get; set; } = string.Empty;
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MinLength(50, ErrorMessage = "Explanation must be at least 50 characters")]
    public string Explanation { get; set; } = string.Empty;
    
    public string SourceProject { get; set; } = string.Empty;
    
    [Required]
    public string CodeSnippet { get; set; } = string.Empty;
    
    public Category Category { get; set; }
    
    // It has a default, but the user can override it in the JSON!
    public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay; 
}


/// <summary>
/// What we send BACK to the frontend when they ask for a story.
/// This includes everything, including the database Ids and timestamps.
/// </summary>
public class StoryResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string SourceProject { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CodeSnippet { get; set; } = string.Empty;
    public Category Category { get; set; }
    public ConfidenceLevel ConfidenceLevel { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateStoryConfidenceLevelRequest
{
    [Required]
    public ConfidenceLevel ConfidenceLevel { get; set; }
}
