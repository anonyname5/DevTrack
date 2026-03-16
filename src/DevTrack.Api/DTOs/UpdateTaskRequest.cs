using System.ComponentModel.DataAnnotations;
using DevTrack.Api.Models;

namespace DevTrack.Api.DTOs;

public sealed class UpdateTaskRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; }
    public ProjectTaskStatus Status { get; set; }
    public DateTime? DueDate { get; set; }
    public int? AssigneeId { get; set; }
}
