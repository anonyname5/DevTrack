using DevTrack.Api.Services;

namespace DevTrack.Api.Tests;

public sealed class PasswordHasherServiceTests
{
    private readonly IPasswordHasherService _service = new PasswordHasherService();

    [Fact]
    public void Hash_ReturnsDifferentValue_FromPlainText()
    {
        const string plainTextPassword = "Example123!";

        string hash = _service.Hash(plainTextPassword);

        Assert.NotEqual(plainTextPassword, hash);
    }

    [Fact]
    public void Verify_ReturnsTrue_ForMatchingPasswordAndHash()
    {
        const string plainTextPassword = "Example123!";
        string hash = _service.Hash(plainTextPassword);

        bool isValid = _service.Verify(plainTextPassword, hash);

        Assert.True(isValid);
    }

    [Fact]
    public void Verify_ReturnsFalse_ForWrongPassword()
    {
        const string plainTextPassword = "Example123!";
        string hash = _service.Hash(plainTextPassword);

        bool isValid = _service.Verify("WrongPassword!", hash);

        Assert.False(isValid);
    }
}
