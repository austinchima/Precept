using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

/// <summary>
/// Controller handling all HTTP operations for managing job applications.
/// All endpoints require JWT authentication.
/// </summary>
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

    /// <summary>
    /// Creates a new job application for the authenticated user.
    /// </summary>
    /// <param name="request">The application creation details.</param>
    /// <returns>A CreatedAtAction result containing the created ApplicationResponse.</returns>
    [HttpPost]
    public async Task<ActionResult<ApplicationResponse>> CreateApplication([FromBody] CreateApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.CreateApplicationAsync(userId, request);
        return CreatedAtAction(nameof(GetApplication), new { id = response.Id }, response);
    }

    /// <summary>
    /// Retrieves all applications belonging to the authenticated user, optionally filtered by status.
    /// </summary>
    /// <param name="status">Optional status to filter applications by.</param>
    /// <returns>A list of ApplicationResponse DTOs.</returns>
    [HttpGet]
    public async Task<ActionResult<List<ApplicationResponse>>> GetAllApplications([FromQuery] ApplicationStatus? status = null)
    {
        var userId = GetUserId();
        var response = await applicationService.GetAllApplicationsAsync(userId, status);
        return Ok(response);
    }

    /// <summary>
    /// Retrieves a specific application by ID. Securely restricts access to the application owner.
    /// </summary>
    /// <param name="id">The Guid string of the application.</param>
    /// <returns>The requested ApplicationResponse DTO, or NotFound if not found/not owned.</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApplicationResponse>> GetApplication(string id)
    {
        var userId = GetUserId();
        var response = await applicationService.GetApplicationAsync(userId, id);

        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Updates all editable properties of a specific application.
    /// </summary>
    /// <param name="id">The Guid string of the application to update.</param>
    /// <param name="request">The updated application properties.</param>
    /// <returns>The updated ApplicationResponse DTO, or NotFound if not found/not owned.</returns>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApplicationResponse>> UpdateApplication(string id, [FromBody] UpdateApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.UpdateApplicationAsync(userId, id, request);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Standalone update endpoint to change ONLY the status of a specific job application.
    /// </summary>
    /// <param name="id">The Guid string of the application to update.</param>
    /// <param name="request">The request DTO containing the new status.</param>
    /// <returns>The updated ApplicationResponse DTO, or NotFound if not found/not owned.</returns>
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApplicationResponse>> UpdateApplicationStatus(string id, [FromBody] UpdateApplicationStatusRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await applicationService.UpdateApplicationStatusAsync(userId, id, request.Status);
        if (string.IsNullOrEmpty(response.Id))
        {
            return NotFound();
        }

        return Ok(response);
    }

    /// <summary>
    /// Deletes a specific application belonging to the authenticated user.
    /// </summary>
    /// <param name="id">The Guid string of the application to delete.</param>
    /// <returns>NoContent if successful, or NotFound if not found/not owned.</returns>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteApplication(string id)
    {
        var userId = GetUserId();
        var success = await applicationService.DeleteApplicationAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
