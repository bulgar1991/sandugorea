namespace Sandugorea.Api.Security;

public static class AuthSchemes
{
    /// <summary>Signed-in photographer (after password + TOTP).</summary>
    public const string Admin = "Admin";

    /// <summary>Signed-in customer; can see exactly one project.</summary>
    public const string Customer = "Customer";
}

public static class Policies
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}

public static class Claims
{
    public const string AdminId = "sg:admin";
    public const string SessionId = "sg:sid";
    public const string ProjectId = "sg:project";
    public const string CredentialStamp = "sg:stamp";
}

public static class RateLimits
{
    public const string Auth = "auth";
    public const string Booking = "booking";
}

public static class HttpContextExtensions
{
    public static string? ClientIp(this HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString();

    public static string? ClientAgent(this HttpContext ctx)
    {
        var ua = ctx.Request.Headers.UserAgent.ToString();
        return string.IsNullOrEmpty(ua) ? null : ua.Length > 256 ? ua[..256] : ua;
    }

    public static Guid ClaimGuid(this HttpContext ctx, string type) =>
        Guid.TryParse(ctx.User.FindFirst(type)?.Value, out var id) ? id : Guid.Empty;
}
