namespace Sandugorea.Api.Contracts;

// ---- Auth
public sealed record LoginRequest(string Username, string Password);
public sealed record VerifyRequest(string Code);

/// <summary>Step 1 result. "totp" = enter code; "enroll" = scan the QR first, then enter code.</summary>
public sealed record AdminLoginResponse(string Next, string? Secret = null, string? OtpAuthUri = null, string? QrPng = null);
/// <summary>Answer of the "/me" checks: whether that cookie holds a valid session, and for whom.</summary>
public sealed record SessionCheckDto(bool SignedIn, string? Name);
public sealed record AdminVerifyResponse(string Username, string[]? RecoveryCodes);
public sealed record ErrorResponse(string Error, int? RetryAfterSeconds = null);

// ---- Admin account
public sealed record ChangePasswordRequest(string Current, string Next);
public sealed record SessionDto(Guid Id, string? Device, string? Ip, DateTimeOffset CreatedAt, DateTimeOffset LastSeenAt, bool Current);
public sealed record LoginEventDto(DateTimeOffset At, string? Ip, string? Device, bool Success, string? Detail);
public sealed record SecurityStatusDto(bool TotpEnabled, int RecoveryCodesLeft);
public sealed record RecoveryCodesDto(string[] Codes);

// ---- Projects
public sealed record PhotoDto(Guid Id, string Name, long Size, int Width, int Height, DateTimeOffset UploadedAt, string ThumbUrl, string PreviewUrl, string OriginalUrl);

public sealed record ProjectSummaryDto(
    Guid Id, string Title, DateOnly Date, string CustomerName, string CustomerEmail, string Language, string Username,
    bool Active, DateTimeOffset CreatedAt, DateTimeOffset? SentAt, DateTimeOffset? LastLoginAt,
    int PhotoCount, long TotalBytes, string[] CoverUrls);

public sealed record ProjectDetailDto(
    Guid Id, string Title, DateOnly Date, string CustomerName, string CustomerEmail, string Language, string Username,
    bool Active, DateTimeOffset CreatedAt, DateTimeOffset? SentAt, DateTimeOffset? LastLoginAt,
    long TotalBytes, PhotoDto[] Photos);

public sealed record CreateProjectRequest(string Title, DateOnly Date, string CustomerName, string CustomerEmail, string Language, string Username, string Password);
public sealed record UpdateProjectRequest(bool? Active);
public sealed record NewPasswordResponse(string Password);
public sealed record SendProjectRequest(bool IncludeNewPassword);
public sealed record SendProjectResponse(DateTimeOffset SentAt, string? Password);
public sealed record StatsDto(int Projects, int Drafts, int Delivered, int Photos, long Bytes);
public sealed record UsernameAvailableDto(bool Available);

// ---- Customer
public sealed record CustomerProjectDto(string Title, DateOnly Date, string CustomerName, long TotalBytes, PhotoDto[] Photos);

// ---- Booking
public sealed record BookingRequest(
    string Name, string Email, string? Phone, string? Type, string? Date, string? Location, string Message,
    bool Consent, string? Language, string? Website);

public sealed record CustomerMe(string Name);
