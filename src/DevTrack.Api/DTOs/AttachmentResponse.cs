namespace DevTrack.Api.DTOs;

public sealed class AttachmentResponse
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }
    public int UploadedByUserId { get; set; }
    public string UploadedByEmail { get; set; } = string.Empty;
}
