using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DevTrack.Api.Configuration;
using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DevTrack.Api.Services;

public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public AuthResponse GenerateToken(User user)
    {
        if (string.IsNullOrWhiteSpace(_options.Secret) || _options.Secret.Length < 32)
        {
            throw new InvalidOperationException("JWT secret must be set and at least 32 characters long.");
        }

        DateTime expiresAtUtc = DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes);
        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_options.Secret));
        SigningCredentials credentials = new(key, SecurityAlgorithms.HmacSha256);

        List<Claim> claims =
        [
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        ];

        JwtSecurityToken token = new(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials
        );

        string tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponse
        {
            Token = tokenString,
            ExpiresAtUtc = expiresAtUtc
        };
    }
}
