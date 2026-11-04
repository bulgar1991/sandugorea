using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Sandugorea.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AdminUser> Admins => Set<AdminUser>();
    public DbSet<AdminSession> AdminSessions => Set<AdminSession>();
    public DbSet<LoginEvent> LoginEvents => Set<LoginEvent>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<DriveAccount> DriveAccounts => Set<DriveAccount>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Username).HasMaxLength(64).UseCollation("NOCASE");
            e.Property(x => x.RecoveryCodeHashes).HasConversion(
                v => string.Join('\n', v),
                v => v.Split('\n', StringSplitOptions.RemoveEmptyEntries).ToList(),
                new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                    (a, c) => a!.SequenceEqual(c!),
                    v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                    v => v.ToList()));
        });

        b.Entity<AdminSession>().HasIndex(x => x.AdminId);

        b.Entity<LoginEvent>(e =>
        {
            e.HasIndex(x => new { x.Kind, x.At });
            e.Property(x => x.Username).HasMaxLength(64);
            e.Property(x => x.UserAgent).HasMaxLength(256);
        });

        b.Entity<Project>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Username).HasMaxLength(40).UseCollation("NOCASE");
            e.Property(x => x.Title).HasMaxLength(80);
            e.Property(x => x.CustomerName).HasMaxLength(100);
            e.Property(x => x.CustomerEmail).HasMaxLength(254);
            e.Property(x => x.Language).HasMaxLength(2);
            e.HasMany(x => x.Photos).WithOne(x => x.Project!).HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Photo>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.UploadedAt });
            e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.Extension).HasMaxLength(8);
            e.Property(x => x.ContentType).HasMaxLength(64);
            e.Property(x => x.DriveFileId).HasMaxLength(128);
            e.HasIndex(x => x.DriveFileId);
        });

        b.Entity<Project>().Property(x => x.DriveFolderId).HasMaxLength(128);

        b.Entity<DriveAccount>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.RootFolderId).HasMaxLength(128);
        });
    }

    /// <summary>SQLite can't order/compare DateTimeOffset natively; store as UTC ticks (nullable included).</summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder c)
    {
        c.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
    }
}
