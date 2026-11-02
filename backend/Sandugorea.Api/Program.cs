using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Data;
using Sandugorea.Api.Endpoints;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;
using Sandugorea.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---- Options
builder.Services.Configure<StorageOptions>(config.GetSection(StorageOptions.Section));
builder.Services.Configure<AdminBootstrapOptions>(config.GetSection(AdminBootstrapOptions.Section));
builder.Services.Configure<SecurityOptions>(config.GetSection(SecurityOptions.Section));
builder.Services.Configure<EmailOptions>(config.GetSection(EmailOptions.Section));
builder.Services.Configure<SiteOptions>(config.GetSection(SiteOptions.Section));

var storage = config.GetSection(StorageOptions.Section).Get<StorageOptions>() ?? new();
var storageRoot = Path.GetFullPath(storage.Root);
Directory.CreateDirectory(storageRoot);

// ---- Data: SQLite file next to the photos (one folder to back up).
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(config.GetConnectionString("Default") ?? $"Data Source={Path.Combine(storageRoot, "sandugorea.db")}"));

// Keys that encrypt cookies and TOTP secrets. Persisted so restarts don't sign everyone out.
builder.Services.AddDataProtection()
    .SetApplicationName("Sandugorea")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(storageRoot, "keys")));

// ---- Services
builder.Services.AddSingleton<Passwords>();
builder.Services.AddSingleton<PhotoStorage>();
builder.Services.AddSingleton<IEmailSender, EmailSender>();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddSandugoreaAuth(config, builder.Environment);

// Uploads: Kestrel's default 30 MB limit is raised per endpoint (photo upload only).
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 1 * 1024 * 1024);

// ---- Rate limiting (per client IP)
var limits = config.GetSection(SecurityOptions.Section).Get<SecurityOptions>() ?? new();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(RateLimits.Auth, ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.ClientIp() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.AuthRequestsPerMinute, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy(RateLimits.Booking, ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.ClientIp() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.BookingRequestsPer10Minutes, Window = TimeSpan.FromMinutes(10) }));
});

// Running behind nginx on the VPS: trust X-Forwarded-* from the local proxy only (default).
builder.Services.Configure<ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

var app = builder.Build();

await AdminBootstrap.InitialiseAsync(app.Services);

app.UseForwardedHeaders();
app.UseSecurityHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
}

// Angular build output (wwwroot) - only present after `dotnet publish`.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCsrfHeaderCheck();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));
app.MapAdminAuth();
app.MapAdminAccount();
app.MapAdminProjects();
app.MapCustomer();
app.MapBooking();

// Unknown /api routes are real 404s; everything else falls through to the Angular router.
app.MapFallback("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Exposed for integration tests (WebApplicationFactory).</summary>
public partial class Program;
