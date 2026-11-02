using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QRCoder;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;

namespace Sandugorea.Api.Endpoints;

/// <summary>Admin sign-in: password, then TOTP (with first-time enrolment) or a recovery code.</summary>
public static class AdminAuthEndpoints
{
    private const string PendingPurpose = "sg.admin.pending-2fa";
    private const string TotpPurpose = "sg.admin.totp-secret";
    private static readonly TimeSpan PendingLifetime = TimeSpan.FromMinutes(5);

    public static void MapAdminAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/admin/auth");
        g.MapPost("/login", Login).RequireRateLimiting(RateLimits.Auth);
        g.MapPost("/verify", Verify).RequireRateLimiting(RateLimits.Auth);
        g.MapPost("/logout", Logout);
        g.MapGet("/me", (HttpContext ctx) => Results.Ok(new AdminMe(ctx.User.Identity!.Name!)))
            .RequireAuthorization(Policies.Admin);
    }

    private static async Task<IResult> Login(
        LoginRequest req, HttpContext ctx, AppDbContext db, Passwords passwords,
        IDataProtectionProvider dp, IOptions<SecurityOptions> security, IHostEnvironment env)
    {
        var o = security.Value;
        var username = (req.Username ?? "").Trim();
        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Username == username);

        if (admin is null)
        {
            passwords.VerifyDummy(req.Password ?? "");
            await Record(db, ctx, username, false, "invalid");
            return Results.Json(new ErrorResponse("invalid"), statusCode: 401);
        }

        if (Locked(admin, out var retry))
        {
            await Record(db, ctx, username, false, "locked");
            return Results.Json(new ErrorResponse("locked", retry), statusCode: 423);
        }

        var result = passwords.Verify(admin.PasswordHash, req.Password ?? "");
        if (result == PasswordVerificationResult.Failed)
        {
            var lockedNow = RegisterFailure(admin, o.AdminMaxFailedAttempts, o.AdminLockoutMinutes);
            await Record(db, ctx, username, false, lockedNow ? "locked" : "password");
            return lockedNow
                ? Results.Json(new ErrorResponse("locked", o.AdminLockoutMinutes * 60), statusCode: 423)
                : Results.Json(new ErrorResponse("invalid"), statusCode: 401);
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            admin.PasswordHash = passwords.Hash(req.Password!);

        // Password OK - remember that for 5 minutes in a signed, encrypted, HttpOnly cookie.
        var token = dp.CreateProtector(PendingPurpose).ToTimeLimitedDataProtector()
            .Protect(admin.Id.ToString(), PendingLifetime);
        ctx.Response.Cookies.Append(CookieAuthSetup.AdminPendingCookie, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = !env.IsDevelopment() || ctx.Request.IsHttps,
            Path = "/api/admin/auth",
            MaxAge = PendingLifetime,
            IsEssential = true,
        });

        if (admin.TotpEnabled)
        {
            await db.SaveChangesAsync();
            return Results.Ok(new AdminLoginResponse("totp"));
        }

        // First sign-in: create a secret to scan. It only becomes active once a code is verified.
        var protector = dp.CreateProtector(TotpPurpose);
        var secret = admin.ProtectedTotpSecret is { } p ? Base32.Decode(protector.Unprotect(p)) : Totp.NewSecret();
        admin.ProtectedTotpSecret = protector.Protect(Base32.Encode(secret));
        await db.SaveChangesAsync();

        var uri = Totp.OtpAuthUri(o.TotpIssuer, admin.Username, secret);
        using var qr = new QRCodeGenerator();
        using var data = qr.CreateQrCode(uri, QRCodeGenerator.ECCLevel.M);
        var png = new PngByteQRCode(data).GetGraphic(8);
        return Results.Ok(new AdminLoginResponse("enroll", Base32.Encode(secret), uri,
            "data:image/png;base64," + Convert.ToBase64String(png)));
    }

    private static async Task<IResult> Verify(
        VerifyRequest req, HttpContext ctx, AppDbContext db, Passwords passwords,
        IDataProtectionProvider dp, IOptions<SecurityOptions> security)
    {
        var o = security.Value;
        Guid adminId;
        try
        {
            var raw = ctx.Request.Cookies[CookieAuthSetup.AdminPendingCookie] ?? "";
            adminId = Guid.Parse(dp.CreateProtector(PendingPurpose).ToTimeLimitedDataProtector().Unprotect(raw));
        }
        catch (Exception ex) when (ex is System.Security.Cryptography.CryptographicException or FormatException)
        {
            return Results.Json(new ErrorResponse("expired"), statusCode: 401);
        }

        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Id == adminId);
        if (admin?.ProtectedTotpSecret is null) return Results.Json(new ErrorResponse("expired"), statusCode: 401);
        if (Locked(admin, out var retry)) return Results.Json(new ErrorResponse("locked", retry), statusCode: 423);

        var code = (req.Code ?? "").Trim().ToLowerInvariant();
        var secret = Base32.Decode(dp.CreateProtector(TotpPurpose).Unprotect(admin.ProtectedTotpSecret));
        var ok = false;
        var detail = "totp";

        if (Totp.Verify(secret, code, DateTimeOffset.UtcNow, admin.LastTotpStep) is { } step)
        {
            admin.LastTotpStep = step;
            ok = true;
        }
        else if (admin.TotpEnabled && code.Length == 11)
        {
            // One-time recovery code: remove it once used.
            var match = admin.RecoveryCodeHashes.FirstOrDefault(h => passwords.Verify(h, code) != PasswordVerificationResult.Failed);
            if (match is not null)
            {
                admin.RecoveryCodeHashes = admin.RecoveryCodeHashes.Where(h => h != match).ToList();
                ok = true;
                detail = "recovery-code";
            }
        }

        if (!ok)
        {
            var lockedNow = RegisterFailure(admin, o.AdminMaxFailedAttempts, o.AdminLockoutMinutes);
            await Record(db, ctx, admin.Username, false, lockedNow ? "locked" : "code");
            return lockedNow
                ? Results.Json(new ErrorResponse("locked", o.AdminLockoutMinutes * 60), statusCode: 423)
                : Results.Json(new ErrorResponse("invalidCode"), statusCode: 401);
        }

        string[]? recoveryCodes = null;
        if (!admin.TotpEnabled)
        {
            admin.TotpEnabled = true;
            recoveryCodes = NewRecoveryCodes(admin, passwords);
        }

        admin.FailedAttempts = 0;
        admin.LockoutEndUtc = null;
        var session = new AdminSession { AdminId = admin.Id, Ip = ctx.ClientIp(), UserAgent = ctx.ClientAgent() };
        db.AdminSessions.Add(session);
        await Record(db, ctx, admin.Username, true, detail);

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, admin.Username),
            new Claim(Claims.AdminId, admin.Id.ToString()),
            new Claim(Claims.SessionId, session.Id.ToString()),
        ], AuthSchemes.Admin);
        await ctx.SignInAsync(AuthSchemes.Admin, new ClaimsPrincipal(identity));
        ctx.Response.Cookies.Delete(CookieAuthSetup.AdminPendingCookie, new CookieOptions { Path = "/api/admin/auth" });

        return Results.Ok(new AdminVerifyResponse(admin.Username, recoveryCodes));
    }

    private static async Task<IResult> Logout(HttpContext ctx, AppDbContext db)
    {
        var result = await ctx.AuthenticateAsync(AuthSchemes.Admin);
        if (result.Succeeded && Guid.TryParse(result.Principal.FindFirst(Claims.SessionId)?.Value, out var sid))
            await db.AdminSessions.Where(s => s.Id == sid).ExecuteDeleteAsync();
        await ctx.SignOutAsync(AuthSchemes.Admin);
        return Results.NoContent();
    }

    internal static string[] NewRecoveryCodes(AdminUser admin, Passwords passwords)
    {
        var codes = Enumerable.Range(0, 10).Select(_ => Passwords.NewRecoveryCode()).ToArray();
        admin.RecoveryCodeHashes = codes.Select(passwords.Hash).ToList();
        return codes;
    }

    private static bool Locked(AdminUser admin, out int retryAfterSeconds)
    {
        retryAfterSeconds = 0;
        if (admin.LockoutEndUtc is not { } end || end <= DateTimeOffset.UtcNow) return false;
        retryAfterSeconds = (int)Math.Ceiling((end - DateTimeOffset.UtcNow).TotalSeconds);
        return true;
    }

    /// <summary>Counts a failure; returns true when this failure triggered a lockout.</summary>
    private static bool RegisterFailure(AdminUser admin, int max, int minutes)
    {
        admin.FailedAttempts++;
        if (admin.FailedAttempts < max) return false;
        admin.FailedAttempts = 0;
        admin.LockoutEndUtc = DateTimeOffset.UtcNow.AddMinutes(minutes);
        return true;
    }

    private static async Task Record(AppDbContext db, HttpContext ctx, string username, bool success, string detail)
    {
        db.LoginEvents.Add(new LoginEvent
        {
            Kind = LoginKind.Admin,
            Username = username.Length > 64 ? username[..64] : username,
            Ip = ctx.ClientIp(),
            UserAgent = ctx.ClientAgent(),
            Success = success,
            Detail = detail,
        });
        await db.SaveChangesAsync();
    }
}
