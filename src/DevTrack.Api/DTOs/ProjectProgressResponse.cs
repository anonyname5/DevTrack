namespace DevTrack.Api.DTOs;

public sealed class ProjectProgressResponse
{
    public int TotalTasks { get; init; }
    public int CompletedTasks { get; init; }
    public int ProgressPercentage { get; init; }
}
