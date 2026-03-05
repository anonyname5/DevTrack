using DevTrack.Api.Models;
using DevTrack.Api.Services;

namespace DevTrack.Api.Tests;

public sealed class ProjectProgressServiceTests
{
    private readonly IProjectProgressService _service = new ProjectProgressService();

    [Fact]
    public void CalculateProgressPercentage_ReturnsZero_WhenNoTasks()
    {
        List<TaskItem> tasks = [];

        int result = _service.CalculateProgressPercentage(tasks);

        Assert.Equal(0, result);
    }

    [Fact]
    public void CalculateProgressPercentage_ReturnsRoundedPercentage_WhenTasksPartiallyCompleted()
    {
        List<TaskItem> tasks =
        [
            new TaskItem { IsCompleted = true },
            new TaskItem { IsCompleted = true },
            new TaskItem { IsCompleted = false }
        ];

        int result = _service.CalculateProgressPercentage(tasks);

        Assert.Equal(67, result);
    }

    [Fact]
    public void CalculateProgressPercentage_ReturnsOneHundred_WhenAllTasksCompleted()
    {
        List<TaskItem> tasks =
        [
            new TaskItem { IsCompleted = true },
            new TaskItem { IsCompleted = true }
        ];

        int result = _service.CalculateProgressPercentage(tasks);

        Assert.Equal(100, result);
    }
}
