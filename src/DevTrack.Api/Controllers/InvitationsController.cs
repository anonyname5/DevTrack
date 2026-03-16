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
public sealed class InvitationsController(AppDbContext dbContext) : ControllerBase
{
    [HttpPost("/api/invitations")]
    public async Task<IActionResult> InviteMember([FromBody] InviteMemberRequest request)
    {
        int userId = GetUserId();

        // 1. Verify user is admin/owner of the organization
        var membership = await dbContext.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == request.OrganizationId && m.UserId == userId);

        if (membership == null || (membership.Role != OrganizationRole.Owner && membership.Role != OrganizationRole.Admin))
        {
            return Forbid();
        }

        // 2. Check if user is already a member
        var existingUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existingUser != null)
        {
            bool isAlreadyMember = await dbContext.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == request.OrganizationId && m.UserId == existingUser.Id);
            
            if (isAlreadyMember)
            {
                return Conflict("User is already a member of this organization.");
            }
        }

        // 3. Create Invitation
        var invitation = new Invitation
        {
            Email = request.Email,
            OrganizationId = request.OrganizationId,
            Role = request.Role,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            InvitedByUserId = userId
        };

        dbContext.Invitations.Add(invitation);
        await dbContext.SaveChangesAsync();

        // In a real app, we would send an email here with the link: /accept-invite?token=...
        return Ok(new { invitation.Token, invitation.ExpiresAt });
    }

    [HttpPost("/api/invitations/accept")]
    public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        int userId = GetUserId();

        var invitation = await dbContext.Invitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Token == request.Token);

        if (invitation == null)
        {
            return NotFound("Invitation not found.");
        }

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest("Invitation has expired.");
        }

        // Verify the accepting user matches the invited email (optional, but good for security if email is verified)
        // For now, we'll allow accepting if logged in, but we should probably check email match if we had email verification.
        var user = await dbContext.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        if (!string.Equals(user.Email, invitation.Email, StringComparison.OrdinalIgnoreCase))
        {
             // Optional: Decide if we want to enforce email matching. 
             // For this MVP, let's enforce it to prevent link sharing abuse.
             return BadRequest("This invitation was sent to a different email address.");
        }

        // Add to Org
        var member = new OrganizationMember
        {
            UserId = userId,
            OrganizationId = invitation.OrganizationId,
            Role = invitation.Role
        };

        dbContext.OrganizationMembers.Add(member);
        dbContext.Invitations.Remove(invitation); // Consume invitation
        await dbContext.SaveChangesAsync();

        return Ok(new { message = "Joined organization successfully.", organizationId = invitation.OrganizationId });
    }

    [HttpGet("/api/invitations/pending")]
    public async Task<IActionResult> GetPendingInvitations([FromQuery] int organizationId)
    {
        int userId = GetUserId();

        var membership = await dbContext.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId);

        if (membership == null || (membership.Role != OrganizationRole.Owner && membership.Role != OrganizationRole.Admin))
        {
            return Forbid();
        }

        var invitations = await dbContext.Invitations
            .Where(i => i.OrganizationId == organizationId)
            .Select(i => new
            {
                i.Id,
                i.Email,
                i.Role,
                i.CreatedAt,
                i.ExpiresAt
            })
            .ToListAsync();

        return Ok(invitations);
    }

    [HttpDelete("/api/invitations/{id}")]
    public async Task<IActionResult> RevokeInvitation(int id)
    {
        int userId = GetUserId();

        var invitation = await dbContext.Invitations.FindAsync(id);
        if (invitation == null) return NotFound();

        var membership = await dbContext.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == invitation.OrganizationId && m.UserId == userId);

        if (membership == null || (membership.Role != OrganizationRole.Owner && membership.Role != OrganizationRole.Admin))
        {
            return Forbid();
        }

        dbContext.Invitations.Remove(invitation);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private int GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.Parse(claimValue!);
    }
}

public sealed record InviteMemberRequest(string Email, int OrganizationId, OrganizationRole Role = OrganizationRole.Member);
public sealed record AcceptInvitationRequest(string Token);
