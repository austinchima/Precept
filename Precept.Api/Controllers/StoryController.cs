using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

/// <summary>
/// Controller handling all HTTP operations for managing user stories (code snippets and explanations).
/// All endpoints require JWT authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StoryController(IStoryService storyService) : ControllerBase
{
    /// <summary>
    /// Helper method to extract the logged-in User ID from JWT claims.
    /// Supports standard NameIdentifier and 'sub' claims.
    /// </summary>
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    /// <summary>
    /// Creates a new story for the authenticated user.
    /// </summary>
    /// <param name="request">The story creation details.</param>
    /// <returns>A CreatedAtAction result containing the created StoryResponse.</returns>
    [HttpPost]
    public async Task<ActionResult<StoryResponse>> CreateStory([FromBody] CreateStoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.CreateStoryAsync(userId, request);
        return CreatedAtAction(nameof(GetStory), new { id = response.Id }, response);
    }

    /// <summary>
    /// Retrieves all stories belonging to the authenticated user, optionally filtered by category.
    /// </summary>
    /// <param name="category">Optional category to filter the stories by.</param>
    /// <returns>A list of StoryResponse DTOs.</returns>
    [HttpGet]
    public async Task<ActionResult<List<StoryResponse>>> GetStories([FromQuery] Category? category = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetStoriesAsync(userId, category);
        return Ok(response);
    }

    /// <summary>
    /// Retrieves a specific story by ID. Securely restricts access to the story owner.
    /// </summary>
    /// <param name="id">The Guid string of the story.</param>
    /// <returns>The requested StoryResponse DTO, or NotFound if not found/not owned.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<StoryResponse>> GetStory(string id)
    {
        var userId = GetUserId();
        var response = await storyService.GetStoryAsync(userId, id);
        
        // Return 404 instead of leaking details or throwing error if empty (not found or not owned)
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Retrieves a random story from the authenticated user's collection (useful for study modes).
    /// </summary>
    /// <returns>A random StoryResponse DTO, or NotFound if the collection is empty.</returns>
    [HttpGet("random")]
    public async Task<ActionResult<StoryResponse>> GetRandomStory([FromQuery] Category? category = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetRandomStoryAsync(userId, category);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }
        return Ok(response);
    }

    /// <summary>
    /// Updates all editable properties of a specific story.
    /// </summary>
    /// <param name="id">The Guid string of the story to update.</param>
    /// <param name="request">The updated story properties.</param>
    /// <returns>The updated StoryResponse DTO, or NotFound if not found/not owned.</returns>
    [HttpPut("{id}")]
    public async Task<ActionResult<StoryResponse>> UpdateStory(string id, [FromBody] UpdateStoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.UpdateStoryAsync(userId, id, request);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Deletes a specific story belonging to the authenticated user.
    /// </summary>
    /// <param name="id">The Guid string of the story to delete.</param>
    /// <returns>NoContent if successful, or NotFound if not found/not owned.</returns>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteStory(string id)
    {
        var userId = GetUserId();
        var success = await storyService.DeleteStoryAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// Standalone update endpoint to change ONLY the confidence level rating of a specific story.
    /// Typically used in study/review modes.
    /// </summary>
    /// <param name="id">The Guid string of the story to rate.</param>
    /// <param name="request">The new confidence level value.</param>
    /// <returns>The updated StoryResponse DTO containing the new rating and review date.</returns>
    [HttpPatch("{id}/confidence")]
    public async Task<ActionResult<StoryResponse>> UpdateStoryConfidenceLevel(string id, [FromBody] UpdateStoryConfidenceLevelRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.UpdateStoryConfidenceLevelAsync(userId, id, request.ConfidenceLevel);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Retrieves the next story to review for quiz mode using spaced repetition logic.
    /// </summary>
    /// <returns>A StoryResponse DTO representing the next quiz item, or NotFound if no stories exist.</returns>
    [HttpGet("quiz")]
    public async Task<ActionResult<StoryResponse>> GetQuizStory()
    {
        var userId = GetUserId();
        var response = await storyService.GetQuizStoryAsync(userId);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }
        return Ok(response);
    }
}