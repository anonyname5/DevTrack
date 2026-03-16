namespace DevTrack.Api.Models;

public sealed class CommentMention
{
    public int Id { get; set; }
    public int CommentId { get; set; }
    public Comment? Comment { get; set; }
    public int MentionedUserId { get; set; }
    public User? MentionedUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
