using System.ComponentModel.DataAnnotations;

namespace DevTrack.Api.DTOs;

public sealed class UpdateTaskRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
}
