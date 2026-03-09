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
public sealed class ProjectsController(AppDbContext dbContext, IProjectProgressService progressService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMyProjects()
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        List<Project> projects = await dbContext.Projects
            .AsNoTracking()
            .Where(project => project.UserId == userId.Value)
            .Include(project => project.Tasks)
            .ToListAsync();

        var response = projects.Select(project => new
        {
            project.Id,
            project.Name,
            project.CreatedAt,
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

        Project project = new()
        {
            Name = request.Name.Trim(),
            UserId = userId.Value
        };

        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyProjects), new { id = project.Id }, new
        {
            project.Id,
            project.Name,
            project.CreatedAt
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
            .SingleOrDefaultAsync(existingProject => existingProject.Id == id && existingProject.UserId == userId.Value);

        if (project is null)
        {
            return NotFound();
        }

        project.Name = request.Name.Trim();
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            project.Id,
            project.Name,
            project.CreatedAt
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
            .SingleOrDefaultAsync(existingProject => existingProject.Id == id && existingProject.UserId == userId.Value);

        if (project is null)
        {
            return NotFound();
        }

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
