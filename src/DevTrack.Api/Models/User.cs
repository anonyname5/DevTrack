namespace DevTrack.Api.Models;

public sealed class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Project> Projects { get; set; } = [];
    public List<OrganizationMember> OrganizationMembers { get; set; } = [];
    public List<Notification> Notifications { get; set; } = [];
}
