namespace DevTrack.Api.Models;

public sealed class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<TaskItem> Tasks { get; set; } = [];
}
