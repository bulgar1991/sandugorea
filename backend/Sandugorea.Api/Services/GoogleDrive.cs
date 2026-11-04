using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;

namespace Sandugorea.Api.Services;

/// <summary>Drive can't be used: not configured, not connected, or the account revoked access.</summary>
public sealed class DriveUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

public sealed record DriveStatus(bool Configured, bool Connected, string? Email, long? UsedBytes, long? LimitBytes);

/// <summary>
/// Google Drive as the store for original photos, through the REST API (no SDK).
///
/// Access: OAuth "drive.file" - the app only sees files and folders it created itself, nothing
/// else in the photographer's Drive. The refresh token is stored encrypted (Data Protection);
/// access tokens live in memory only.
/// </summary>
public sealed class GoogleDrive(
    IHttpClientFactory http,
    IServiceScopeFactory scopes,
    IDataProtectionProvider protection,
    IMemoryCache cache,
    IOptions<GoogleDriveOptions> options,
    IOptions<SiteOptions> site,
    ILogger<GoogleDrive> logger)
{
    public const string HttpClientName = "google";
    public const string Scope = "https://www.googleapis.com/auth/drive.file";

    // Every request goes through the named HttpClient (tests swap its handler for a fake Google).
    internal const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    internal const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    internal const string RevokeEndpoint = "https://oauth2.googleapis.com/revoke";
    internal const string ApiBase = "https://www.googleapis.com/drive/v3/";
    internal const string UploadBase = "https://www.googleapis.com/upload/drive/v3/files";

    private const string FolderMime = "application/vnd.google-apps.folder";

    private readonly GoogleDriveOptions _o = options.Value;
    private readonly IDataProtector _tokenProtector = protection.CreateProtector("Sandugorea.Drive.RefreshToken");
    private readonly IDataProtector _stateProtector = protection.CreateProtector("Sandugorea.Drive.OAuthState");
    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private (string Token, DateTimeOffset Expires)? _access;

    public bool Configured => _o.Configured;
    public string RedirectUri => site.Value.BaseUrl.TrimEnd('/') + "/api/drive/callback";

    // ------------------------------------------------------------------ connect / disconnect

    /// <summary>Google consent page URL. The state carries a PKCE verifier and expires in 10 minutes.</summary>
    public string AuthorizationUrl()
    {
        if (!Configured) throw new DriveUnavailableException("not-configured");
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(32));
        var nonce = Base64Url(RandomNumberGenerator.GetBytes(16));
        var state = _stateProtector.Protect(JsonSerializer.Serialize(
            new OAuthState(nonce, verifier, DateTimeOffset.UtcNow.AddMinutes(10))));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));

        var query = new Dictionary<string, string>
        {
            ["client_id"] = _o.ClientId,
            ["redirect_uri"] = RedirectUri,
            ["response_type"] = "code",
            ["scope"] = Scope,
            ["access_type"] = "offline",
            // Always ask, so Google always returns a refresh token.
            ["prompt"] = "consent",
            ["state"] = state,
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256",
        };
        return AuthEndpoint + "?" + string.Join('&', query.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
    }

    /// <summary>Google redirected back: validates the state, trades the code for tokens and stores the account.</summary>
    public async Task ConnectAsync(string code, string state, CancellationToken ct)
    {
        if (!Configured) throw new DriveUnavailableException("not-configured");
        OAuthState s;
        try
        {
            s = JsonSerializer.Deserialize<OAuthState>(_stateProtector.Unprotect(state))!;
        }
        catch (Exception ex) when (ex is CryptographicException or JsonException or FormatException)
        {
            throw new DriveUnavailableException("bad-state", ex);
        }
        if (s.Expires < DateTimeOffset.UtcNow) throw new DriveUnavailableException("state-expired");
        // One use per state.
        if (!cache.TryGetValue("drive-state:" + s.Nonce, out _))
            cache.Set("drive-state:" + s.Nonce, true, TimeSpan.FromMinutes(15));
        else
            throw new DriveUnavailableException("state-reused");

        var tokens = await TokenRequestAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = RedirectUri,
            ["code_verifier"] = s.Verifier,
        }, ct);
        if (string.IsNullOrEmpty(tokens.RefreshToken)) throw new DriveUnavailableException("no-refresh-token");

        await _tokenLock.WaitAsync(ct);
        try
        {
            _access = (tokens.AccessToken, DateTimeOffset.UtcNow.AddSeconds(tokens.ExpiresIn - 60));
        }
        finally
        {
            _tokenLock.Release();
        }

        var about = await AboutAsync(ct);
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = await db.DriveAccounts.FirstOrDefaultAsync(ct);
        var sameAccount = account?.Email is { } old && string.Equals(old, about.User?.EmailAddress, StringComparison.OrdinalIgnoreCase);
        if (account is null)
        {
            account = new DriveAccount { ProtectedRefreshToken = "" };
            db.DriveAccounts.Add(account);
        }
        account.ProtectedRefreshToken = _tokenProtector.Protect(tokens.RefreshToken);
        account.Email = about.User?.EmailAddress;
        account.ConnectedAt = DateTimeOffset.UtcNow;
        if (!sameAccount)
        {
            // Another Google account: its Drive has none of our folders yet.
            account.RootFolderId = null;
            await db.Projects.Where(p => p.DriveFolderId != null)
                .ExecuteUpdateAsync(u => u.SetProperty(p => p.DriveFolderId, (string?)null), ct);
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Google Drive connected ({Email})", account.Email);
    }

    public async Task DisconnectAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = await db.DriveAccounts.FirstOrDefaultAsync(ct);
        if (account is null) return;
        try
        {
            var refresh = _tokenProtector.Unprotect(account.ProtectedRefreshToken);
            using var client = http.CreateClient(HttpClientName);
            await client.PostAsync(RevokeEndpoint, new FormUrlEncodedContent(
                new Dictionary<string, string> { ["token"] = refresh }), ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or CryptographicException)
        {
            logger.LogWarning(ex, "Revoking the Google token failed (removed locally anyway)");
        }
        db.DriveAccounts.Remove(account);
        await db.SaveChangesAsync(ct);
        _access = null;
    }

    public async Task<DriveStatus> StatusAsync(CancellationToken ct)
    {
        if (!Configured) return new DriveStatus(false, false, null, null, null);
        var email = await AccountEmailAsync(ct);
        if (email is null && !await IsConnectedAsync(ct)) return new DriveStatus(true, false, null, null, null);
        try
        {
            var about = await AboutAsync(ct);
            return new DriveStatus(true, true, about.User?.EmailAddress ?? email,
                ParseLong(about.StorageQuota?.Usage), ParseLong(about.StorageQuota?.Limit));
        }
        catch (DriveUnavailableException)
        {
            // Token revoked from the Google side: show as connected-but-broken (no quota).
            return new DriveStatus(true, true, email, null, null);
        }
    }

    public async Task<bool> IsConnectedAsync(CancellationToken ct)
    {
        if (!Configured) return false;
        using var scope = scopes.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().DriveAccounts.AnyAsync(ct);
    }

    // ------------------------------------------------------------------ files

    /// <summary>The project's folder ("Title · 2026-09-12"), created on first use and remembered on the project.</summary>
    public async Task<string> EnsureProjectFolderAsync(AppDbContext db, Project project, CancellationToken ct)
    {
        if (project.DriveFolderId is { } existing) return existing;
        var account = await db.DriveAccounts.FirstOrDefaultAsync(ct) ?? throw new DriveUnavailableException("not-connected");
        if (account.RootFolderId is null)
        {
            account.RootFolderId = await CreateFolderAsync(_o.RootFolderName, null, ct);
            await db.SaveChangesAsync(ct);
        }
        project.DriveFolderId = await CreateFolderAsync(
            $"{project.Title} · {project.Date:yyyy-MM-dd}", account.RootFolderId, ct);
        await db.SaveChangesAsync(ct);
        return project.DriveFolderId;
    }

    /// <summary>Uploads a file (streamed, resumable session) and returns its Drive id.</summary>
    public async Task<string> UploadAsync(string folderId, string name, string contentType, Stream content, long length, CancellationToken ct)
    {
        using var client = await ClientAsync(ct);
        using var init = new HttpRequestMessage(HttpMethod.Post, UploadBase + "?uploadType=resumable&fields=id")
        {
            Content = JsonContent.Create(new { name, parents = new[] { folderId } }),
        };
        init.Headers.Add("X-Upload-Content-Type", contentType);
        init.Headers.Add("X-Upload-Content-Length", length.ToString(System.Globalization.CultureInfo.InvariantCulture));
        using var initResponse = await SendAsync(client, init, ct);
        var session = initResponse.Headers.Location ?? throw new HttpRequestException("Drive returned no upload session.");

        using var put = new HttpRequestMessage(HttpMethod.Put, session) { Content = new StreamContent(content, 1 << 20) };
        put.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        put.Content.Headers.ContentLength = length;
        using var putResponse = await SendAsync(client, put, ct);
        var file = await putResponse.Content.ReadFromJsonAsync<DriveFile>(ct);
        return file?.Id ?? throw new HttpRequestException("Drive returned no file id.");
    }

    /// <summary>Opens a file for streaming, optionally a byte range. The caller disposes the response.</summary>
    public async Task<HttpResponseMessage> DownloadAsync(string fileId, RangeHeaderValue? range, CancellationToken ct)
    {
        var client = await ClientAsync(ct);
        var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiBase}files/{Uri.EscapeDataString(fileId)}?alt=media");
        if (range is not null) request.Headers.Range = range;
        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            response.Dispose();
            if (response.StatusCode is HttpStatusCode.Unauthorized) _access = null;
            throw new DriveUnavailableException("download-denied");
        }
        return response;
    }

    /// <summary>Moves a file or folder to the Drive trash (recoverable there for 30 days). Missing = done.</summary>
    public async Task TrashAsync(string fileId, CancellationToken ct)
    {
        using var client = await ClientAsync(ct);
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"{ApiBase}files/{Uri.EscapeDataString(fileId)}")
        {
            Content = JsonContent.Create(new { trashed = true }),
        };
        using var response = await client.SendAsync(request, ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return;
        await EnsureOkAsync(response);
    }

    private async Task<string> CreateFolderAsync(string name, string? parent, CancellationToken ct)
    {
        using var client = await ClientAsync(ct);
        object body = parent is null
            ? new { name, mimeType = FolderMime }
            : new { name, mimeType = FolderMime, parents = new[] { parent } };
        using var request = new HttpRequestMessage(HttpMethod.Post, ApiBase + "files?fields=id") { Content = JsonContent.Create(body) };
        using var response = await SendAsync(client, request, ct);
        var file = await response.Content.ReadFromJsonAsync<DriveFile>(ct);
        return file?.Id ?? throw new HttpRequestException("Drive returned no folder id.");
    }

    private async Task<About> AboutAsync(CancellationToken ct)
    {
        using var client = await ClientAsync(ct);
        using var request = new HttpRequestMessage(HttpMethod.Get, ApiBase + "about?fields=user(emailAddress),storageQuota(limit,usage)");
        using var response = await SendAsync(client, request, ct);
        return (await response.Content.ReadFromJsonAsync<About>(ct))!;
    }

    // ------------------------------------------------------------------ tokens / http

    private async Task<HttpClient> ClientAsync(CancellationToken ct)
    {
        var token = await AccessTokenAsync(ct);
        var client = http.CreateClient(HttpClientName);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<string> AccessTokenAsync(CancellationToken ct)
    {
        await _tokenLock.WaitAsync(ct);
        try
        {
            if (_access is { } a && a.Expires > DateTimeOffset.UtcNow) return a.Token;

            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var account = await db.DriveAccounts.AsNoTracking().FirstOrDefaultAsync(ct)
                ?? throw new DriveUnavailableException("not-connected");
            string refresh;
            try
            {
                refresh = _tokenProtector.Unprotect(account.ProtectedRefreshToken);
            }
            catch (CryptographicException ex)
            {
                throw new DriveUnavailableException("token-unreadable", ex);
            }
            var tokens = await TokenRequestAsync(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refresh,
            }, ct);
            _access = (tokens.AccessToken, DateTimeOffset.UtcNow.AddSeconds(tokens.ExpiresIn - 60));
            return tokens.AccessToken;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private async Task<TokenResponse> TokenRequestAsync(Dictionary<string, string> form, CancellationToken ct)
    {
        form["client_id"] = _o.ClientId;
        form["client_secret"] = _o.ClientSecret;
        using var client = http.CreateClient(HttpClientName);
        using var response = await client.PostAsync(TokenEndpoint, new FormUrlEncodedContent(form), ct);
        if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized)
        {
            // invalid_grant: the photographer removed the app's access in their Google account.
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Google token request refused: {Body}", body.Length > 300 ? body[..300] : body);
            throw new DriveUnavailableException("token-refused");
        }
        await EnsureOkAsync(response);
        return (await response.Content.ReadFromJsonAsync<TokenResponse>(ct))!;
    }

    private async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpRequestMessage request, CancellationToken ct)
    {
        var response = await client.SendAsync(request, ct);
        if (response.StatusCode is HttpStatusCode.Unauthorized)
        {
            response.Dispose();
            // Next call gets a fresh access token (or finds out access was revoked).
            _access = null;
            throw new DriveUnavailableException("unauthorized");
        }
        await EnsureOkAsync(response);
        return response;
    }

    private static async Task EnsureOkAsync(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync();
        if (body.Length > 500) body = body[..500];
        // 403 storageQuotaExceeded = the Drive is full.
        if (response.StatusCode == HttpStatusCode.Forbidden && body.Contains("storageQuotaExceeded", StringComparison.Ordinal))
            throw new DriveUnavailableException("drive-full");
        throw new HttpRequestException($"Google Drive: {(int)response.StatusCode} {body}", null, response.StatusCode);
    }

    private async Task<string?> AccountEmailAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().DriveAccounts
            .Select(a => a.Email).FirstOrDefaultAsync(ct);
    }

    private static long? ParseLong(string? value) => long.TryParse(value, out var n) ? n : null;

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record OAuthState(string Nonce, string Verifier, DateTimeOffset Expires);

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken);

    private sealed record DriveFile([property: JsonPropertyName("id")] string? Id);

    private sealed record About(
        [property: JsonPropertyName("user")] AboutUser? User,
        [property: JsonPropertyName("storageQuota")] Quota? StorageQuota);

    private sealed record AboutUser([property: JsonPropertyName("emailAddress")] string? EmailAddress);

    // Drive returns the quota numbers as strings; no "limit" = unlimited.
    private sealed record Quota(
        [property: JsonPropertyName("limit")] string? Limit,
        [property: JsonPropertyName("usage")] string? Usage);
}
