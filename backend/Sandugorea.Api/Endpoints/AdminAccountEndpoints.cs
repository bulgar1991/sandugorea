using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;
using Sandugorea.Api.Security;

namespace Sandugorea.Api.Endpoints;

public static class AdminAccountEndpoints
{
    public static void MapAdminAccount(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/admin/account").RequireAuthorization(Policies.Admin);

        g.MapGet("/security", async (HttpContext ctx, AppDbContext db) =>
        {
            var admin = await Current(ctx, db);
            return Results.Ok(new SecurityStatusDto(admin.TotpEnabled, admin.RecoveryCodeHashes.Count));
        });

        g.MapPost("/password", async (ChangePasswordRequest req, HttpContext ctx, AppDbContext db, Passwords passwords) =>
        {
            var admin = await Current(ctx, db);
            if (passwords.Verify(admin.PasswordHash, req.Current ?? "") == PasswordVerificationResult.Failed)
                return Results.BadRequest(new ErrorResponse("invalidCurrent"));
            if (!Passwords.IsStrongAdminPassword(req.Next ?? ""))
                return Results.BadRequest(new ErrorResponse("weak"));

            admin.PasswordHash = passwords.Hash(req.Next!);
            // Everyone else holding a session for this account is signed out.
            var current = ctx.ClaimGuid(Claims.SessionId);
            await db.AdminSessions.Where(s => s.AdminId == admin.Id && s.Id != current).ExecuteDeleteAsync();
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireRateLimiting(RateLimits.Auth);

        g.MapGet("/sessions", async (HttpContext ctx, AppDbContext db) =>
        {
            var adminId = ctx.ClaimGuid(Claims.AdminId);
            var current = ctx.ClaimGuid(Claims.SessionId);
            var sessions = await db.AdminSessions.AsNoTracking().Where(s => s.AdminId == adminId).ToListAsync();
            return Results.Ok(sessions
                .OrderByDescending(s => s.LastSeenAt)
                .Select(s => new SessionDto(s.Id, Device(s.UserAgent), s.Ip, s.CreatedAt, s.LastSeenAt, s.Id == current)));
        });

        g.MapDelete("/sessions/others", async (HttpContext ctx, AppDbContext db) =>
        {
            var adminId = ctx.ClaimGuid(Claims.AdminId);
            var current = ctx.ClaimGuid(Claims.SessionId);
            await db.AdminSessions.Where(s => s.AdminId == adminId && s.Id != current).ExecuteDeleteAsync();
            return Results.NoContent();
        });

        g.MapGet("/history", async (AppDbContext db) =>
        {
            var events = await db.LoginEvents.AsNoTracking()
                .Where(e => e.Kind == LoginKind.Admin)
                .OrderByDescending(e => e.At)
                .Take(20)
                .ToListAsync();
            return Results.Ok(events.Select(e => new LoginEventDto(e.At, e.Ip, Device(e.UserAgent), e.Success, e.Detail)));
        });

        g.MapPost("/recovery-codes", async (HttpContext ctx, AppDbContext db, Passwords passwords) =>
        {
            var admin = await Current(ctx, db);
            var codes = AdminAuthEndpoints.NewRecoveryCodes(admin, passwords);
            await db.SaveChangesAsync();
            return Results.Ok(new RecoveryCodesDto(codes));
        }).RequireRateLimiting(RateLimits.Auth);
    }

    private static async Task<AdminUser> Current(HttpContext ctx, AppDbContext db)
    {
        var id = ctx.ClaimGuid(Claims.AdminId);
        return await db.Admins.FirstAsync(a => a.Id == id);
    }

    /// <summary>"Chrome on macOS" style label from a user-agent string.</summary>
    internal static string? Device(string? ua)
    {
        if (string.IsNullOrEmpty(ua)) return null;
        var browser = ua.Contains("Edg/") ? "Edge" : ua.Contains("Firefox/") ? "Firefox"
            : ua.Contains("Chrome/") ? "Chrome" : ua.Contains("Safari/") ? "Safari" : "Browser";
        var os = ua.Contains("iPhone") || ua.Contains("iPad") ? "iOS" : ua.Contains("Android") ? "Android"
            : ua.Contains("Mac OS X") ? "macOS" : ua.Contains("Windows") ? "Windows" : ua.Contains("Linux") ? "Linux" : "unknown";
        return $"{browser} · {os}";
    }
}
