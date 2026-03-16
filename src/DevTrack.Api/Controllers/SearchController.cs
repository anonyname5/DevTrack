using System.Security.Claims;
using DevTrack.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
[Route("/api/search")]
public sealed class SearchController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GlobalSearch([FromQuery] string q, [FromQuery] int? organizationId)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        string query = q?.Trim() ?? string.Empty;
        if (query.Length < 2)
        {
            return Ok(Array.Empty<object>());
        }

        IQueryable<int> memberOrgIdsQuery = dbContext.OrganizationMembers
            .Where(m => m.UserId == userId.Value)
            .Select(m => m.OrganizationId);

        if (organizationId.HasValue)
        {
            bool isMember = await memberOrgIdsQuery.AnyAsync(orgId => orgId == organizationId.Value);
            if (!isMember)
            {
                return Forbid();
            }

            memberOrgIdsQuery = memberOrgIdsQuery.Where(orgId => orgId == organizationId.Value);
        }

        List<int> memberOrgIds = await memberOrgIdsQuery.ToListAsync();

        var projects = await dbContext.Projects
            .AsNoTracking()
            .Where(p =>
                p.OrganizationId.HasValue &&
                memberOrgIds.Contains(p.OrganizationId.Value) &&
                p.Name.Contains(query))
            .OrderByDescending(p => p.CreatedAt)
            .Take(10)
            .Select(p => new
            {
                type = "project",
                id = p.Id,
                title = p.Name,
                subtitle = "Project",
                projectId = p.Id
            })
            .ToListAsync();

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Include(t => t.Project)
            .Where(t =>
                t.Project != null &&
                t.Project.OrganizationId.HasValue &&
                memberOrgIds.Contains(t.Project.OrganizationId.Value) &&
                (t.Title.Contains(query) || (t.Description != null && t.Description.Contains(query))))
            .OrderByDescending(t => t.CreatedAt)
            .Take(15)
            .Select(t => new
            {
                type = "task",
                id = t.Id,
                title = t.Title,
                subtitle = t.Project != null ? $"Task in {t.Project.Name}" : "Task",
                projectId = t.ProjectId
            })
            .ToListAsync();

        var results = projects.Concat(tasks).Take(20);
        return Ok(results);
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
