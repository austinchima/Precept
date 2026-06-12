using Microsoft.AspNetCore.Mvc;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { status = "online", timestamp = DateTime.UtcNow });
    }
}
