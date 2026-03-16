using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DevTrack.Api.Data;
using DevTrack.Api.DTOs;
using DevTrack.Api.Models;
using DevTrack.Api.Services;
using DevTrack.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DevTrack.Api.Tests;

public sealed class AuthAndProjectsIntegrationTests(CustomWebApplicationFactory factory) : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory = factory;
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Register_ReturnsToken()
    {
        RegisterRequest request = new()
        {
            FullName = "Integration User",
            Email = $"register-{Guid.NewGuid():N}@example.com",
            Password = "Example123!"
        };

        HttpResponseMessage response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthResponse? body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
    }

    [Fact]
    public async Task Login_ReturnsToken_ForRegisteredUser()
    {
        string email = $"login-{Guid.NewGuid():N}@example.com";
        using IServiceScope scope = _factory.Services.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        IPasswordHasherService passwordHasherService = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();

        dbContext.Users.Add(new User
        {
            Email = email,
            PasswordHash = passwordHasherService.Hash("Example123!")
        });
        await dbContext.SaveChangesAsync();

        LoginRequest loginRequest = new()
        {
            Email = email,
            Password = "Example123!"
        };

        HttpResponseMessage response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthResponse? body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
    }

    [Fact]
    public async Task CreateProject_ReturnsCreated_ForAuthenticatedUser()
    {
        string email = $"project-{Guid.NewGuid():N}@example.com";
        RegisterRequest registerRequest = new()
        {
            FullName = "Project Owner",
            Email = email,
            Password = "Example123!"
        };

        HttpResponseMessage registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        AuthResponse? auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();

        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        CreateProjectRequest projectRequest = new()
        {
            Name = "Integration Test Project"
        };

        HttpResponseMessage response = await _client.PostAsJsonAsync("/api/projects", projectRequest);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
