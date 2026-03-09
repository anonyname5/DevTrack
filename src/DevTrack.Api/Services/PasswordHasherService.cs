namespace DevTrack.Api.Services;

public sealed class PasswordHasherService : IPasswordHasherService
{
    public string Hash(string plainTextPassword)
    {
        return BCrypt.Net.BCrypt.HashPassword(plainTextPassword);
    }

    public bool Verify(string plainTextPassword, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(plainTextPassword, passwordHash);
    }
}
