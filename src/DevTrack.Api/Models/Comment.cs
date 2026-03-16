namespace DevTrack.Api.Models;

public sealed class Comment
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    
    public int TaskId { get; set; }
    public TaskItem? Task { get; set; }
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public List<Attachment> Attachments { get; set; } = [];
    public List<CommentMention> Mentions { get; set; } = [];
}
