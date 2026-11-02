using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SkiaSharp;

namespace Sandugorea.Api.Tests;

public sealed class ProjectFlowTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static async Task<JsonElement> Json(HttpResponseMessage res)
    {
        Assert.True(res.IsSuccessStatusCode, $"{(int)res.StatusCode}: {await res.Content.ReadAsStringAsync()}");
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static async Task<string> CreateProject(HttpClient admin, string username, string password = "Customer-Pass-1")
    {
        var p = await Json(await admin.PostAsJsonAsync("/api/admin/projects", new
        {
            title = "Wedding Day", date = "2026-09-20", customerName = "Ana & Mihai",
            customerEmail = "ana@example.com", language = "ro", username, password,
        }));
        return p.GetProperty("id").GetString()!;
    }

    private async Task<HttpClient> Customer(string username, string password = "Customer-Pass-1")
    {
        var client = _factory.NewClient();
        await Json(await client.PostAsJsonAsync("/api/customer/auth/login", new { username, password }));
        return client;
    }

    [Fact]
    public async Task Full_flow_create_upload_send_and_customer_sees_only_own_photos()
    {
        var (admin, _) = await _factory.AdminAsync();

        var projectA = await CreateProject(admin, "ana.mihai");
        var projectB = await CreateProject(admin, "other.client");

        // Duplicate usernames are refused.
        var dup = await admin.PostAsJsonAsync("/api/admin/projects", new
        {
            title = "X", date = "2026-01-01", customerName = "X", customerEmail = "x@example.com",
            language = "en", username = "ana.mihai", password = "Customer-Pass-1",
        });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);

        var photoA = await Json(await admin.PostAsync($"/api/admin/projects/{projectA}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg())));
        var photoB = await Json(await admin.PostAsync($"/api/admin/projects/{projectB}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg())));
        Assert.Equal(3000, photoA.GetProperty("width").GetInt32());

        // Thumbs are generated, small and WebP.
        var thumb = await admin.GetAsync(photoA.GetProperty("thumbUrl").GetString());
        Assert.Equal("image/webp", thumb.Content.Headers.ContentType?.MediaType);
        using (var codec = SKCodec.Create(new MemoryStream(await thumb.Content.ReadAsByteArrayAsync())))
            Assert.Equal(800, Math.Max(codec.Info.Width, codec.Info.Height));

        // Not sent yet -> the customer can't sign in (same error as a wrong password).
        var early = await _factory.NewClient().PostAsJsonAsync("/api/customer/auth/login", new { username = "ana.mihai", password = "Customer-Pass-1" });
        Assert.Equal(HttpStatusCode.Unauthorized, early.StatusCode);

        var sent = await Json(await admin.PostAsJsonAsync($"/api/admin/projects/{projectA}/send", new { includeNewPassword = false }));
        Assert.True(sent.GetProperty("password").ValueKind == JsonValueKind.Null);
        var email = File.ReadAllText(Directory.GetFiles(Path.Combine(_factory.Root, "outbox")).Single());
        Assert.Contains("ana.mihai", email);
        Assert.Contains("https://sandugorea.test/client/login", email);
        await Json(await admin.PostAsJsonAsync($"/api/admin/projects/{projectB}/send", new { includeNewPassword = false }));

        var customer = await Customer("ana.mihai");
        var project = await Json(await customer.GetAsync("/api/customer/project"));
        var photos = project.GetProperty("photos");
        Assert.Equal(1, photos.GetArrayLength());
        var own = photos[0].GetProperty("previewUrl").GetString()!;
        Assert.StartsWith("/api/customer/photos/", own);
        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync(own)).StatusCode);

        // Another customer's photo id -> 404, not 403 (nothing to learn).
        var foreignId = photoB.GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.NotFound, (await customer.GetAsync($"/api/customer/photos/{foreignId}/original")).StatusCode);
        // And the admin photo endpoints are off limits for customers.
        Assert.Equal(HttpStatusCode.Unauthorized, (await customer.GetAsync(photoA.GetProperty("thumbUrl").GetString())).StatusCode);

        // The original download is the untouched file.
        var original = await customer.GetAsync(photos[0].GetProperty("originalUrl").GetString() + "?download=true");
        Assert.Equal("image/jpeg", original.Content.Headers.ContentType?.MediaType);
        Assert.Equal("IMG_0001.jpg", original.Content.Headers.ContentDisposition?.FileNameStar ?? original.Content.Headers.ContentDisposition?.FileName?.Trim('"'));

        // ZIP of all originals.
        var zip = await customer.GetAsync("/api/customer/project/zip");
        Assert.Equal(HttpStatusCode.OK, zip.StatusCode);
        using var archive = new ZipArchive(await zip.Content.ReadAsStreamAsync());
        Assert.Equal(["IMG_0001.jpg"], archive.Entries.Select(e => e.FullName));
    }

    [Fact]
    public async Task Disabling_or_resetting_the_password_signs_the_customer_out()
    {
        var (admin, _) = await _factory.AdminAsync();
        var id = await CreateProject(admin, "ana.mihai");
        await Json(await admin.PostAsync($"/api/admin/projects/{id}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg(400, 300))));
        await Json(await admin.PostAsJsonAsync($"/api/admin/projects/{id}/send", new { includeNewPassword = false }));

        var customer = await Customer("ana.mihai");
        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync("/api/customer/project")).StatusCode);

        // Disable -> immediately out.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchAsJsonAsync($"/api/admin/projects/{id}", new { active = false })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await customer.GetAsync("/api/customer/project")).StatusCode);

        // Enable again, sign in, then reset the password -> out again, old password dead.
        await admin.PatchAsJsonAsync($"/api/admin/projects/{id}", new { active = true });
        customer = await Customer("ana.mihai");
        var reset = await Json(await admin.PostAsync($"/api/admin/projects/{id}/password", null));
        var newPassword = reset.GetProperty("password").GetString()!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await customer.GetAsync("/api/customer/project")).StatusCode);

        var old = await _factory.NewClient().PostAsJsonAsync("/api/customer/auth/login", new { username = "ana.mihai", password = "Customer-Pass-1" });
        Assert.Equal(HttpStatusCode.Unauthorized, old.StatusCode);
        await Customer("ana.mihai", newPassword);
    }

    [Fact]
    public async Task Upload_rejects_files_that_are_not_images()
    {
        var (admin, _) = await _factory.AdminAsync();
        var id = await CreateProject(admin, "ana.mihai");

        var fake = await admin.PostAsync($"/api/admin/projects/{id}/photos",
            SecurityTests.PhotoForm("<script>alert(1)</script>"u8.ToArray(), "evil.jpg"));
        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);
        Assert.Contains("type", await fake.Content.ReadAsStringAsync());

        var detail = await Json(await admin.GetAsync($"/api/admin/projects/{id}"));
        Assert.Equal(0, detail.GetProperty("photos").GetArrayLength());
    }

    [Fact]
    public async Task Deleting_a_project_removes_its_files()
    {
        var (admin, _) = await _factory.AdminAsync();
        var id = await CreateProject(admin, "ana.mihai");
        await Json(await admin.PostAsync($"/api/admin/projects/{id}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg(400, 300))));
        var dir = Path.Combine(_factory.Root, "projects", Guid.Parse(id).ToString("N"));
        Assert.True(Directory.Exists(dir));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/projects/{id}")).StatusCode);
        Assert.False(Directory.Exists(dir));
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/admin/projects/{id}")).StatusCode);
    }

    [Fact]
    public async Task Send_with_new_password_emails_it_and_it_works()
    {
        var (admin, _) = await _factory.AdminAsync();
        var id = await CreateProject(admin, "ana.mihai");
        await Json(await admin.PostAsync($"/api/admin/projects/{id}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg(400, 300))));

        var sent = await Json(await admin.PostAsJsonAsync($"/api/admin/projects/{id}/send", new { includeNewPassword = true }));
        var password = sent.GetProperty("password").GetString()!;
        var email = File.ReadAllText(Directory.GetFiles(Path.Combine(_factory.Root, "outbox")).Single());
        Assert.Contains("Fotografiile tale sunt gata", email); // Romanian template (project language "ro")

        await Customer("ana.mihai", password);
    }
}
