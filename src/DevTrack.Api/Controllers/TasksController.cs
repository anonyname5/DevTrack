using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
public sealed class TasksController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("api/projects/{projectId:int}/tasks")]
    public async Task<IActionResult> GetProjectTasks(int projectId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        bool ownsProject = await dbContext.Projects
            .AnyAsync(project => project.Id == projectId && project.UserId == userId.Value);

        if (!ownsProject)
        {
            return NotFound();
        }

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Where(task => task.ProjectId == projectId)
            .Select(task => new
            {
                task.Id,
                task.Title,
                task.IsCompleted,
                task.ProjectId,
                task.CreatedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpPost("api/projects/{projectId:int}/tasks")]
    public async Task<IActionResult> CreateTask(int projectId, CreateTaskRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        bool ownsProject = await dbContext.Projects
            .AnyAsync(project => project.Id == projectId && project.UserId == userId.Value);

        if (!ownsProject)
        {
            return NotFound();
        }

        TaskItem task = new()
        {
            Title = request.Title.Trim(),
            ProjectId = projectId
        };

        dbContext.Tasks.Add(task);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProjectTasks), new { projectId }, new
        {
            task.Id,
            task.Title,
            task.IsCompleted,
            task.ProjectId,
            task.CreatedAt
        });
    }

    [HttpPut("api/tasks/{id:int}")]
    public async Task<IActionResult> UpdateTask(int id, UpdateTaskRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null || task.Project?.UserId != userId.Value)
        {
            return NotFound();
        }

        task.Title = request.Title.Trim();
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            task.Id,
            task.Title,
            task.IsCompleted,
            task.ProjectId,
            task.CreatedAt
        });
    }

    [HttpDelete("api/tasks/{id:int}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null || task.Project?.UserId != userId.Value)
        {
            return NotFound();
        }

        dbContext.Tasks.Remove(task);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("api/tasks/{id:int}/complete")]
    public async Task<IActionResult> SetTaskCompletion(int id, TaskStatusRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null || task.Project?.UserId != userId.Value)
        {
            return NotFound();
        }

        task.IsCompleted = request.IsCompleted;
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            task.Id,
            task.Title,
            task.IsCompleted,
            task.ProjectId,
            task.CreatedAt
        });
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
