using System.IO.Compression;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;
using Sandugorea.Api.Services;

namespace Sandugorea.Api.Endpoints;

/// <summary>A customer signs in with a project's credentials and sees only that project.</summary>
public static class CustomerEndpoints
{
    public static void MapCustomer(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/customer/auth");
        auth.MapPost("/login", Login).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/logout", async (HttpContext ctx) =>
        {
            await ctx.SignOutAsync(AuthSchemes.Customer);
            return Results.NoContent();
        });
        auth.MapGet("/me", (HttpContext ctx) => Results.Ok(new CustomerMe(ctx.User.Identity!.Name!)))
            .RequireAuthorization(Policies.Customer);

        var g = app.MapGroup("/api/customer").RequireAuthorization(Policies.Customer);

        g.MapGet("/project", async (HttpContext ctx, AppDbContext db) =>
        {
            var id = ctx.ClaimGuid(Claims.ProjectId);
            var p = await db.Projects.AsNoTracking().Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return Results.NotFound();
            return Results.Ok(new CustomerProjectDto(p.Title, p.Date, p.CustomerName, p.Photos.Sum(x => x.Size),
                p.Photos.OrderBy(x => x.UploadedAt).Select(x => x.ToDto("customer")).ToArray()));
        });

        g.MapGet("/photos/{photoId:guid}/{variant}", async (
            Guid photoId, string variant, bool? download, HttpContext ctx, AppDbContext db, PhotoStorage storage) =>
        {
            if (!PhotoDtos.TryParseVariant(variant, out var v)) return Results.NotFound();
            var projectId = ctx.ClaimGuid(Claims.ProjectId);
            // The ownership check: a photo of another project is simply "not found".
            var photo = await db.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId && p.ProjectId == projectId);
            return photo is null ? Results.NotFound() : PhotoFiles.Serve(photo, v, storage, download == true);
        });

        g.MapGet("/project/zip", async (HttpContext ctx, AppDbContext db, PhotoStorage storage, CancellationToken ct) =>
        {
            var id = ctx.ClaimGuid(Claims.ProjectId);
            var p = await db.Projects.AsNoTracking().Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct);
            if (p is null) return Results.NotFound();

            ctx.Response.ContentType = "application/zip";
            ctx.Response.Headers.ContentDisposition = new System.Net.Mime.ContentDisposition
            {
                FileName = SafeZipName(p.Title) + ".zip",
            }.ToString();
            ctx.Response.Headers.CacheControl = "private, no-store";

            // ZipArchive writes synchronously; allow it for this streaming response only.
            ctx.Features.Get<IHttpBodyControlFeature>()!.AllowSynchronousIO = true;
            using (var zip = new ZipArchive(ctx.Response.Body, ZipArchiveMode.Create, leaveOpen: true))
            {
                var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var photo in p.Photos.OrderBy(x => x.UploadedAt))
                {
                    var path = storage.PathFor(photo, PhotoVariant.Original);
                    if (!File.Exists(path)) continue;
                    // JPEGs are already compressed - storing them is faster and just as small.
                    zip.CreateEntryFromFile(path, UniqueName(photo.FileName, used), CompressionLevel.NoCompression);
                    ct.ThrowIfCancellationRequested();
                }
            }
            return Results.Empty;
        });
    }

    private static async Task<IResult> Login(
        LoginRequest req, HttpContext ctx, AppDbContext db, Passwords passwords, IOptions<SecurityOptions> security)
    {
        var o = security.Value;
        var username = (req.Username ?? "").Trim().ToLowerInvariant();
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Username == username);

        // Same answer for "no such user", "wrong password", "not sent yet" and "disabled".
        IResult Invalid() => Results.Json(new ErrorResponse("invalid"), statusCode: 401);

        if (project is null)
        {
            passwords.VerifyDummy(req.Password ?? "");
            await Record(db, ctx, username, false, "invalid");
            return Invalid();
        }

        if (project.LockoutEndUtc is { } end && end > DateTimeOffset.UtcNow)
        {
            await Record(db, ctx, username, false, "locked");
            return Results.Json(new ErrorResponse("locked", (int)Math.Ceiling((end - DateTimeOffset.UtcNow).TotalSeconds)), statusCode: 423);
        }

        var result = passwords.Verify(project.PasswordHash, req.Password ?? "");
        if (result == PasswordVerificationResult.Failed)
        {
            project.FailedAttempts++;
            if (project.FailedAttempts >= o.CustomerMaxFailedAttempts)
            {
                project.FailedAttempts = 0;
                project.LockoutEndUtc = DateTimeOffset.UtcNow.AddMinutes(o.CustomerLockoutMinutes);
            }
            await Record(db, ctx, username, false, "password");
            return Invalid();
        }

        if (!project.Active || project.SentAt is null)
        {
            await Record(db, ctx, username, false, project.Active ? "not-sent" : "disabled");
            return Invalid();
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            project.PasswordHash = passwords.Hash(req.Password!);
        project.FailedAttempts = 0;
        project.LockoutEndUtc = null;
        project.LastLoginAt = DateTimeOffset.UtcNow;
        await Record(db, ctx, username, true, null);

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, project.CustomerName),
            new Claim(Claims.ProjectId, project.Id.ToString()),
            new Claim(Claims.CredentialStamp, project.CredentialStamp.ToString()),
        ], AuthSchemes.Customer);
        await ctx.SignInAsync(AuthSchemes.Customer, new ClaimsPrincipal(identity));
        return Results.Ok(new CustomerMe(project.CustomerName));
    }

    private static async Task Record(AppDbContext db, HttpContext ctx, string username, bool success, string? detail)
    {
        db.LoginEvents.Add(new LoginEvent
        {
            Kind = LoginKind.Customer,
            Username = username.Length > 64 ? username[..64] : username,
            Ip = ctx.ClientIp(),
            UserAgent = ctx.ClientAgent(),
            Success = success,
            Detail = detail,
        });
        await db.SaveChangesAsync();
    }

    private static string SafeZipName(string title)
    {
        var clean = new string(title.Select(c => char.IsLetterOrDigit(c) || c is ' ' or '-' or '_' ? c : '_').ToArray()).Trim();
        return string.IsNullOrEmpty(clean) ? "photos" : clean;
    }

    private static string UniqueName(string name, HashSet<string> used)
    {
        var candidate = name;
        for (var i = 2; !used.Add(candidate); i++)
            candidate = $"{Path.GetFileNameWithoutExtension(name)} ({i}){Path.GetExtension(name)}";
        return candidate;
    }
}
