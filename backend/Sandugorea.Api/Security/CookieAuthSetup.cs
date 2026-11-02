using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;

namespace Sandugorea.Api.Security;

public static class CookieAuthSetup
{
    public const string AdminCookie = "sg_admin";
    public const string CustomerCookie = "sg_customer";
    public const string AdminPendingCookie = "sg_admin_2fa";

    public static IServiceCollection AddSandugoreaAuth(
        this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        var security = config.GetSection(SecurityOptions.Section).Get<SecurityOptions>() ?? new();

        services
            .AddAuthentication()
            .AddCookie(AuthSchemes.Admin, o =>
            {
                Configure(o, AdminCookie, env);
                o.ExpireTimeSpan = TimeSpan.FromMinutes(security.AdminIdleMinutes);
                o.Events.OnValidatePrincipal = ValidateAdmin;
            })
            .AddCookie(AuthSchemes.Customer, o =>
            {
                Configure(o, CustomerCookie, env);
                o.ExpireTimeSpan = TimeSpan.FromHours(security.CustomerSessionHours);
                o.Events.OnValidatePrincipal = ValidateCustomer;
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(Policies.Admin, p => p.AddAuthenticationSchemes(AuthSchemes.Admin).RequireAuthenticatedUser())
            .AddPolicy(Policies.Customer, p => p.AddAuthenticationSchemes(AuthSchemes.Customer).RequireAuthenticatedUser());

        return services;
    }

    private static void Configure(CookieAuthenticationOptions o, string name, IHostEnvironment env)
    {
        o.Cookie.Name = name;
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Strict;
        o.Cookie.Path = "/api";
        o.Cookie.IsEssential = true;
        // Development runs over plain http on localhost; everything else is HTTPS-only.
        o.Cookie.SecurePolicy = env.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        o.SlidingExpiration = true;
        // An API: answer 401/403 instead of redirecting to a login page.
        o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
    }

    /// <summary>The admin cookie is only valid while its server-side session row exists.</summary>
    private static async Task ValidateAdmin(CookieValidatePrincipalContext ctx)
    {
        var sessionId = Guid.TryParse(ctx.Principal?.FindFirst(Claims.SessionId)?.Value, out var s) ? s : Guid.Empty;
        var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var session = await db.AdminSessions.FirstOrDefaultAsync(x => x.Id == sessionId);
        if (session is null)
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(AuthSchemes.Admin);
            return;
        }

        // Track activity, at most once a minute to keep writes low.
        var now = DateTimeOffset.UtcNow;
        if (now - session.LastSeenAt > TimeSpan.FromMinutes(1))
        {
            session.LastSeenAt = now;
            session.Ip = ctx.HttpContext.ClientIp();
            await db.SaveChangesAsync();
        }
    }

    /// <summary>Customer is signed out when the project is disabled, deleted or its password reset.</summary>
    private static async Task ValidateCustomer(CookieValidatePrincipalContext ctx)
    {
        var projectId = Guid.TryParse(ctx.Principal?.FindFirst(Claims.ProjectId)?.Value, out var p) ? p : Guid.Empty;
        var stamp = ctx.Principal?.FindFirst(Claims.CredentialStamp)?.Value;
        var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var project = await db.Projects.AsNoTracking()
            .Where(x => x.Id == projectId)
            .Select(x => new { x.Active, x.SentAt, x.CredentialStamp })
            .FirstOrDefaultAsync();

        if (project is null || !project.Active || project.SentAt is null || project.CredentialStamp.ToString() != stamp)
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(AuthSchemes.Customer);
        }
    }
}
