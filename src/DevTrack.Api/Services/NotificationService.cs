using DevTrack.Api.Data;
using DevTrack.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Services;

public sealed class NotificationService(AppDbContext dbContext) : INotificationService
{
    public async Task CreateAsync(int userId, string title, string message, int? organizationId = null, string? link = null)
    {
        Notification notification = new()
        {
            UserId = userId,
            Title = title.Trim(),
            Message = message.Trim(),
            OrganizationId = organizationId,
            Link = string.IsNullOrWhiteSpace(link) ? null : link.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Notifications.Add(notification);
        await dbContext.SaveChangesAsync();
    }

    public async Task<List<Notification>> GetForUserAsync(int userId, int? organizationId = null, bool unreadOnly = false, int limit = 30)
    {
        IQueryable<Notification> query = dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (organizationId.HasValue)
        {
            query = query.Where(n => n.OrganizationId == organizationId.Value);
        }

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();
    }

    public Task<int> GetUnreadCountAsync(int userId, int? organizationId = null)
    {
        IQueryable<Notification> query = dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead);

        if (organizationId.HasValue)
        {
            query = query.Where(n => n.OrganizationId == organizationId.Value);
        }

        return query.CountAsync();
    }

    public async Task<bool> MarkReadAsync(int userId, int notificationId)
    {
        Notification? notification = await dbContext.Notifications
            .SingleOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification is null)
        {
            return false;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> MarkAllReadAsync(int userId, int? organizationId = null)
    {
        IQueryable<Notification> query = dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead);

        if (organizationId.HasValue)
        {
            query = query.Where(n => n.OrganizationId == organizationId.Value);
        }

        List<Notification> notifications = await query.ToListAsync();
        if (notifications.Count == 0)
        {
            return 0;
        }

        DateTime now = DateTime.UtcNow;
        foreach (Notification notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await dbContext.SaveChangesAsync();
        return notifications.Count;
    }
}
