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
builder.Services.Configure<GoogleDriveOptions>(config.GetSection(GoogleDriveOptions.Section));

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

// Google Drive keeps the original photos (see GoogleDrive / DriveSync). Long timeout: uploads
// of big originals; downloads are streamed and aren't bound by it once the headers arrive.
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient(GoogleDrive.HttpClientName, c => c.Timeout = TimeSpan.FromMinutes(30));
builder.Services.AddSingleton<GoogleDrive>();
builder.Services.AddSingleton<DriveSync>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<DriveSync>());
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
var contentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
contentTypes.Mappings[".webmanifest"] = "application/manifest+json";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypes,
    OnPrepareResponse = ctx =>
    {
        // Translations keep their file names between deploys: make browsers check for a new
        // version (a cheap 304 when unchanged) instead of showing raw keys from a stale copy.
        if (ctx.Context.Request.Path.StartsWithSegments("/i18n"))
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    },
});

app.UseCsrfHeaderCheck();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));
app.MapAdminAuth();
app.MapAdminAccount();
app.MapAdminProjects();
app.MapCustomer();
app.MapDrive();
app.MapBooking();

// Unknown /api routes are real 404s; everything else falls through to the Angular router.
app.MapFallback("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Exposed for integration tests (WebApplicationFactory).</summary>
public partial class Program;
