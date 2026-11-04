using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;

namespace Sandugorea.Api.Tests;

/// <summary>Originals moving to Google Drive (a fake one) and being served from there.</summary>
public sealed class DriveTests : IDisposable
{
    private readonly FakeGoogle _google = new();
    private readonly ApiFactory _factory;

    public DriveTests() => _factory = new ApiFactory { Google = _google };

    public void Dispose() => _factory.Dispose();

    private static async Task<JsonElement> Json(HttpResponseMessage res)
    {
        Assert.True(res.IsSuccessStatusCode, $"{(int)res.StatusCode}: {await res.Content.ReadAsStringAsync()}");
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>Admin presses "Connect", Google sends the browser back with a code.</summary>
    private async Task<string> Connect(HttpClient admin)
    {
        var url = (await Json(await admin.PostAsync("/api/admin/drive/connect", null))).GetProperty("url").GetString()!;
        var query = HttpUtility.ParseQueryString(new Uri(url).Query);
        Assert.Equal("https://www.googleapis.com/auth/drive.file", query["scope"]);
        Assert.Equal("S256", query["code_challenge_method"]);
        Assert.Equal("https://sandugorea.test/api/drive/callback", query["redirect_uri"]);
        var state = query["state"]!;

        // The callback comes without the admin cookie (cross-site redirect): a fresh client.
        var callback = await _factory.NewClient().GetAsync(
            $"/api/drive/callback?code={FakeGoogle.Code}&state={Uri.EscapeDataString(state)}");
        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        Assert.Equal("/admin?drive=connected", callback.Headers.Location?.OriginalString);
        return state;
    }

    private async Task<JsonElement> WaitUntilMoved(HttpClient admin)
    {
        for (var i = 0; i < 100; i++)
        {
            var status = await Json(await admin.GetAsync("/api/admin/drive"));
            if (status.GetProperty("pendingPhotos").GetInt32() == 0) return status;
            await Task.Delay(100);
        }
        throw new TimeoutException("Photos were not moved to Drive.");
    }

    private static async Task<string> CreateProject(HttpClient admin)
    {
        var p = await Json(await admin.PostAsJsonAsync("/api/admin/projects", new
        {
            title = "Family Day", date = "2026-10-04", customerName = "Elena",
            customerEmail = "elena@example.com", language = "de", username = "elena.family", password = "Customer-Pass-1",
        }));
        return p.GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task Connecting_needs_a_valid_single_use_state()
    {
        var (admin, _) = await _factory.AdminAsync();

        var before = await Json(await admin.GetAsync("/api/admin/drive"));
        Assert.True(before.GetProperty("configured").GetBoolean());
        Assert.False(before.GetProperty("connected").GetBoolean());

        // Anonymous visitors can't start a connection, and a forged state is refused.
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.NewClient().PostAsync("/api/admin/drive/connect", null)).StatusCode);
        var forged = await _factory.NewClient().GetAsync($"/api/drive/callback?code={FakeGoogle.Code}&state=forged");
        Assert.Equal("/admin?drive=error", forged.Headers.Location?.OriginalString);
        Assert.False((await Json(await admin.GetAsync("/api/admin/drive"))).GetProperty("connected").GetBoolean());

        var state = await Connect(admin);
        var status = await Json(await admin.GetAsync("/api/admin/drive"));
        Assert.True(status.GetProperty("connected").GetBoolean());
        Assert.Equal(FakeGoogle.Email, status.GetProperty("email").GetString());
        Assert.Equal(107374182400, status.GetProperty("limitBytes").GetInt64());

        // The same state can't be replayed.
        var replay = await _factory.NewClient().GetAsync($"/api/drive/callback?code={FakeGoogle.Code}&state={Uri.EscapeDataString(state)}");
        Assert.Equal("/admin?drive=error", replay.Headers.Location?.OriginalString);

        // Cancelled on Google's consent screen.
        var cancelled = await _factory.NewClient().GetAsync("/api/drive/callback?error=access_denied");
        Assert.Equal("/admin?drive=cancelled", cancelled.Headers.Location?.OriginalString);

        // Disconnect revokes the token at Google.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync("/api/admin/drive")).StatusCode);
        Assert.Equal("refresh-1", _google.RevokedToken);
        Assert.False((await Json(await admin.GetAsync("/api/admin/drive"))).GetProperty("connected").GetBoolean());
    }

    [Fact]
    public async Task Originals_move_to_Drive_and_are_still_served_downloaded_and_zipped()
    {
        var (admin, _) = await _factory.AdminAsync();
        var projectId = await CreateProject(admin);

        // Uploaded before Drive was connected: stays on disk until then.
        var jpeg = ApiFactory.Jpeg();
        var photo = await Json(await admin.PostAsync($"/api/admin/projects/{projectId}/photos", SecurityTests.PhotoForm(jpeg)));
        var photoId = photo.GetProperty("id").GetString()!;
        var local = Directory.GetFiles(Path.Combine(_factory.Root, "projects", Guid.Parse(projectId).ToString("N"), "original")).Single();
        Assert.Equal(1, (await Json(await admin.GetAsync("/api/admin/drive"))).GetProperty("pendingPhotos").GetInt32());

        // A project without photos still gets its folder.
        await Json(await admin.PostAsJsonAsync("/api/admin/projects", new
        {
            title = "Empty Shoot", date = "2026-11-01", customerName = "Max",
            customerEmail = "max@example.com", language = "de", username = "max.empty", password = "Customer-Pass-1",
        }));

        await Connect(admin);
        var status = await WaitUntilMoved(admin);
        for (var i = 0; i < 50 && !_google.Items.Values.Any(f => f.Name == "Empty Shoot · 2026-11-01"); i++) await Task.Delay(100);
        Assert.Contains(_google.Items.Values, f => f.Folder && f.Name == "Empty Shoot · 2026-11-01");
        Assert.Equal(1, status.GetProperty("photosInDrive").GetInt32());

        // In Drive: Sandugorea Fotos / Family Day · 2026-10-04 / IMG_0001.jpg - and gone from disk.
        var file = _google.Items.Values.Single(i => !i.Folder);
        Assert.Equal("IMG_0001.jpg", file.Name);
        Assert.Equal(jpeg, file.Content);
        var folder = _google.Items[file.Parent!];
        Assert.Equal("Family Day · 2026-10-04", folder.Name);
        Assert.Equal("Sandugorea Fotos", _google.Items[folder.Parent!].Name);
        Assert.False(File.Exists(local));

        // Thumb and preview stay on the server.
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync(photo.GetProperty("thumbUrl").GetString())).StatusCode);

        await Json(await admin.PostAsJsonAsync($"/api/admin/projects/{projectId}/send", new { includeNewPassword = false }));
        var customer = _factory.NewClient();
        await Json(await customer.PostAsJsonAsync("/api/customer/auth/login", new { username = "elena.family", password = "Customer-Pass-1" }));

        // Download: streamed from Drive through the server, with the original name.
        var original = await customer.GetAsync($"/api/customer/photos/{photoId}/original?download=true");
        Assert.Equal(HttpStatusCode.OK, original.StatusCode);
        Assert.Equal(jpeg, await original.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/jpeg", original.Content.Headers.ContentType?.MediaType);
        Assert.Equal("IMG_0001.jpg", original.Content.Headers.ContentDisposition?.FileNameStar);
        Assert.True(original.Headers.CacheControl?.Private);
        Assert.Equal(TimeSpan.FromDays(1), original.Headers.CacheControl?.MaxAge);

        // Resumed downloads (Range) work too.
        using var ranged = new HttpRequestMessage(HttpMethod.Get, $"/api/customer/photos/{photoId}/original");
        ranged.Headers.Range = new RangeHeaderValue(10, 19);
        var part = await customer.SendAsync(ranged);
        Assert.Equal(HttpStatusCode.PartialContent, part.StatusCode);
        Assert.Equal(jpeg[10..20], await part.Content.ReadAsByteArrayAsync());
        Assert.Equal($"bytes 10-19/{jpeg.Length}", part.Content.Headers.ContentRange?.ToString());

        // ZIP of all: pulled from Drive.
        var zip = await customer.GetAsync("/api/customer/project/zip");
        using (var archive = new ZipArchive(new MemoryStream(await zip.Content.ReadAsByteArrayAsync())))
        {
            var entry = archive.Entries.Single();
            Assert.Equal("IMG_0001.jpg", entry.FullName);
            using var ms = new MemoryStream();
            await using (var s = await entry.OpenAsync()) await s.CopyToAsync(ms);
            Assert.Equal(jpeg, ms.ToArray());
        }

        // Disconnecting now would orphan the photo in Drive: refused.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync("/api/admin/drive")).StatusCode);

        // Deleting the photo puts it in the Drive trash; deleting the project trashes its folder.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/projects/{projectId}/photos/{photoId}")).StatusCode);
        Assert.True(file.Trashed);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/projects/{projectId}")).StatusCode);
        Assert.True(folder.Trashed);
    }

    [Fact]
    public async Task Access_removed_at_Google_keeps_photos_on_disk_and_reports_it()
    {
        var (admin, _) = await _factory.AdminAsync();
        await Connect(admin);
        _google.RefusesTokens = true;

        var projectId = await CreateProject(admin);
        var photo = await Json(await admin.PostAsync($"/api/admin/projects/{projectId}/photos", SecurityTests.PhotoForm(ApiFactory.Jpeg())));
        await Task.Delay(500);

        var status = await Json(await admin.GetAsync("/api/admin/drive"));
        Assert.True(status.GetProperty("connected").GetBoolean());
        Assert.Equal(JsonValueKind.Null, status.GetProperty("limitBytes").ValueKind);
        Assert.Equal(1, status.GetProperty("pendingPhotos").GetInt32());
        Assert.Single(Directory.GetFiles(Path.Combine(_factory.Root, "projects", Guid.Parse(projectId).ToString("N"), "original")));
        Assert.DoesNotContain(_google.Items.Values, i => !i.Folder);

        // Still downloadable from disk meanwhile.
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync(photo.GetProperty("thumbUrl").GetString())).StatusCode);
    }
}
