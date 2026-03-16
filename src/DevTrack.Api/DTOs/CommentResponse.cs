namespace DevTrack.Api.DTOs;

public sealed class CommentResponse
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<AttachmentResponse> Attachments { get; set; } = [];
}
