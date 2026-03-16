using System.ComponentModel.DataAnnotations;

namespace DevTrack.Api.DTOs;

public sealed class CreateCommentRequest
{
    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;
}
