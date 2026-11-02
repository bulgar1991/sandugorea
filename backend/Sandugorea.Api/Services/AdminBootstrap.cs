using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;

namespace Sandugorea.Api.Services;

/// <summary>Applies database migrations and creates the first admin from configuration.</summary>
public static class AdminBootstrap
{
    public static async Task InitialiseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Bootstrap");

        await db.Database.MigrateAsync();

        if (await db.Admins.AnyAsync()) return;

        var o = scope.ServiceProvider.GetRequiredService<IOptions<AdminBootstrapOptions>>().Value;
        if (string.IsNullOrWhiteSpace(o.Username) || string.IsNullOrWhiteSpace(o.Password))
        {
            logger.LogWarning("No admin account yet. Set Admin__Username and Admin__Password and restart.");
            return;
        }
        if (!Passwords.IsStrongAdminPassword(o.Password))
        {
            logger.LogError("Admin__Password is too weak (12+ chars, upper, lower, digit, symbol). Admin not created.");
            return;
        }

        var passwords = scope.ServiceProvider.GetRequiredService<Passwords>();
        db.Admins.Add(new AdminUser { Username = o.Username.Trim(), PasswordHash = passwords.Hash(o.Password) });
        await db.SaveChangesAsync();
        logger.LogInformation("Admin {Username} created. Sign in at /admin/login to set up two-factor authentication.", o.Username);
    }
}
