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
public class SkillController(ISkillService skillService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    [HttpPost]
    public async Task<ActionResult<SkillResponse>> CreateSkill([FromBody] CreateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await skillService.CreateSkillAsync(userId, request);
        return CreatedAtAction(nameof(GetSkill), new { id = response.Id }, response);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<SkillResponse>>> GetSkills([FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await skillService.GetSkillsAsync(userId, pagination);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SkillResponse>> GetSkill(string id)
    {
        var userId = GetUserId();
        var response = await skillService.GetSkillAsync(userId, id);

        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SkillResponse>> UpdateSkill(string id, [FromBody] UpdateSkillRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await skillService.UpdateSkillAsync(userId, id, request);

        if (response is null)
            return NotFound();

        return Ok(response);
    }

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
