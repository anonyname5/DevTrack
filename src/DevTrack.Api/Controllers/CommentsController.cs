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
public sealed class CommentsController(AppDbContext dbContext, IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet("/api/tasks/{taskId:int}/comments")]
    public async Task<IActionResult> GetTaskComments(int taskId)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        var task = await dbContext.Tasks
            .Include(t => t.Project)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return NotFound();

        bool hasAccess = task.Project.UserId == userId;
        
        if (!hasAccess && task.Project.OrganizationId.HasValue)
        {
            hasAccess = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == task.Project.OrganizationId.Value && m.UserId == userId);
        }

        if (!hasAccess) return Forbid();

        var comments = await dbContext.Comments
            .AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.TaskId == taskId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponse
            {
                Id = c.Id,
                Content = c.Content,
                TaskId = c.TaskId,
                UserId = c.UserId,
                UserEmail = c.User.Email,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("/api/tasks/{taskId:int}/comments")]
    public async Task<IActionResult> CreateComment(int taskId, CreateCommentRequest request)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        var task = await dbContext.Tasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return NotFound();

        bool hasAccess = task.Project.UserId == userId;
        
        if (!hasAccess && task.Project.OrganizationId.HasValue)
        {
            hasAccess = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == task.Project.OrganizationId.Value && m.UserId == userId);
        }

        if (!hasAccess) return Forbid();

        var comment = new Comment
        {
            Content = request.Content,
            TaskId = taskId,
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync();

        if (task.Project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                task.Project.OrganizationId.Value,
                userId.Value,
                "Task",
                taskId,
                "Commented",
                $"Added a comment: {request.Content.Substring(0, Math.Min(request.Content.Length, 50))}..."
            );
        }

        // Return the full response object
        var user = await dbContext.Users.FindAsync(userId.Value);
        
        return CreatedAtAction(nameof(GetTaskComments), new { taskId }, new CommentResponse
        {
            Id = comment.Id,
            Content = comment.Content,
            TaskId = comment.TaskId,
            UserId = comment.UserId,
            UserEmail = user?.Email ?? "Unknown",
            CreatedAt = comment.CreatedAt
        });
    }

    [HttpPut("/api/comments/{id:int}")]
    public async Task<IActionResult> UpdateComment(int id, UpdateCommentRequest request)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        var comment = await dbContext.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null) return NotFound();

        if (comment.UserId != userId) return Forbid(); // Only author can edit

        comment.Content = request.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Ok(new CommentResponse
        {
            Id = comment.Id,
            Content = comment.Content,
            TaskId = comment.TaskId,
            UserId = comment.UserId,
            UserEmail = comment.User.Email,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt
        });
    }

    [HttpDelete("/api/comments/{id:int}")]
    public async Task<IActionResult> DeleteComment(int id)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        var comment = await dbContext.Comments
            .Include(c => c.Task)
            .ThenInclude(t => t.Project)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null) return NotFound();

        // Allow author OR Org Admin/Owner
        bool isAuthor = comment.UserId == userId;
        bool isAdmin = false;

        if (comment.Task.Project.OrganizationId.HasValue)
        {
            var member = await dbContext.OrganizationMembers
                .FirstOrDefaultAsync(m => m.OrganizationId == comment.Task.Project.OrganizationId.Value && m.UserId == userId);
            
            if (member != null && (member.Role == OrganizationRole.Owner || member.Role == OrganizationRole.Admin))
            {
                isAdmin = true;
            }
        }

        if (!isAuthor && !isAdmin) return Forbid();

        dbContext.Comments.Remove(comment);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
