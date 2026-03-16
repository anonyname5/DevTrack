using System.Security.Claims;
using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTrack.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class UsersController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe()
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId.Value)
            .Select(u => new UserProfileResponse
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                CreatedAt = u.CreatedAt
            })
            .SingleOrDefaultAsync();

        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserProfileResponse>> UpdateMe(UpdateUserProfileRequest request)
    {
        int? userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await dbContext.Users
            .SingleOrDefaultAsync(u => u.Id == userId.Value);

        if (user is null)
        {
            return NotFound();
        }

        string normalizedName = request.FullName.Trim();
        if (normalizedName.Length < 2)
        {
            return BadRequest(new { message = "Full name must be at least 2 characters." });
        }

        string normalizedEmail = request.Email.Trim().ToLowerInvariant();

        bool emailTaken = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id != userId.Value && u.Email == normalizedEmail);

        if (emailTaken)
        {
            return Conflict(new { message = "Email is already in use by another account." });
        }

        user.FullName = normalizedName;
        user.Email = normalizedEmail;
        await dbContext.SaveChangesAsync();

        return Ok(new UserProfileResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        });
    }

    private int? GetUserId()
    {
        string? claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claimValue, out int userId) ? userId : null;
    }
}
