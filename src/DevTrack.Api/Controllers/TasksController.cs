using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
public sealed class TasksController(AppDbContext dbContext, IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet("/api/tasks/my")]
    public async Task<IActionResult> GetMyTasks([FromQuery] int? organizationId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        IQueryable<OrganizationMember> membershipQuery = dbContext.OrganizationMembers
            .Where(member => member.UserId == userId.Value);

        if (organizationId.HasValue)
        {
            membershipQuery = membershipQuery.Where(member => member.OrganizationId == organizationId.Value);
        }

        List<int> memberIds = await membershipQuery
            .Select(member => member.Id)
            .ToListAsync();

        if (memberIds.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Include(task => task.Project)
            .Where(task => task.AssigneeId.HasValue && memberIds.Contains(task.AssigneeId.Value))
            .OrderBy(task => task.Status)
            .ThenBy(task => task.DueDate ?? DateTime.MaxValue)
            .Take(25)
            .Select(task => new
            {
                task.Id,
                task.Title,
                task.Status,
                task.Priority,
                task.DueDate,
                task.ProjectId,
                ProjectName = task.Project != null ? task.Project.Name : "Project"
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpGet("/api/projects/{projectId:int}/tasks")]
    public async Task<IActionResult> GetProjectTasks(int projectId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        // Check project access via Organization or direct ownership
        var project = await dbContext.Projects
            .Include(p => p.Organization)
            .ThenInclude(o => o.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            return NotFound();
        }

        bool hasAccess = project.UserId == userId || 
                         (project.Organization != null && project.Organization.Members.Any(m => m.UserId == userId));

        if (!hasAccess)
        {
            return Forbid();
        }

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Where(task => task.ProjectId == projectId)
            .Select(task => new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Status,
                task.Priority,
                task.DueDate,
                task.AssigneeId,
                AssigneeName = task.Assignee != null && task.Assignee.User != null ? task.Assignee.User.Email : null, // Simple fallback
                task.ProjectId,
                task.CreatedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpPost("/api/projects/{projectId:int}/tasks")]
    public async Task<IActionResult> CreateTask(int projectId, CreateTaskRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var project = await dbContext.Projects
            .Include(p => p.Organization)
            .ThenInclude(o => o.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            return NotFound();
        }

        bool hasAccess = project.UserId == userId || 
                         (project.Organization != null && project.Organization.Members.Any(m => m.UserId == userId));

        if (!hasAccess)
        {
            return Forbid();
        }

        TaskItem task = new()
        {
            Title = request.Title.Trim(),
            Description = request.Description,
            Status = request.Status,
            Priority = request.Priority,
            DueDate = request.DueDate,
            AssigneeId = request.AssigneeId,
            ProjectId = projectId
        };

        dbContext.Tasks.Add(task);
        await dbContext.SaveChangesAsync();

        if (project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                project.OrganizationId.Value,
                userId.Value,
                "Task",
                task.Id,
                "Created",
                $"Created task: {task.Title}"
            );
        }

        return CreatedAtAction(nameof(GetProjectTasks), new { projectId }, new
        {
            task.Id,
            task.Title,
            task.Description,
            task.Status,
            task.Priority,
            task.DueDate,
            task.AssigneeId,
            task.ProjectId,
            task.CreatedAt
        });
    }

    [HttpPut("/api/tasks/{id:int}")]
    public async Task<IActionResult> UpdateTask(int id, UpdateTaskRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .ThenInclude(p => p.Organization)
            .ThenInclude(o => o.Members)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        bool hasAccess = task.Project.UserId == userId || 
                         (task.Project.Organization != null && task.Project.Organization.Members.Any(m => m.UserId == userId));

        if (!hasAccess)
        {
            return Forbid();
        }

        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.DueDate = request.DueDate;
        task.AssigneeId = request.AssigneeId;

        await dbContext.SaveChangesAsync();

        if (task.Project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                task.Project.OrganizationId.Value,
                userId.Value,
                "Task",
                task.Id,
                "Updated",
                $"Updated task details for: {task.Title}"
            );
        }

        return Ok(new
        {
            task.Id,
            task.Title,
            task.Description,
            task.Status,
            task.Priority,
            task.DueDate,
            task.AssigneeId,
            task.ProjectId,
            task.CreatedAt
        });
    }

    [HttpDelete("/api/tasks/{id:int}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .ThenInclude(p => p.Organization)
            .ThenInclude(o => o.Members)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        bool hasAccess = task.Project.UserId == userId || 
                         (task.Project.Organization != null && task.Project.Organization.Members.Any(m => m.UserId == userId));

        if (!hasAccess)
        {
            return Forbid();
        }

        dbContext.Tasks.Remove(task);
        await dbContext.SaveChangesAsync();

        if (task.Project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                task.Project.OrganizationId.Value,
                userId.Value,
                "Task",
                task.Id,
                "Deleted",
                $"Deleted task: {task.Title}"
            );
        }

        return NoContent();
    }

    [HttpPatch("/api/tasks/{id:int}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int id, TaskStatusRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        TaskItem? task = await dbContext.Tasks
            .Include(existingTask => existingTask.Project)
            .ThenInclude(p => p.Organization)
            .ThenInclude(o => o.Members)
            .SingleOrDefaultAsync(existingTask => existingTask.Id == id);

        if (task is null)
        {
            return NotFound();
        }

        bool hasAccess = task.Project.UserId == userId || 
                         (task.Project.Organization != null && task.Project.Organization.Members.Any(m => m.UserId == userId));

        if (!hasAccess)
        {
            return Forbid();
        }

        task.Status = request.Status;
        await dbContext.SaveChangesAsync();

        if (task.Project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                task.Project.OrganizationId.Value,
                userId.Value,
                "Task",
                task.Id,
                "StatusChanged",
                $"Changed status to {request.Status} for task: {task.Title}"
            );
        }

        return Ok(new
        {
            task.Id,
            task.Title,
            task.Description,
            task.Status,
            task.Priority,
            task.DueDate,
            task.AssigneeId,
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
