namespace DevTrack.Api.DTOs;

public sealed class AuthResponse
{
    public string Token { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
}
