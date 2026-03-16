using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(
    AppDbContext dbContext,
    IPasswordHasherService passwordHasherService,
    IJwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        string normalizedFullName = request.FullName.Trim();
        string normalizedEmail = request.Email.Trim().ToLowerInvariant();
        string? normalizedWorkspaceName = string.IsNullOrWhiteSpace(request.WorkspaceName)
            ? null
            : request.WorkspaceName.Trim();

        if (normalizedFullName.Length < 2)
        {
            return BadRequest(new { message = "Full name must be at least 2 characters." });
        }

        bool emailAlreadyExists = await dbContext.Users
            .AnyAsync(user => user.Email == normalizedEmail);

        if (emailAlreadyExists)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        User user = new()
        {
            FullName = normalizedFullName,
            Email = normalizedEmail,
            PasswordHash = passwordHasherService.Hash(request.Password)
        };

        string workspaceName = normalizedWorkspaceName ?? $"{normalizedFullName}'s Workspace";

        // Create default organization
        var organization = new Organization
        {
            Name = workspaceName
        };

        var member = new OrganizationMember
        {
            User = user,
            Organization = organization,
            Role = OrganizationRole.Owner
        };

        dbContext.Users.Add(user);
        dbContext.Organizations.Add(organization);
        dbContext.OrganizationMembers.Add(member);

        await dbContext.SaveChangesAsync();

        AuthResponse response = jwtTokenService.GenerateToken(user);
        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        User? user = await dbContext.Users
            .SingleOrDefaultAsync(existingUser => existingUser.Email == normalizedEmail);

        if (user is null || !passwordHasherService.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        AuthResponse response = jwtTokenService.GenerateToken(user);
        return Ok(response);
    }
}
