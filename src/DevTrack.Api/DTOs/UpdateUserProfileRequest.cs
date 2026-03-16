using System.ComponentModel.DataAnnotations;

namespace DevTrack.Api.DTOs;

public sealed class UpdateUserProfileRequest
{
    [Required]
    [MinLength(2)]
    [MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
