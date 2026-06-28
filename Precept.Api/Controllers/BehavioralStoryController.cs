using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class BehavioralStoryController(IBehavioralStoryService storyService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    [HttpPost]
    public async Task<ActionResult<BehavioralStoryResponse>> CreateStory([FromBody] CreateBehavioralStoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await storyService.CreateStoryAsync(userId, request);
        return CreatedAtAction(nameof(GetStory), new { id = response.Id }, response);
    }

    [HttpGet]
    public async Task<ActionResult<List<BehavioralStoryResponse>>> GetStories()
    {
        var userId = GetUserId();
        var response = await storyService.GetStoriesAsync(userId);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BehavioralStoryResponse>> GetStory(string id)
    {
        var userId = GetUserId();
        var response = await storyService.GetStoryAsync(userId, id);
        
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BehavioralStoryResponse>> UpdateStory(string id, [FromBody] UpdateBehavioralStoryRequest request)
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
}
