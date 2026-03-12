namespace DevTrack.Api.Models;

public sealed class Organization
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<OrganizationMember> Members { get; set; } = [];
    public List<Project> Projects { get; set; } = [];
}
