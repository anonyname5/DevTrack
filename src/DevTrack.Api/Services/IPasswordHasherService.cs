namespace DevTrack.Api.Services;

public interface IPasswordHasherService
{
    string Hash(string plainTextPassword);
    bool Verify(string plainTextPassword, string passwordHash);
}
