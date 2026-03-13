using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Route("/api/activity-logs")]
[Authorize]
public sealed class ActivityLogsController(IActivityLogService activityLogService, AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetActivityLogs([FromQuery] string entityType, [FromQuery] int entityId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var logs = await activityLogService.GetEntityActivityAsync(entityType, entityId);

        if (logs.Count == 0)
        {
            return Ok(new List<ActivityLogResponse>());
        }

        // Check access: User must be a member of the organization the logs belong to.
        // We assume all logs for a single entity belong to the same organization.
        int organizationId = logs[0].OrganizationId;

        bool hasAccess = await dbContext.OrganizationMembers
            .AnyAsync(m => m.OrganizationId == organizationId && m.UserId == userId);

        if (!hasAccess)
        {
            return Forbid();
        }

        var response = logs.Select(l => new ActivityLogResponse
        {
            Id = l.Id,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            Action = l.Action,
            Details = l.Details,
            UserId = l.UserId,
            UserEmail = l.User?.Email,
            CreatedAt = l.CreatedAt
        });

        return Ok(response);
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
