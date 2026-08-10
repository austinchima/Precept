using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class StoryController(IStoryService storyService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    [HttpPost]
    public async Task<ActionResult<StoryResponse>> CreateStory([FromBody] CreateStoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.CreateStoryAsync(userId, request);
        return CreatedAtAction(nameof(GetStory), new { id = response.Id }, response);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<StoryResponse>>> GetStories(
        [FromQuery] Category? category = null,
        [FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetStoriesAsync(userId, category, pagination);
        return Ok(response);
    }

    [HttpGet("trash")]
    public async Task<ActionResult<PagedResponse<StoryResponse>>> GetTrashStories([FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetTrashStoriesAsync(userId, pagination);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StoryResponse>> GetStory(string id)
    {
        var userId = GetUserId();
        var response = await storyService.GetStoryAsync(userId, id);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpGet("random")]
    public async Task<ActionResult<StoryResponse>> GetRandomStory([FromQuery] Category? category = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetRandomStoryAsync(userId, category);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<StoryResponse>> UpdateStory(string id, [FromBody] UpdateStoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.UpdateStoryAsync(userId, id, request);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteStory(string id)
    {
        var userId = GetUserId();
        var success = await storyService.DeleteStoryAsync(userId, id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreStory(string id)
    {
        var userId = GetUserId();
        var success = await storyService.RestoreStoryAsync(userId, id);
        if (!success)
            return NotFound();

        return Ok(new { message = "Story restored successfully." });
    }

    [HttpPatch("{id}/confidence")]
    public async Task<ActionResult<StoryResponse>> UpdateStoryConfidenceLevel(string id, [FromBody] UpdateStoryConfidenceLevelRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.UpdateStoryConfidenceLevelAsync(userId, id, request.ConfidenceLevel);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpGet("quiz")]
    public async Task<ActionResult<QuizStoryResponse<StoryResponse>>> GetQuizStory([FromQuery] Category? category = null)
    {
        var userId = GetUserId();
        var response = await storyService.GetQuizStoryAsync(userId, category);
        return Ok(response);
    }

    [HttpPost("{id}/review")]
    public async Task<ActionResult<StoryResponse>> ReviewStory(string id, [FromBody] StoryReviewRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.ReviewStoryAsync(userId, id, request.Rating!.Value);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpGet("quiz/summary")]
    public async Task<ActionResult<StoryReviewSummaryResponse>> GetQuizSummary()
    {
        var userId = GetUserId();
        var response = await storyService.GetQuizSummaryAsync(userId);
        return Ok(response);
    }
}