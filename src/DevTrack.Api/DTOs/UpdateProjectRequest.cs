using System.ComponentModel.DataAnnotations;

namespace DevTrack.Api.DTOs;

public sealed class UpdateProjectRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
