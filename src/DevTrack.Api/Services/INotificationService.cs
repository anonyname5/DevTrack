using DevTrack.Api.Models;

namespace DevTrack.Api.Services;

public interface INotificationService
{
    Task CreateAsync(int userId, string title, string message, int? organizationId = null, string? link = null);
    Task<List<Notification>> GetForUserAsync(int userId, int? organizationId = null, bool unreadOnly = false, int limit = 30);
    Task<int> GetUnreadCountAsync(int userId, int? organizationId = null);
    Task<bool> MarkReadAsync(int userId, int notificationId);
    Task<int> MarkAllReadAsync(int userId, int? organizationId = null);
}
