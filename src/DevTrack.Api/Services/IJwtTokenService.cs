using DevTrack.Api.DTOs;
using DevTrack.Api.Models;

namespace DevTrack.Api.Services;

public interface IJwtTokenService
{
    AuthResponse GenerateToken(User user);
}
