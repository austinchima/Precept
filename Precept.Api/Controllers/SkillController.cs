using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

/// <summary>
/// Controller handling all HTTP operations for managing a user's skills inventory.
/// All endpoints require JWT authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillController(ISkillService skillService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    /// <summary>
    /// Creates a new skill in the user's inventory.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SkillResponse>> CreateSkill([FromBody] CreateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await skillService.CreateSkillAsync(userId, request);
        return CreatedAtAction(nameof(GetSkill), new { id = response.Id }, response);
    }

    /// <summary>
    /// Retrieves all skills in the authenticated user's inventory, ordered by name.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<SkillResponse>>> GetSkills()
    {
        var userId = GetUserId();
        var response = await skillService.GetSkillsAsync(userId);
        return Ok(response);
    }

    /// <summary>
    /// Retrieves a specific skill by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<SkillResponse>> GetSkill(string id)
    {
        var userId = GetUserId();
        var response = await skillService.GetSkillAsync(userId, id);

        if (string.IsNullOrEmpty(response.Id))
            return NotFound();

        return Ok(response);
    }

    /// <summary>
    /// Updates a specific skill in the user's inventory.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<SkillResponse>> UpdateSkill(string id, [FromBody] UpdateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await skillService.UpdateSkillAsync(userId, id, request);

        if (string.IsNullOrEmpty(response.Id))
            return NotFound();

        return Ok(response);
    }

    /// <summary>
    /// Deletes a specific skill from the user's inventory.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteSkill(string id)
    {
        var userId = GetUserId();
        var success = await skillService.DeleteSkillAsync(userId, id);

        if (!success)
            return NotFound();

        return NoContent();
    }
}
