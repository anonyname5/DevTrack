namespace DevTrack.Api.DTOs;

public sealed class ActivityLogResponse
{
    public int Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public int UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime CreatedAt { get; set; }
}
