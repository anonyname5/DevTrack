using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class OrganizationsController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMyOrganizations()
    {
        int userId = GetUserId();

        var organizations = await dbContext.OrganizationMembers
            .AsNoTracking()
            .Where(member => member.UserId == userId)
            .Include(member => member.Organization)
            .Select(member => new
            {
                member.Organization!.Id,
                member.Organization.Name,
                member.Role,
                member.JoinedAt
            })
            .ToListAsync();

        return Ok(organizations);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationRequest request)
    {
        int userId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }

        var organization = new Organization
        {
            Name = request.Name.Trim()
        };

        var member = new OrganizationMember
        {
            Organization = organization,
            UserId = userId,
            Role = OrganizationRole.Owner
        };

        dbContext.Organizations.Add(organization);
        dbContext.OrganizationMembers.Add(member);

        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyOrganizations), new { id = organization.Id }, new
        {
            organization.Id,
            organization.Name,
            Role = OrganizationRole.Owner
        });
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(int id)
    {
        int userId = GetUserId();

        // Check if user is a member of the organization
        var membership = await dbContext.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == id && m.UserId == userId);

        if (membership == null)
        {
            return Forbid();
        }

        var members = await dbContext.OrganizationMembers
            .Where(m => m.OrganizationId == id)
            .Include(m => m.User)
            .Select(m => new
            {
                m.Id,
                m.UserId,
                m.User!.Email,
                m.Role,
                m.JoinedAt
            })
            .ToListAsync();

        return Ok(members);
    }

    private int GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.Parse(claimValue!);
    }
}

public sealed record CreateOrganizationRequest(string Name);
