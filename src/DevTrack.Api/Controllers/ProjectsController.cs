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
[Route("api/[controller]")]
public sealed class ProjectsController(AppDbContext dbContext, IProjectProgressService progressService, IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMyProjects([FromQuery] int? organizationId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        IQueryable<Project> query = dbContext.Projects
            .AsNoTracking()
            .Include(project => project.Tasks);

        if (organizationId.HasValue)
        {
            // Verify membership
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == organizationId.Value && m.UserId == userId.Value);
            
            if (!isMember)
            {
                return Forbid();
            }

            query = query.Where(p => p.OrganizationId == organizationId.Value);
        }
        else
        {
            // Return all projects from all organizations user is a member of
            var userOrgIds = await dbContext.OrganizationMembers
                .Where(m => m.UserId == userId.Value)
                .Select(m => m.OrganizationId)
                .ToListAsync();

            query = query.Where(p => p.OrganizationId.HasValue && userOrgIds.Contains(p.OrganizationId.Value));
        }

        List<Project> projects = await query.ToListAsync();

        var response = projects.Select(project => new
        {
            project.Id,
            project.Name,
            project.CreatedAt,
            project.OrganizationId,
            progressPercentage = progressService.CalculateProgressPercentage(project.Tasks)
        });

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject(CreateProjectRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        int targetOrgId;

        if (request.OrganizationId.HasValue)
        {
            targetOrgId = request.OrganizationId.Value;
            // Verify membership
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == targetOrgId && m.UserId == userId.Value);
            
            if (!isMember)
            {
                return Forbid();
            }
        }
        else
        {
            // Fallback: Find the user's first organization (likely their personal workspace)
            var firstOrg = await dbContext.OrganizationMembers
                .Where(m => m.UserId == userId.Value && m.Role == OrganizationRole.Owner)
                .Select(m => m.OrganizationId)
                .FirstOrDefaultAsync();
            
            if (firstOrg == 0)
            {
                return BadRequest("No organization found. Please create an organization first.");
            }
            targetOrgId = firstOrg;
        }

        Project project = new()
        {
            Name = request.Name.Trim(),
            UserId = userId.Value,
            OrganizationId = targetOrgId
        };

        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync();

        if (project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                project.OrganizationId.Value,
                userId.Value,
                "Project",
                project.Id,
                "Created",
                $"Created project: {project.Name}"
            );
        }

        return CreatedAtAction(nameof(GetMyProjects), new { id = project.Id }, new
        {
            project.Id,
            project.Name,
            project.CreatedAt,
            project.OrganizationId
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProject(int id, UpdateProjectRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        Project? project = await dbContext.Projects
            .Include(p => p.Organization)
            .SingleOrDefaultAsync(p => p.Id == id);

        if (project is null)
        {
            return NotFound();
        }

        // Check if user is member of the project's organization
        if (project.OrganizationId.HasValue)
        {
            bool isMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == project.OrganizationId.Value && m.UserId == userId.Value);
            
            if (!isMember)
            {
                return Forbid();
            }
        }
        else
        {
            if (project.UserId != userId.Value)
            {
                return Forbid();
            }
        }

        project.Name = request.Name.Trim();
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            project.Id,
            project.Name,
            project.CreatedAt,
            project.OrganizationId
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        Project? project = await dbContext.Projects
            .SingleOrDefaultAsync(p => p.Id == id);

        if (project is null)
        {
            return NotFound();
        }

        // Check permission: Must be Owner/Admin of Org OR Creator of Project
        if (project.OrganizationId.HasValue)
        {
            var member = await dbContext.OrganizationMembers
                .FirstOrDefaultAsync(m => m.OrganizationId == project.OrganizationId.Value && m.UserId == userId.Value);
            
            if (member == null)
            {
                return Forbid();
            }

            // Allow if creator OR if Org Admin/Owner
            if (project.UserId != userId.Value && member.Role != OrganizationRole.Owner && member.Role != OrganizationRole.Admin)
            {
                return Forbid();
            }
        }
        else
        {
            if (project.UserId != userId.Value)
            {
                return Forbid();
            }
        }

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync();

        if (project.OrganizationId.HasValue)
        {
            await activityLogService.LogAsync(
                project.OrganizationId.Value,
                userId.Value,
                "Project",
                project.Id,
                "Deleted",
                $"Deleted project: {project.Name}"
            );
        }

        return NoContent();
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
