using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
[Route("/api/notifications")]
public sealed class NotificationsController(INotificationService notificationService, AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? organizationId, [FromQuery] bool unreadOnly = false, [FromQuery] int limit = 30)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (organizationId.HasValue)
        {
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == organizationId.Value && m.UserId == userId.Value);
            if (!isMember)
            {
                return Forbid();
            }
        }

        var notifications = await notificationService.GetForUserAsync(userId.Value, organizationId, unreadOnly, limit);
        var response = notifications.Select(n => new
        {
            n.Id,
            n.Title,
            n.Message,
            n.Link,
            n.OrganizationId,
            n.IsRead,
            n.CreatedAt,
            n.ReadAt
        });

        return Ok(response);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount([FromQuery] int? organizationId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (organizationId.HasValue)
        {
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == organizationId.Value && m.UserId == userId.Value);
            if (!isMember)
            {
                return Forbid();
            }
        }

        int count = await notificationService.GetUnreadCountAsync(userId.Value, organizationId);
        return Ok(new { count });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        bool updated = await notificationService.MarkReadAsync(userId.Value, id);
        return updated ? NoContent() : NotFound();
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead([FromQuery] int? organizationId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (organizationId.HasValue)
        {
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == organizationId.Value && m.UserId == userId.Value);
            if (!isMember)
            {
                return Forbid();
            }
        }

        int updatedCount = await notificationService.MarkAllReadAsync(userId.Value, organizationId);
        return Ok(new { updatedCount });
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
