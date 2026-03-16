namespace DevTrack.Api.Models;

public enum OrganizationRole
{
    Owner = 0,
    Admin = 1,
    Member = 2,
    Viewer = 3
}

public sealed class OrganizationMember
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public OrganizationRole Role { get; set; } = OrganizationRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
