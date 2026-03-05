namespace DevTrack.Api.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "DevTrack";
    public string Audience { get; set; } = "DevTrack.Client";
    public int ExpirationMinutes { get; set; } = 60;
}
