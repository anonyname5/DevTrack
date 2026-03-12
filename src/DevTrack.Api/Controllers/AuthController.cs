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
        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        bool emailAlreadyExists = await dbContext.Users
            .AnyAsync(user => user.Email == normalizedEmail);

        if (emailAlreadyExists)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        User user = new()
        {
            Email = normalizedEmail,
            PasswordHash = passwordHasherService.Hash(request.Password)
        };

        // Create default organization
        var organization = new Organization
        {
            Name = $"{user.Email}'s Workspace"
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
