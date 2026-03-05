using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DevTrack.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProgressController(IProjectProgressService progressService) : ControllerBase
{
    [HttpPost("calculate")]
    public ActionResult<ProjectProgressResponse> Calculate([FromBody] List<TaskStatusRequest> request)
    {
        List<TaskItem> tasks = request
            .Select((task, index) => new TaskItem
            {
                Id = index + 1,
                Title = $"Task {index + 1}",
                IsCompleted = task.IsCompleted
            })
            .ToList();

        int completedTasks = tasks.Count(task => task.IsCompleted);
        int progress = progressService.CalculateProgressPercentage(tasks);

        ProjectProgressResponse response = new()
        {
            TotalTasks = tasks.Count,
            CompletedTasks = completedTasks,
            ProgressPercentage = progress
        };

        return Ok(response);
    }
}
