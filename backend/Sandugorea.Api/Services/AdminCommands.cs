using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Data;
using Sandugorea.Api.Security;

namespace Sandugorea.Api.Services;

/// <summary>
/// Command-line admin management (there is no screen for it on purpose: one less thing to attack).
///
///   admins list                     usernames, 2FA state, last sign-in
///   admins reset &lt;user&gt; [&lt;user&gt;…]   deletes ALL admins and their sessions, creates these
///                                   users with new random passwords (printed once, to stdout -
///                                   redirect it into a root-only file). Each sets up two-factor
///                                   authentication at their first sign-in.
/// </summary>
public static class AdminCommands
{
    public static async Task<int> RunAsync(IServiceProvider services, string[] args, TextWriter output)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        switch (args)
        {
            case ["list"]:
                foreach (var a in await db.Admins.AsNoTracking().OrderBy(a => a.Username).ToListAsync())
                {
                    var last = await db.LoginEvents.Where(e => e.Kind == LoginKind.Admin && e.Username == a.Username && e.Success)
                        .OrderByDescending(e => e.At).Select(e => (DateTimeOffset?)e.At).FirstOrDefaultAsync();
                    await output.WriteLineAsync($"{a.Username}\t2FA: {(a.TotpEnabled ? "on" : "not set up")}\tlast sign-in: {last?.ToString("u") ?? "never"}");
                }
                return 0;

            case ["reset", .. var names] when names.Length > 0:
            {
                var usernames = names.Select(n => n.Trim().ToLowerInvariant()).Distinct().ToArray();
                if (usernames.Any(u => !AdminUsernames.IsValid(u)))
                {
                    await Console.Error.WriteLineAsync("Usernames: 3-32 characters, a-z 0-9 . _ -");
                    return 2;
                }

                var passwords = scope.ServiceProvider.GetRequiredService<Passwords>();
                await using var tx = await db.Database.BeginTransactionAsync();
                await db.AdminSessions.ExecuteDeleteAsync();
                await db.Admins.ExecuteDeleteAsync();
                var created = new List<(string User, string Password)>();
                foreach (var username in usernames)
                {
                    var password = NewAdminPassword();
                    db.Admins.Add(new AdminUser { Username = username, PasswordHash = passwords.Hash(password) });
                    created.Add((username, password));
                }
                await db.SaveChangesAsync();
                await tx.CommitAsync();

                await output.WriteLineAsync("Admin: https://sandugorea.ch/admin/login");
                await output.WriteLineAsync("Each admin sets up two-factor authentication at the first sign-in.");
                foreach (var (user, password) in created)
                    await output.WriteLineAsync($"Username: {user}\tPassword: {password}");
                await Console.Error.WriteLineAsync($"Admins replaced: {string.Join(", ", usernames)}");
                return 0;
            }

            default:
                await Console.Error.WriteLineAsync("Usage: admins list | admins reset <username> [<username>...]");
                return 2;
        }
    }

    /// <summary>16 characters that always pass the admin password rule.</summary>
    private static string NewAdminPassword()
    {
        while (true)
        {
            var p = Passwords.Generate(16);
            if (Passwords.IsStrongAdminPassword(p)) return p;
        }
    }
}

internal static partial class AdminUsernames
{
    public static bool IsValid(string u) => AdminUsernameRegex().IsMatch(u);

    [System.Text.RegularExpressions.GeneratedRegex("^[a-z0-9._-]{3,32}$")]
    private static partial System.Text.RegularExpressions.Regex AdminUsernameRegex();
}
