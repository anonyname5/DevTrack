namespace DevTrack.Api.Models;

public sealed class ActivityLog
{
    public int Id { get; set; }
    
    public string EntityType { get; set; } = string.Empty; // "Task", "Project", "Comment"
    public int EntityId { get; set; }
    
    public string Action { get; set; } = string.Empty; // "Created", "Updated", "Deleted", "Moved"
    public string? Details { get; set; } // JSON or simple text
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public int OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
