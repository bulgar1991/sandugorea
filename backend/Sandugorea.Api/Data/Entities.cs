namespace Sandugorea.Api.Data;

public sealed class AdminUser
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }

    /// <summary>TOTP secret, encrypted with ASP.NET Data Protection.</summary>
    public string? ProtectedTotpSecret { get; set; }
    public bool TotpEnabled { get; set; }

    /// <summary>Last accepted TOTP time step - a code can't be used twice.</summary>
    public long LastTotpStep { get; set; }

    /// <summary>Hashed one-time recovery codes.</summary>
    public List<string> RecoveryCodeHashes { get; set; } = [];

    public int FailedAttempts { get; set; }
    public DateTimeOffset? LockoutEndUtc { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>A signed-in admin browser. Deleting the row signs that browser out.</summary>
public sealed class AdminSession
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid AdminId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
}

public enum LoginKind
{
    Admin = 0,
    Customer = 1,
}

public sealed class LoginEvent
{
    public long Id { get; set; }
    public LoginKind Kind { get; set; }
    public required string Username { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; }

    /// <summary>e.g. "password", "totp", "locked", "invalid".</summary>
    public string? Detail { get; set; }
}

/// <summary>A private folder of photos for one customer, with its own login.</summary>
public sealed class Project
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Title { get; set; }
    public DateOnly Date { get; set; }
    public required string CustomerName { get; set; }
    public required string CustomerEmail { get; set; }

    /// <summary>Language for emails to the customer (en, de, it, fr, ro).</summary>
    public string Language { get; set; } = "de";

    public required string Username { get; set; }
    public required string PasswordHash { get; set; }

    /// <summary>Changes on password reset; signed-in customers with an old stamp are signed out.</summary>
    public Guid CredentialStamp { get; set; } = Guid.NewGuid();

    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }

    public int FailedAttempts { get; set; }
    public DateTimeOffset? LockoutEndUtc { get; set; }

    /// <summary>This project's folder in Google Drive (created with the first photo moved there).</summary>
    public string? DriveFolderId { get; set; }

    public List<Photo> Photos { get; set; } = [];
}

public sealed class Photo
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    /// <summary>Original file name (sanitised), used for downloads.</summary>
    public required string FileName { get; set; }

    /// <summary>Extension of the stored original, e.g. ".jpg".</summary>
    public required string Extension { get; set; }
    public required string ContentType { get; set; }
    public long Size { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Set once the original has been moved to Google Drive (the local copy is then deleted).
    /// Null = the original is still on the server's disk. Thumb + preview always stay local.
    /// </summary>
    public string? DriveFileId { get; set; }
}

/// <summary>The connected Google account whose Drive stores the originals (at most one row).</summary>
public sealed class DriveAccount
{
    public int Id { get; set; } = 1;

    /// <summary>OAuth refresh token, encrypted with ASP.NET Data Protection.</summary>
    public required string ProtectedRefreshToken { get; set; }
    public string? Email { get; set; }

    /// <summary>The "Sandugorea" folder all project folders live in.</summary>
    public string? RootFolderId { get; set; }
    public DateTimeOffset ConnectedAt { get; set; } = DateTimeOffset.UtcNow;
}
