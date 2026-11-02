using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;

namespace Sandugorea.Api.Security;

/// <summary>
/// PBKDF2 hashing via ASP.NET Core Identity's PasswordHasher (salted, HMAC-SHA512,
/// 100k iterations, versioned format so the cost can be raised later).
/// </summary>
public sealed class Passwords
{
    private static readonly object Subject = new();
    private readonly PasswordHasher<object> _hasher = new();

    /// <summary>Precomputed hash used to spend the same time when a username doesn't exist.</summary>
    private readonly string _dummyHash;

    public Passwords() => _dummyHash = Hash(Generate());

    public string Hash(string password) => _hasher.HashPassword(Subject, password);

    public PasswordVerificationResult Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(Subject, hash, password);

    /// <summary>Burns the same CPU as a real check so response times don't reveal valid usernames.</summary>
    public void VerifyDummy(string password) => _hasher.VerifyHashedPassword(Subject, _dummyHash, password);

    /// <summary>Random password without look-alike characters (0/O, 1/l/I).</summary>
    public static string Generate(int length = 14)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";
        return RandomNumberGenerator.GetString(alphabet, length);
    }

    /// <summary>Admin password rule: 12+ chars with upper, lower, digit and symbol.</summary>
    public static bool IsStrongAdminPassword(string p) =>
        p.Length >= 12 && p.Any(char.IsUpper) && p.Any(char.IsLower) && p.Any(char.IsDigit)
        && p.Any(c => !char.IsLetterOrDigit(c));

    /// <summary>One-time recovery codes like "k7q2m-9xw4t".</summary>
    public static string NewRecoveryCode()
    {
        const string alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
        var s = RandomNumberGenerator.GetString(alphabet, 10);
        return $"{s[..5]}-{s[5..]}";
    }
}
