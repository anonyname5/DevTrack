using System.ComponentModel.DataAnnotations;

namespace DevTrack.Api.DTOs;

public sealed class RegisterRequest
{
    [Required]
    [MinLength(2)]
    [MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? WorkspaceName { get; set; }
}
