namespace DevTrack.Api.Models;

public sealed class Attachment
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public int? TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public int? CommentId { get; set; }
    public Comment? Comment { get; set; }
    public int UploadedByUserId { get; set; }
    public User? UploadedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
