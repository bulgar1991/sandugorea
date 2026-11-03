namespace Sandugorea.Api.Options;

/// <summary>Where photos, the SQLite database and data-protection keys live.</summary>
public sealed class StorageOptions
{
    public const string Section = "Storage";

    /// <summary>Absolute or relative directory. Must NOT be inside wwwroot.</summary>
    public string Root { get; set; } = "data";

    public long MaxUploadBytes { get; set; } = 50 * 1024 * 1024;

    /// <summary>Rejects images above this many megapixels (decompression-bomb guard).</summary>
    public int MaxMegapixels { get; set; } = 120;

    /// <summary>Photos processed at the same time. Use 1 on a server with 1 GB of RAM.</summary>
    public int ParallelProcessing { get; set; } = 2;
}

/// <summary>Initial admin account, created on first start when no admin exists.</summary>
public sealed class AdminBootstrapOptions
{
    public const string Section = "Admin";

    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class SecurityOptions
{
    public const string Section = "Security";

    public int AdminMaxFailedAttempts { get; set; } = 5;
    public int AdminLockoutMinutes { get; set; } = 15;
    public int AdminIdleMinutes { get; set; } = 15;

    public int CustomerMaxFailedAttempts { get; set; } = 10;
    public int CustomerLockoutMinutes { get; set; } = 15;
    public int CustomerSessionHours { get; set; } = 12;

    /// <summary>Sign-in requests per minute per IP (all login endpoints).</summary>
    public int AuthRequestsPerMinute { get; set; } = 10;

    /// <summary>Booking form submissions per 10 minutes per IP.</summary>
    public int BookingRequestsPer10Minutes { get; set; } = 5;

    /// <summary>Name shown in authenticator apps.</summary>
    public string TotpIssuer { get; set; } = "Sandugorea";
}

public sealed class EmailOptions
{
    public const string Section = "Email";

    /// <summary>Empty = no SMTP: emails are written to {Storage:Root}/outbox instead.</summary>
    public string SmtpHost { get; set; } = "";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = "";
    public string SmtpPassword { get; set; } = "";
    public string FromAddress { get; set; } = "hello@sandugorea.ch";
    public string FromName { get; set; } = "Sandugorea Photography";

    /// <summary>Where booking requests are sent.</summary>
    public string OwnerAddress { get; set; } = "sandugorea.photo@gmail.com";
}

public sealed class SiteOptions
{
    public const string Section = "Site";

    /// <summary>Public URL used in emails, e.g. https://sandugorea.ch</summary>
    public string BaseUrl { get; set; } = "http://localhost:4200";
}
