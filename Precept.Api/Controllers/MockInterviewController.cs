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
public class MockInterviewController(IMockInterviewService mockInterviewService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from claims.");

    /// <summary>
    /// Generates a targeted interview question using Gemini Flash or role/JD context.
    /// </summary>
    [HttpPost("generate-question")]
    public async Task<ActionResult<MockQuestionResponse>> GenerateQuestion([FromBody] GenerateMockQuestionRequest request)
    {
        var userId = GetUserId();
        var response = await mockInterviewService.GenerateQuestionAsync(request, userId);
        return Ok(response);
    }

    /// <summary>
    /// Evaluates a candidate's spoken/recorded transcript using the STAR methodology.
    /// </summary>
    [HttpPost("evaluate")]
    public async Task<ActionResult<MockInterviewEvaluationResponse>> EvaluateAnswer([FromBody] EvaluateMockAnswerRequest request)
    {
        var userId = GetUserId();
        var response = await mockInterviewService.EvaluateAnswerAsync(request, userId);
        return Ok(response);
    }
}
