using DevTrack.Api.Models;

namespace DevTrack.Api.Services;

public interface IActivityLogService
{
    Task LogAsync(int organizationId, int userId, string entityType, int entityId, string action, string? details = null);
    Task<List<ActivityLog>> GetOrganizationActivityAsync(int organizationId, int limit = 50);
    Task<List<ActivityLog>> GetEntityActivityAsync(string entityType, int entityId);
}
