using Microsoft.AspNetCore.Mvc;

namespace DevTrack.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            service = "DevTrack.Api",
            timestamp = DateTime.UtcNow
        });
    }
}
