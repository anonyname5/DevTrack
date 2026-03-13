using DevTrack.Api.Models;

namespace DevTrack.Api.DTOs;

public sealed class TaskStatusRequest
{
    public ProjectTaskStatus Status { get; set; }
}
