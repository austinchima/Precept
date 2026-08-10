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
public class ApplicationController(IApplicationService applicationService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    [HttpPost]
    public async Task<ActionResult<ApplicationResponse>> CreateApplication([FromBody] CreateApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.CreateApplicationAsync(userId, request);
        return CreatedAtAction(nameof(GetApplication), new { id = response.Id }, response);
    }

    [HttpPost("capture")]
    public async Task<ActionResult<ApplicationResponse>> CaptureApplication([FromBody] CaptureApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var userId = GetUserId();
            var response = await applicationService.CaptureApplicationAsync(userId, request);
            return CreatedAtAction(nameof(GetApplication), new { id = response.Id }, response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ApplicationResponse>>> GetAllApplications(
        [FromQuery] ApplicationStatus? status = null,
        [FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await applicationService.GetAllApplicationsAsync(userId, status, pagination);
        return Ok(response);
    }

    [HttpGet("trash")]
    public async Task<ActionResult<PagedResponse<ApplicationResponse>>> GetTrashApplications([FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await applicationService.GetTrashApplicationsAsync(userId, pagination);
        return Ok(response);
    }

    [HttpGet("followups-due")]
    public async Task<ActionResult> GetFollowUpsDue()
    {
        var userId = GetUserId();
        var items = await applicationService.GetFollowUpsDueAsync(userId);
        return Ok(new { items, count = items.Count });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApplicationResponse>> GetApplication(string id)
    {
        var userId = GetUserId();
        var response = await applicationService.GetApplicationAsync(userId, id);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApplicationResponse>> UpdateApplication(string id, [FromBody] UpdateApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.UpdateApplicationAsync(userId, id, request);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApplicationResponse>> UpdateApplicationStatus(string id, [FromBody] UpdateApplicationStatusRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.UpdateApplicationStatusAsync(userId, id, request.Status);
        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteApplication(string id)
    {
        var userId = GetUserId();
        var success = await applicationService.DeleteApplicationAsync(userId, id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreApplication(string id)
    {
        var userId = GetUserId();
        var success = await applicationService.RestoreApplicationAsync(userId, id);
        if (!success)
            return NotFound();

        return Ok(new { message = "Application restored successfully." });
    }
}
