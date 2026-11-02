using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Sandugorea.Api.Security;
using SkiaSharp;

namespace Sandugorea.Api.Tests;

/// <summary>
/// Runs the real app in memory with its own temp storage folder (database, photos, outbox).
/// Uses the "Production" environment and an https base address, so cookies behave exactly
/// like on the VPS (Secure, SameSite=Strict).
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string AdminUser = "admin";
    public const string AdminPassword = "Test-Admin-Pass-1!";

    public string Root { get; } = Path.Combine(Path.GetTempPath(), "sg-tests-" + Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("Storage:Root", Root);
        builder.UseSetting("Admin:Username", AdminUser);
        builder.UseSetting("Admin:Password", AdminPassword);
        builder.UseSetting("Security:AuthRequestsPerMinute", "1000");
        builder.UseSetting("Security:BookingRequestsPer10Minutes", "1000");
        builder.UseSetting("Site:BaseUrl", "https://sandugorea.test");
    }

    public HttpClient NewClient()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
            AllowAutoRedirect = false,
        });
        client.DefaultRequestHeaders.Add(SecurityMiddleware.CsrfHeader, SecurityMiddleware.CsrfValue);
        return client;
    }

    /// <summary>Signs in as admin (enrolling TOTP on first use). Returns the client and the TOTP secret.</summary>
    public async Task<(HttpClient Client, byte[] Secret)> AdminAsync()
    {
        var client = NewClient();
        var login = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = AdminUser, password = AdminPassword });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("enroll", body.GetProperty("next").GetString());
        var secret = Base32.Decode(body.GetProperty("secret").GetString()!);

        var verify = await client.PostAsJsonAsync("/api/admin/auth/verify", new { code = CurrentCode(secret) });
        verify.EnsureSuccessStatusCode();
        return (client, secret);
    }

    public static string CurrentCode(byte[] secret, int stepOffset = 0) =>
        Totp.Code(secret, Totp.CurrentStep(DateTimeOffset.UtcNow) + stepOffset);

    public static byte[] Jpeg(int width = 3000, int height = 2000)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.SteelBlue);
            canvas.DrawCircle(width / 2f, height / 2f, height / 3f, new SKPaint { Color = SKColors.Gold });
        }
        using var image = SKImage.FromBitmap(bitmap);
        return image.Encode(SKEncodedImageFormat.Jpeg, 85).ToArray();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try { Directory.Delete(Root, recursive: true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }
}
