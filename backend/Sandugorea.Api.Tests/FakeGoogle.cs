using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;

namespace Sandugorea.Api.Tests;

/// <summary>
/// In-memory stand-in for Google's OAuth and Drive v3 endpoints - just the calls the app makes,
/// with the same request/response shapes (resumable upload, alt=media with Range, trash).
/// </summary>
public sealed class FakeGoogle : HttpMessageHandler
{
    public const string ClientId = "test-client.apps.googleusercontent.com";
    public const string ClientSecret = "test-secret";
    public const string Email = "sandu@example.com";
    public const string Code = "good-code";

    public sealed record DriveItem(string Id, string Name, string? Parent, bool Folder)
    {
        public byte[] Content { get; set; } = [];
        public bool Trashed { get; set; }
    }

    public ConcurrentDictionary<string, DriveItem> Items { get; } = new();
    public string? RevokedToken { get; private set; }
    /// <summary>Simulates the photographer removing the app's access in their Google account.</summary>
    public bool RefusesTokens { get; set; }

    private readonly ConcurrentDictionary<string, (string Name, string Parent, long Length)> _sessions = new();
    private int _ids;
    private const string RefreshToken = "refresh-1";
    private const string AccessToken = "access-1";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var uri = request.RequestUri!;
        var url = uri.GetLeftPart(UriPartial.Path);
        var query = HttpUtility.ParseQueryString(uri.Query);

        if (url == "https://oauth2.googleapis.com/token") return await Token(request, ct);
        if (url == "https://oauth2.googleapis.com/revoke")
        {
            RevokedToken = HttpUtility.ParseQueryString(await request.Content!.ReadAsStringAsync(ct))["token"];
            return new HttpResponseMessage(HttpStatusCode.OK);
        }

        if (RefusesTokens || request.Headers.Authorization?.Parameter != AccessToken)
            return new HttpResponseMessage(HttpStatusCode.Unauthorized);

        if (url == "https://www.googleapis.com/drive/v3/about")
        {
            return JsonResponse(new
            {
                user = new { emailAddress = Email },
                storageQuota = new { limit = "107374182400", usage = Items.Values.Sum(i => (long)i.Content.Length).ToString() },
            });
        }

        // Create a folder.
        if (url == "https://www.googleapis.com/drive/v3/files" && request.Method == HttpMethod.Post)
        {
            var body = await request.Content!.ReadFromJsonAsync<JsonElement>(ct);
            Assert.Equal("application/vnd.google-apps.folder", body.GetProperty("mimeType").GetString());
            var parent = body.TryGetProperty("parents", out var p) ? p[0].GetString() : null;
            var folder = Add(body.GetProperty("name").GetString()!, parent, folder: true);
            return JsonResponse(new { id = folder.Id });
        }

        // Start a resumable upload.
        if (url == "https://www.googleapis.com/upload/drive/v3/files" && request.Method == HttpMethod.Post)
        {
            Assert.Equal("resumable", query["uploadType"]);
            var body = await request.Content!.ReadFromJsonAsync<JsonElement>(ct);
            var parent = body.GetProperty("parents")[0].GetString()!;
            Assert.True(Items.TryGetValue(parent, out var folder) && folder.Folder, "upload into an unknown folder");
            var session = Guid.NewGuid().ToString("N");
            _sessions[session] = (body.GetProperty("name").GetString()!, parent,
                long.Parse(request.Headers.GetValues("X-Upload-Content-Length").Single()));
            var response = new HttpResponseMessage(HttpStatusCode.OK);
            response.Headers.Location = new Uri($"https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id={session}");
            return response;
        }

        // Upload the content of a session.
        if (url == "https://www.googleapis.com/upload/drive/v3/files" && request.Method == HttpMethod.Put)
        {
            Assert.True(_sessions.TryRemove(query["upload_id"]!, out var session), "unknown upload session");
            var content = await request.Content!.ReadAsByteArrayAsync(ct);
            Assert.Equal(session.Length, content.Length);
            var file = Add(session.Name, session.Parent, folder: false);
            file.Content = content;
            return JsonResponse(new { id = file.Id });
        }

        if (url.StartsWith("https://www.googleapis.com/drive/v3/files/", StringComparison.Ordinal))
        {
            var id = Uri.UnescapeDataString(url["https://www.googleapis.com/drive/v3/files/".Length..]);
            if (!Items.TryGetValue(id, out var item)) return new HttpResponseMessage(HttpStatusCode.NotFound);

            if (request.Method == HttpMethod.Patch)
            {
                var body = await request.Content!.ReadFromJsonAsync<JsonElement>(ct);
                item.Trashed = body.GetProperty("trashed").GetBoolean();
                return JsonResponse(new { id });
            }

            if (request.Method == HttpMethod.Get && query["alt"] == "media")
            {
                var bytes = item.Content;
                if (request.Headers.Range?.Ranges.SingleOrDefault() is { } r)
                {
                    var from = r.From ?? 0;
                    var to = Math.Min(r.To ?? bytes.Length - 1, bytes.Length - 1);
                    var partial = new HttpResponseMessage(HttpStatusCode.PartialContent)
                    {
                        Content = new ByteArrayContent(bytes[(int)from..((int)to + 1)]),
                    };
                    partial.Content.Headers.ContentRange = new ContentRangeHeaderValue(from, to, bytes.Length);
                    return partial;
                }
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) };
            }
        }

        throw new InvalidOperationException($"FakeGoogle: unexpected {request.Method} {uri}");
    }

    private async Task<HttpResponseMessage> Token(HttpRequestMessage request, CancellationToken ct)
    {
        var form = HttpUtility.ParseQueryString(await request.Content!.ReadAsStringAsync(ct));
        Assert.Equal(ClientId, form["client_id"]);
        Assert.Equal(ClientSecret, form["client_secret"]);
        if (RefusesTokens) return JsonResponse(new { error = "invalid_grant" }, HttpStatusCode.BadRequest);

        switch (form["grant_type"])
        {
            case "authorization_code":
                Assert.Equal("https://sandugorea.test/api/drive/callback", form["redirect_uri"]);
                Assert.False(string.IsNullOrEmpty(form["code_verifier"]));
                if (form["code"] != Code) return JsonResponse(new { error = "invalid_grant" }, HttpStatusCode.BadRequest);
                return JsonResponse(new { access_token = AccessToken, expires_in = 3599, refresh_token = RefreshToken });
            case "refresh_token":
                if (form["refresh_token"] != RefreshToken) return JsonResponse(new { error = "invalid_grant" }, HttpStatusCode.BadRequest);
                return JsonResponse(new { access_token = AccessToken, expires_in = 3599 });
            default:
                return JsonResponse(new { error = "unsupported_grant_type" }, HttpStatusCode.BadRequest);
        }
    }

    private DriveItem Add(string name, string? parent, bool folder)
    {
        var item = new DriveItem("drv" + Interlocked.Increment(ref _ids), name, parent, folder);
        Items[item.Id] = item;
        return item;
    }

    private static HttpResponseMessage JsonResponse(object body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = JsonContent.Create(body) };
}
