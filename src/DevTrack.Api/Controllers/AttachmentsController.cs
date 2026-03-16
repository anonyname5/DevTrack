using System.Security.Claims;
using System.Linq.Expressions;
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
public sealed class AttachmentsController(
    AppDbContext dbContext,
    IFileStorageService fileStorageService,
    IActivityLogService activityLogService) : ControllerBase
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    [HttpGet("/api/tasks/{taskId:int}/attachments")]
    public async Task<IActionResult> GetTaskAttachments(int taskId)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        TaskItem? task = await dbContext.Tasks
            .AsNoTracking()
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null) return NotFound();
        if (!await HasTaskAccessAsync(task, userId.Value)) return Forbid();

        List<AttachmentResponse> attachments = await dbContext.Attachments
            .AsNoTracking()
            .Where(a => a.TaskId == taskId)
            .Include(a => a.UploadedByUser)
            .OrderByDescending(a => a.CreatedAt)
            .Select(ToAttachmentResponse())
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpPost("/api/tasks/{taskId:int}/attachments")]
    public async Task<IActionResult> UploadTaskAttachment(int taskId, [FromForm] IFormFile? file)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (file is null) return BadRequest(new { message = "File is required." });

        TaskItem? task = await dbContext.Tasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null) return NotFound();
        if (!await HasTaskAccessAsync(task, userId.Value)) return Forbid();

        IActionResult? validationFailure = ValidateFile(file);
        if (validationFailure is not null) return validationFailure;

        StoredFileResult stored = await fileStorageService.SaveAsync(file, HttpContext.RequestAborted);
        Attachment attachment = new()
        {
            TaskId = taskId,
            UploadedByUserId = userId.Value,
            FileName = file.FileName.Trim(),
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            StoragePath = stored.StoragePath
        };

        dbContext.Attachments.Add(attachment);
        await dbContext.SaveChangesAsync();

        if (task.Project?.OrganizationId is int orgId)
        {
            await activityLogService.LogAsync(
                orgId,
                userId.Value,
                "Task",
                taskId,
                "AttachmentAdded",
                $"Attached file: {attachment.FileName}");
        }

        AttachmentResponse response = await dbContext.Attachments
            .AsNoTracking()
            .Where(a => a.Id == attachment.Id)
            .Include(a => a.UploadedByUser)
            .Select(ToAttachmentResponse())
            .SingleAsync();

        return Created($"/api/attachments/{attachment.Id}", response);
    }

    [HttpGet("/api/comments/{commentId:int}/attachments")]
    public async Task<IActionResult> GetCommentAttachments(int commentId)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        Comment? comment = await dbContext.Comments
            .AsNoTracking()
            .Include(c => c.Task)
            .ThenInclude(t => t!.Project)
            .FirstOrDefaultAsync(c => c.Id == commentId);

        if (comment is null || comment.Task is null) return NotFound();
        if (!await HasTaskAccessAsync(comment.Task, userId.Value)) return Forbid();

        List<AttachmentResponse> attachments = await dbContext.Attachments
            .AsNoTracking()
            .Where(a => a.CommentId == commentId)
            .Include(a => a.UploadedByUser)
            .OrderByDescending(a => a.CreatedAt)
            .Select(ToAttachmentResponse())
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpPost("/api/comments/{commentId:int}/attachments")]
    public async Task<IActionResult> UploadCommentAttachment(int commentId, [FromForm] IFormFile? file)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (file is null) return BadRequest(new { message = "File is required." });

        Comment? comment = await dbContext.Comments
            .Include(c => c.Task)
            .ThenInclude(t => t!.Project)
            .FirstOrDefaultAsync(c => c.Id == commentId);

        if (comment is null || comment.Task is null) return NotFound();
        if (!await HasTaskAccessAsync(comment.Task, userId.Value)) return Forbid();

        IActionResult? validationFailure = ValidateFile(file);
        if (validationFailure is not null) return validationFailure;

        StoredFileResult stored = await fileStorageService.SaveAsync(file, HttpContext.RequestAborted);
        Attachment attachment = new()
        {
            CommentId = commentId,
            UploadedByUserId = userId.Value,
            FileName = file.FileName.Trim(),
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            StoragePath = stored.StoragePath
        };

        dbContext.Attachments.Add(attachment);
        await dbContext.SaveChangesAsync();

        if (comment.Task.Project?.OrganizationId is int orgId)
        {
            await activityLogService.LogAsync(
                orgId,
                userId.Value,
                "Task",
                comment.TaskId,
                "CommentAttachmentAdded",
                $"Attached file to comment: {attachment.FileName}");
        }

        AttachmentResponse response = await dbContext.Attachments
            .AsNoTracking()
            .Where(a => a.Id == attachment.Id)
            .Include(a => a.UploadedByUser)
            .Select(ToAttachmentResponse())
            .SingleAsync();

        return Created($"/api/attachments/{attachment.Id}", response);
    }

    [HttpGet("/api/attachments/{id:int}/download")]
    public async Task<IActionResult> DownloadAttachment(int id)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        Attachment? attachment = await dbContext.Attachments
            .AsNoTracking()
            .Include(a => a.Task)
            .ThenInclude(t => t!.Project)
            .Include(a => a.Comment)
            .ThenInclude(c => c!.Task)
            .ThenInclude(t => t!.Project)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attachment is null) return NotFound();

        TaskItem? task = attachment.Task ?? attachment.Comment?.Task;
        if (task is null) return NotFound();
        if (!await HasTaskAccessAsync(task, userId.Value)) return Forbid();

        FileStream? stream = await fileStorageService.OpenReadAsync(attachment.StoragePath, HttpContext.RequestAborted);
        if (stream is null) return NotFound(new { message = "File not found on disk." });

        return File(stream, attachment.ContentType, attachment.FileName);
    }

    [HttpDelete("/api/attachments/{id:int}")]
    public async Task<IActionResult> DeleteAttachment(int id)
    {
        int? userId = GetUserId();
        if (userId is null) return Unauthorized();

        Attachment? attachment = await dbContext.Attachments
            .Include(a => a.Task)
            .ThenInclude(t => t!.Project)
            .Include(a => a.Comment)
            .ThenInclude(c => c!.Task)
            .ThenInclude(t => t!.Project)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attachment is null) return NotFound();

        TaskItem? task = attachment.Task ?? attachment.Comment?.Task;
        if (task is null) return NotFound();
        if (!await HasTaskAccessAsync(task, userId.Value)) return Forbid();

        bool isUploader = attachment.UploadedByUserId == userId.Value;
        bool isOrgAdminOrOwner = false;
        if (task.Project?.OrganizationId is int orgId)
        {
            OrganizationMember? member = await dbContext.OrganizationMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId.Value);

            isOrgAdminOrOwner = member is not null && (member.Role == OrganizationRole.Owner || member.Role == OrganizationRole.Admin);
        }

        if (!isUploader && !isOrgAdminOrOwner)
        {
            return Forbid();
        }

        string storagePath = attachment.StoragePath;
        dbContext.Attachments.Remove(attachment);
        await dbContext.SaveChangesAsync();
        await fileStorageService.DeleteIfExistsAsync(storagePath, HttpContext.RequestAborted);

        return NoContent();
    }

    private async Task<bool> HasTaskAccessAsync(TaskItem task, int userId)
    {
        int? organizationId = task.Project?.OrganizationId;
        if (task.Project?.UserId == userId)
        {
            return true;
        }

        if (!organizationId.HasValue)
        {
            return false;
        }

        return await dbContext.OrganizationMembers
            .AsNoTracking()
            .AnyAsync(m => m.OrganizationId == organizationId.Value && m.UserId == userId);
    }

    private IActionResult? ValidateFile(IFormFile file)
    {
        if (file.Length <= 0)
        {
            return BadRequest(new { message = "Cannot upload empty files." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { message = "File too large. Max allowed size is 10 MB." });
        }

        string fileName = file.FileName.Trim();
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return BadRequest(new { message = "Invalid file name." });
        }

        return null;
    }

    private static Expression<Func<Attachment, AttachmentResponse>> ToAttachmentResponse()
        => attachment => new AttachmentResponse
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
            SizeBytes = attachment.SizeBytes,
            CreatedAt = attachment.CreatedAt,
            UploadedByUserId = attachment.UploadedByUserId,
            UploadedByEmail = attachment.UploadedByUser != null ? attachment.UploadedByUser.Email : "Unknown"
        };

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
