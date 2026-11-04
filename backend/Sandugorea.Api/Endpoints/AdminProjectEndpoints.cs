using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;
using Sandugorea.Api.Services;

namespace Sandugorea.Api.Endpoints;

public static class AdminProjectEndpoints
{
    public static void MapAdminProjects(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/admin").RequireAuthorization(Policies.Admin);

        g.MapGet("/stats", async (AppDbContext db) =>
        {
            var projects = await db.Projects.AsNoTracking().Select(p => new { p.SentAt, p.Active }).ToListAsync();
            var photos = await db.Photos.CountAsync();
            var bytes = await db.Photos.SumAsync(p => (long?)p.Size) ?? 0;
            return Results.Ok(new StatsDto(
                projects.Count,
                projects.Count(p => p.SentAt is null),
                projects.Count(p => p.SentAt is not null && p.Active),
                photos, bytes));
        });

        g.MapGet("/projects", async (AppDbContext db) =>
        {
            var projects = await db.Projects.AsNoTracking().Include(p => p.Photos).ToListAsync();
            return Results.Ok(projects.OrderByDescending(p => p.CreatedAt).Select(ToSummary));
        });

        g.MapGet("/projects/username-available", async (string username, AppDbContext db) =>
            Results.Ok(new UsernameAvailableDto(!await db.Projects.AnyAsync(p => p.Username == username.Trim()))));

        g.MapGet("/projects/{id:guid}", async (Guid id, AppDbContext db) =>
            await db.Projects.AsNoTracking().Include(p => p.Photos).FirstOrDefaultAsync(p => p.Id == id) is { } p
                ? Results.Ok(ToDetail(p))
                : Results.NotFound());

        g.MapPost("/projects", async (CreateProjectRequest req, AppDbContext db, Passwords passwords, DriveSync sync) =>
        {
            var errors = new List<string>();
            if (!Validation.Length(req.Title, 1, 80)) errors.Add("title");
            if (!Validation.Length(req.CustomerName, 1, 100)) errors.Add("customerName");
            if (!Validation.IsEmail(req.CustomerEmail)) errors.Add("customerEmail");
            if (!Validation.Languages.Contains(req.Language)) errors.Add("language");
            if (!Validation.UsernameRegex().IsMatch(req.Username ?? "")) errors.Add("username");
            if ((req.Password ?? "").Length is < 10 or > 128) errors.Add("password");
            if (errors.Count > 0) return Validation.Invalid(errors);
            if (await db.Projects.AnyAsync(p => p.Username == req.Username))
                return Results.Conflict(new ErrorResponse("usernameTaken"));

            var project = new Project
            {
                Title = req.Title.Trim(),
                Date = req.Date,
                CustomerName = req.CustomerName.Trim(),
                CustomerEmail = req.CustomerEmail.Trim(),
                Language = req.Language,
                Username = req.Username!,
                PasswordHash = passwords.Hash(req.Password!),
            };
            db.Projects.Add(project);
            await db.SaveChangesAsync();
            sync.Wake(); // creates its Google Drive folder
            return Results.Created($"/api/admin/projects/{project.Id}", ToDetail(project));
        });

        g.MapPatch("/projects/{id:guid}", async (Guid id, UpdateProjectRequest req, AppDbContext db) =>
        {
            var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id);
            if (project is null) return Results.NotFound();
            if (req.Active is { } active) project.Active = active;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // New password, generated server-side and returned once. Signs the customer out.
        g.MapPost("/projects/{id:guid}/password", async (Guid id, AppDbContext db, Passwords passwords) =>
        {
            var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id);
            if (project is null) return Results.NotFound();
            var password = Passwords.Generate();
            project.PasswordHash = passwords.Hash(password);
            project.CredentialStamp = Guid.NewGuid();
            project.FailedAttempts = 0;
            project.LockoutEndUtc = null;
            await db.SaveChangesAsync();
            return Results.Ok(new NewPasswordResponse(password));
        });

        g.MapDelete("/projects/{id:guid}", async (Guid id, AppDbContext db, PhotoStorage storage, GoogleDrive drive, ILoggerFactory loggers) =>
        {
            var folder = await db.Projects.Where(p => p.Id == id).Select(p => new { p.DriveFolderId }).FirstOrDefaultAsync();
            if (folder is null) return Results.NotFound();
            await db.Photos.Where(p => p.ProjectId == id).ExecuteDeleteAsync();
            await db.Projects.Where(p => p.Id == id).ExecuteDeleteAsync();
            storage.DeleteProject(id);
            // The whole folder goes to the Drive trash (recoverable there for 30 days).
            if (folder.DriveFolderId is { } folderId)
                await TrashQuietly(drive, folderId, loggers);
            return Results.NoContent();
        });

        // One file per request, so the browser can show progress per photo.
        // The original waits on disk until DriveSync has moved it to Google Drive.
        g.MapPost("/projects/{id:guid}/photos", async (Guid id, IFormFile file, AppDbContext db, PhotoStorage storage, DriveSync sync, CancellationToken ct) =>
        {
            if (!await db.Projects.AnyAsync(p => p.Id == id, ct)) return Results.NotFound();
            try
            {
                var photo = await storage.SaveAsync(id, file, ct);
                db.Photos.Add(photo);
                await db.SaveChangesAsync(ct);
                sync.Wake();
                return Results.Ok(photo.ToDto("admin"));
            }
            catch (PhotoRejectedException ex)
            {
                return Results.BadRequest(new ErrorResponse(ex.Reason));
            }
        })
        .DisableAntiforgery() // protected by the global CSRF header check + SameSite=Strict
        .WithMetadata(new RequestSizeLimitAttribute(UploadRequestLimit))
        .WithMetadata(new RequestFormLimitsAttribute { MultipartBodyLengthLimit = UploadRequestLimit });

        g.MapDelete("/projects/{id:guid}/photos/{photoId:guid}", async (Guid id, Guid photoId, AppDbContext db, PhotoStorage storage, GoogleDrive drive, ILoggerFactory loggers) =>
        {
            var photo = await db.Photos.FirstOrDefaultAsync(p => p.Id == photoId && p.ProjectId == id);
            if (photo is null) return Results.NotFound();
            db.Photos.Remove(photo);
            await db.SaveChangesAsync();
            storage.Delete(photo);
            if (photo.DriveFileId is { } fileId && fileId != DriveSync.Missing)
                await TrashQuietly(drive, fileId, loggers);
            return Results.NoContent();
        });

        g.MapPost("/projects/{id:guid}/send", async (
            Guid id, SendProjectRequest req, AppDbContext db, Passwords passwords, IEmailSender email,
            IOptions<SiteOptions> site, IOptions<EmailOptions> emailOptions, CancellationToken ct) =>
        {
            var project = await db.Projects.Include(p => p.Photos).FirstOrDefaultAsync(p => p.Id == id, ct);
            if (project is null) return Results.NotFound();
            if (!project.Active) return Results.BadRequest(new ErrorResponse("disabled"));
            if (project.Photos.Count == 0) return Results.BadRequest(new ErrorResponse("empty"));

            string? password = null;
            if (req.IncludeNewPassword)
            {
                password = Passwords.Generate();
                project.PasswordHash = passwords.Hash(password);
                project.CredentialStamp = Guid.NewGuid();
            }

            var loginUrl = site.Value.BaseUrl.TrimEnd('/') + "/client/login";
            await email.SendAsync(EmailTemplates.ProjectInvitation(
                project.Language, project.CustomerEmail, project.CustomerName, project.Title,
                loginUrl, project.Username, password, emailOptions.Value.FromName), ct);

            project.SentAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new SendProjectResponse(project.SentAt.Value, password));
        });

        g.MapGet("/photos/{photoId:guid}/{variant}", async (Guid photoId, string variant, AppDbContext db, PhotoStorage storage, GoogleDrive drive) =>
        {
            if (!PhotoDtos.TryParseVariant(variant, out var v)) return Results.NotFound();
            var photo = await db.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId);
            return photo is null ? Results.NotFound() : PhotoFiles.Serve(photo, v, storage, drive, download: false);
        });
    }

    /// <summary>Multipart overhead on top of the largest photo.</summary>
    private const long UploadRequestLimit = 210L * 1024 * 1024;

    /// <summary>Drive clean-up must never fail the delete the admin asked for; leftovers are only in their own Drive.</summary>
    private static async Task TrashQuietly(GoogleDrive drive, string fileId, ILoggerFactory loggers)
    {
        try
        {
            await drive.TrashAsync(fileId, CancellationToken.None);
        }
        catch (Exception ex) when (ex is DriveUnavailableException or HttpRequestException)
        {
            loggers.CreateLogger("Drive").LogWarning(ex, "Could not move {FileId} to the Drive trash", fileId);
        }
    }

    private static ProjectSummaryDto ToSummary(Project p) => new(
        p.Id, p.Title, p.Date, p.CustomerName, p.CustomerEmail, p.Language, p.Username, p.Active,
        p.CreatedAt, p.SentAt, p.LastLoginAt, p.Photos.Count, p.Photos.Sum(x => x.Size),
        p.Photos.OrderBy(x => x.UploadedAt).Take(3).Select(x => x.ToDto("admin").ThumbUrl).ToArray());

    private static ProjectDetailDto ToDetail(Project p) => new(
        p.Id, p.Title, p.Date, p.CustomerName, p.CustomerEmail, p.Language, p.Username, p.Active,
        p.CreatedAt, p.SentAt, p.LastLoginAt, p.Photos.Sum(x => x.Size),
        p.Photos.OrderBy(x => x.UploadedAt).Select(x => x.ToDto("admin")).ToArray());
}

internal static class PhotoFiles
{
    /// <summary>
    /// Streams a stored file: from disk, or - for an original already moved there - from Google
    /// Drive through this server (the browser never gets a Drive link). Private caching only -
    /// photos must never sit in shared caches.
    /// </summary>
    public static IResult Serve(Photo photo, PhotoVariant variant, PhotoStorage storage, GoogleDrive drive, bool download)
    {
        var contentType = PhotoStorage.ContentTypeFor(photo, variant);
        var name = download ? photo.FileName : null;
        var path = storage.PathFor(photo, variant);
        if (File.Exists(path)) return new PrivateFileResult(path, contentType, name);
        if (variant == PhotoVariant.Original && photo.DriveFileId is { } fileId && fileId != DriveSync.Missing)
            return new DriveFileResult(drive, fileId, contentType, name);
        return Results.NotFound();
    }

    /// <summary>Opens an original for reading (disk or Drive) - used by the ZIP download.</summary>
    public static async Task<Stream?> OpenOriginalAsync(Photo photo, PhotoStorage storage, GoogleDrive drive, CancellationToken ct)
    {
        var path = storage.PathFor(photo, PhotoVariant.Original);
        if (File.Exists(path)) return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, useAsync: true);
        if (photo.DriveFileId is not { } fileId || fileId == DriveSync.Missing) return null;
        var response = await drive.DownloadAsync(fileId, null, ct);
        if (!response.IsSuccessStatusCode)
        {
            response.Dispose();
            return null;
        }
        return new ResponseStream(response, await response.Content.ReadAsStreamAsync(ct));
    }

    private sealed class DriveFileResult(GoogleDrive drive, string fileId, string contentType, string? downloadName) : IResult
    {
        public async Task ExecuteAsync(HttpContext ctx)
        {
            System.Net.Http.Headers.RangeHeaderValue? range = null;
            var requested = ctx.Request.Headers.Range.ToString();
            if (!string.IsNullOrEmpty(requested) && System.Net.Http.Headers.RangeHeaderValue.TryParse(requested, out var parsed))
                range = parsed;

            HttpResponseMessage response;
            try
            {
                response = await drive.DownloadAsync(fileId, range, ctx.RequestAborted);
            }
            catch (Exception ex) when (ex is DriveUnavailableException or HttpRequestException)
            {
                ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                return;
            }

            using (response)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }
                if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.RequestedRangeNotSatisfiable)
                {
                    ctx.Response.StatusCode = StatusCodes.Status502BadGateway;
                    return;
                }

                ctx.Response.StatusCode = (int)response.StatusCode; // 200, 206 or 416
                ctx.Response.ContentType = contentType;
                ctx.Response.ContentLength = response.Content.Headers.ContentLength;
                if (response.Content.Headers.ContentRange is { } contentRange)
                    ctx.Response.Headers.ContentRange = contentRange.ToString();
                ctx.Response.Headers.AcceptRanges = "bytes";
                ctx.Response.Headers.CacheControl = "private, max-age=86400";
                if (downloadName is not null)
                {
                    var disposition = new Microsoft.Net.Http.Headers.ContentDispositionHeaderValue("attachment");
                    disposition.SetHttpFileName(downloadName);
                    ctx.Response.Headers.ContentDisposition = disposition.ToString();
                }
                await response.Content.CopyToAsync(ctx.Response.Body, ctx.RequestAborted);
            }
        }
    }

    /// <summary>A Drive download stream that also disposes its HTTP response.</summary>
    private sealed class ResponseStream(HttpResponseMessage response, Stream inner) : Stream
    {
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override int Read(byte[] buffer, int offset, int count) => inner.Read(buffer, offset, count);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default) => inner.ReadAsync(buffer, ct);
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct) => inner.ReadAsync(buffer, offset, count, ct);
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                inner.Dispose();
                response.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    private sealed class PrivateFileResult(string path, string contentType, string? downloadName) : IResult
    {
        public Task ExecuteAsync(HttpContext ctx)
        {
            ctx.Response.Headers.CacheControl = "private, max-age=86400";
            return Results.File(path, contentType, downloadName, enableRangeProcessing: true).ExecuteAsync(ctx);
        }
    }
}
