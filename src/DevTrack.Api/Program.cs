using System.Text;
using DevTrack.Api.Configuration;
using DevTrack.Api.Data;
using DevTrack.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

string dbHost = builder.Configuration["DB_HOST"] ?? "localhost";
string dbPort = builder.Configuration["DB_PORT"] ?? "3306";
string dbName = builder.Configuration["DB_NAME"] ?? "devtrack";
string dbUser = builder.Configuration["DB_USER"] ?? "root";
string dbPassword = builder.Configuration["DB_PASSWORD"] ?? "password";
string dbServerVersion = builder.Configuration["DB_SERVER_VERSION"] ?? "8.0.36-mysql";
string connectionString = $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};";

string jwtSecret = builder.Configuration["JWT_SECRET"] ?? builder.Configuration["Jwt:Secret"] ?? string.Empty;
string jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? builder.Configuration["Jwt:Issuer"] ?? "DevTrack";
string jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? builder.Configuration["Jwt:Audience"] ?? "DevTrack.Client";
int jwtExpirationMinutes = int.TryParse(
    builder.Configuration["JWT_EXPIRATION_MINUTES"] ?? builder.Configuration["Jwt:ExpirationMinutes"],
    out int parsedMinutes)
    ? parsedMinutes
    : 60;
string configuredCorsOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"] ?? string.Empty;
string[] corsOrigins = configuredCorsOrigins
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

if (corsOrigins.Length == 0)
{
    corsOrigins =
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ];
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCorsPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DevTrack API",
        Version = "v1"
    });

    OpenApiSecurityScheme securityScheme = new()
    {
        Name = "Authorization",
        Description = "Enter: Bearer {your JWT token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, securityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [securityScheme] = []
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.Parse(dbServerVersion),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

builder.Services.Configure<JwtOptions>(options =>
{
    options.Secret = jwtSecret;
    options.Issuer = jwtIssuer;
    options.Audience = jwtAudience;
    options.ExpirationMinutes = jwtExpirationMinutes;
});

byte[] jwtSecretBytes = Encoding.UTF8.GetBytes(jwtSecret);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(jwtSecretBytes),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<IProjectProgressService, ProjectProgressService>();
builder.Services.AddScoped<IPasswordHasherService, PasswordHasherService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

// Apply migrations at startup so new environments are bootstrapped automatically.
using (IServiceScope scope = app.Services.CreateScope())
{
    AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (dbContext.Database.IsRelational())
    {
        dbContext.Database.Migrate();
    }
    else
    {
        dbContext.Database.EnsureCreated();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("FrontendCorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
