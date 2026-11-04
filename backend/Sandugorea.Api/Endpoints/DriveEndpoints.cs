using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;
using Sandugorea.Api.Security;
using Sandugorea.Api.Services;

namespace Sandugorea.Api.Endpoints;

/// <summary>Connecting the photographer's Google Drive, where the original photos are kept.</summary>
public static class DriveEndpoints
{
    public static void MapDrive(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/admin/drive").RequireAuthorization(Policies.Admin);

        g.MapGet("", async (GoogleDrive drive, AppDbContext db, PhotoStorage storage, CancellationToken ct) =>
        {
            var status = await drive.StatusAsync(ct);
            var pending = db.Photos.Where(p => p.DriveFileId == null);
            var pendingCount = await pending.CountAsync(ct);
            var pendingBytes = await pending.SumAsync(p => (long?)p.Size, ct) ?? 0;
            var inDrive = await db.Photos.CountAsync(p => p.DriveFileId != null && p.DriveFileId != DriveSync.Missing, ct);
            return Results.Ok(new DriveStatusDto(
                status.Configured, status.Connected, status.Email, status.UsedBytes, status.LimitBytes,
                inDrive, pendingCount, pendingBytes, storage.FreeDiskBytes()));
        });

        g.MapPost("/connect", (GoogleDrive drive) =>
            drive.Configured
                ? Results.Ok(new DriveConnectDto(drive.AuthorizationUrl()))
                : Results.BadRequest(new ErrorResponse("notConfigured")));

        // Photos already in this Drive would become unreachable: only allowed while there are none.
        g.MapDelete("", async (GoogleDrive drive, AppDbContext db, CancellationToken ct) =>
        {
            if (await db.Photos.AnyAsync(p => p.DriveFileId != null && p.DriveFileId != DriveSync.Missing, ct))
                return Results.Conflict(new ErrorResponse("inUse"));
            await drive.DisconnectAsync(ct);
            return Results.NoContent();
        });

        // Google sends the browser back here. Anonymous on purpose: the admin cookie is
        // SameSite=Strict, so it isn't sent on this cross-site redirect. The signed, single-use,
        // 10-minute state (created by the signed-in admin) is what authorises it.
        app.MapGet("/api/drive/callback", async (
            string? code, string? state, string? error, GoogleDrive drive, DriveSync sync,
            ILoggerFactory loggers, CancellationToken ct) =>
        {
            if (error is not null || code is null || state is null)
                return Results.Redirect("/admin?drive=cancelled");
            try
            {
                await drive.ConnectAsync(code, state, ct);
                sync.Wake();
                return Results.Redirect("/admin?drive=connected");
            }
            catch (Exception ex) when (ex is DriveUnavailableException or HttpRequestException)
            {
                loggers.CreateLogger("Drive").LogWarning(ex, "Connecting Google Drive failed");
                return Results.Redirect("/admin?drive=error");
            }
        });
    }
}
