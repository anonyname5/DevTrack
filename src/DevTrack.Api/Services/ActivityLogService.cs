using DevTrack.Api.Data;
using DevTrack.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Services;

public sealed class ActivityLogService(AppDbContext dbContext) : IActivityLogService
{
    public async Task LogAsync(int organizationId, int userId, string entityType, int entityId, string action, string? details = null)
    {
        var log = new ActivityLog
        {
            OrganizationId = organizationId,
            UserId = userId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            Details = details,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ActivityLogs.Add(log);
        await dbContext.SaveChangesAsync();
    }

    public async Task<List<ActivityLog>> GetOrganizationActivityAsync(int organizationId, int limit = 50)
    {
        return await dbContext.ActivityLogs
            .AsNoTracking()
            .Include(a => a.User)
            .Where(a => a.OrganizationId == organizationId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<ActivityLog>> GetEntityActivityAsync(string entityType, int entityId)
    {
        return await dbContext.ActivityLogs
            .AsNoTracking()
            .Include(a => a.User)
            .Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }
}
