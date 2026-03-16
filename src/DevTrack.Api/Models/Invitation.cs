using DevTrack.Api.Models;

namespace DevTrack.Api.Models;

public sealed class Invitation
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public int OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public OrganizationRole Role { get; set; } = OrganizationRole.Member;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public int InvitedByUserId { get; set; }
    public User? InvitedByUser { get; set; }
}
