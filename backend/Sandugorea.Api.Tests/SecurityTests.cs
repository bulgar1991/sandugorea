using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Sandugorea.Api.Security;

namespace Sandugorea.Api.Tests;

public sealed class SecurityTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public void Totp_matches_rfc6238_test_vector()
    {
        // RFC 6238 appendix B, SHA-1, T = 59s -> 94287082 (8 digits) -> last 6 digits.
        var secret = "12345678901234567890"u8.ToArray();
        Assert.Equal("287082", Totp.Code(secret, 59 / 30));
        Assert.Equal(secret, Base32.Decode(Base32.Encode(secret)));
    }

    [Theory]
    [InlineData("GET", "/api/admin/projects")]
    [InlineData("GET", "/api/admin/stats")]
    [InlineData("GET", "/api/admin/account/sessions")]
    [InlineData("GET", "/api/customer/project")]
    [InlineData("GET", "/api/customer/project/zip")]
    public async Task Private_endpoints_require_sign_in(string method, string url)
    {
        var res = await _factory.NewClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Post_without_csrf_header_is_rejected()
    {
        var client = _factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var res = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = "admin", password = "x" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Admin_password_alone_is_not_enough()
    {
        var client = _factory.NewClient();
        var login = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        login.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/projects")).StatusCode);

        var wrongCode = await client.PostAsJsonAsync("/api/admin/auth/verify", new { code = "000000" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrongCode.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/projects")).StatusCode);
    }

    [Fact]
    public async Task Admin_cookie_is_httponly_secure_and_samesite_strict()
    {
        var client = _factory.NewClient();
        await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        var body = await (await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var secret = Base32.Decode(body.GetProperty("secret").GetString()!);
        var verify = await client.PostAsJsonAsync("/api/admin/auth/verify", new { code = ApiFactory.CurrentCode(secret) });

        var cookie = verify.Headers.GetValues("Set-Cookie").First(c => c.StartsWith(CookieAuthSetup.AdminCookie));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Totp_code_cannot_be_replayed()
    {
        var (_, secret) = await _factory.AdminAsync();
        var usedCode = ApiFactory.CurrentCode(secret);

        var other = _factory.NewClient();
        await other.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        var replay = await other.PostAsJsonAsync("/api/admin/auth/verify", new { code = usedCode });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
    }

    [Fact]
    public async Task Admin_is_locked_after_five_failures_even_with_the_right_password()
    {
        var client = _factory.NewClient();
        for (var i = 0; i < 4; i++)
        {
            var res = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = "wrong" });
            Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        }
        var fifth = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = "wrong" });
        Assert.Equal((HttpStatusCode)423, fifth.StatusCode);

        var correct = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        Assert.Equal((HttpStatusCode)423, correct.StatusCode);
    }

    [Fact]
    public async Task Unknown_admin_and_wrong_password_look_the_same()
    {
        var client = _factory.NewClient();
        var unknown = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = "nobody", password = "x" });
        var wrong = await client.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = "x" });
        Assert.Equal(unknown.StatusCode, wrong.StatusCode);
        Assert.Equal(await unknown.Content.ReadAsStringAsync(), await wrong.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Changing_admin_password_signs_out_other_sessions()
    {
        var (first, secret) = await _factory.AdminAsync();

        var second = _factory.NewClient();
        await second.PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        (await second.PostAsJsonAsync("/api/admin/auth/verify", new { code = ApiFactory.CurrentCode(secret, 1) })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/admin/projects")).StatusCode);

        var weak = await first.PostAsJsonAsync("/api/admin/account/password", new { current = ApiFactory.AdminPassword, next = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        var change = await first.PostAsJsonAsync("/api/admin/account/password", new { current = ApiFactory.AdminPassword, next = "An0ther-Strong-Pass!" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await first.GetAsync("/api/admin/projects")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/admin/projects")).StatusCode);
    }

    [Fact]
    public async Task Security_headers_are_sent()
    {
        var res = await _factory.NewClient().GetAsync("/api/health");
        Assert.Equal("nosniff", res.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", res.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("frame-ancestors 'none'", res.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal("no-store", res.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task Booking_honeypot_is_silently_dropped_and_real_requests_are_emailed()
    {
        var client = _factory.NewClient();
        var bot = await client.PostAsJsonAsync("/api/booking", new
        {
            name = "Bot", email = "bot@example.com", message = "Buy cheap things now!!", consent = true, website = "http://spam",
        });
        Assert.Equal(HttpStatusCode.Accepted, bot.StatusCode);
        Assert.False(Directory.Exists(Path.Combine(_factory.Root, "outbox")));

        var invalid = await client.PostAsJsonAsync("/api/booking", new { name = "", email = "nope", message = "short", consent = false });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var real = await client.PostAsJsonAsync("/api/booking", new
        {
            name = "Ana", email = "ana@example.com", message = "We are getting married in June!", consent = true, type = "weddings",
        });
        Assert.Equal(HttpStatusCode.Accepted, real.StatusCode);
        Assert.Single(Directory.GetFiles(Path.Combine(_factory.Root, "outbox")));
    }

    internal static MultipartFormDataContent PhotoForm(byte[] bytes, string name = "IMG_0001.jpg")
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        return new MultipartFormDataContent { { content, "file", name } };
    }
}
