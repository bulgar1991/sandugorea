using System.Net.Mail;
using System.Text.RegularExpressions;

namespace Sandugorea.Api.Endpoints;

public static partial class Validation
{
    public static readonly string[] Languages = ["de", "en", "it", "fr", "ro"];

    [GeneratedRegex("^[a-z0-9._-]{3,40}$")]
    public static partial Regex UsernameRegex();

    public static bool IsEmail(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 254) return false;
        try
        {
            var addr = new MailAddress(value);
            return addr.Address == value.Trim() && addr.Host.Contains('.');
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public static bool Length(string? value, int min, int max) =>
        value is not null && value.Trim().Length >= min && value.Trim().Length <= max;

    /// <summary>400 with field names, e.g. { "errors": ["title", "email"] }.</summary>
    public static IResult Invalid(IEnumerable<string> fields) =>
        Results.BadRequest(new { error = "validation", fields = fields.ToArray() });
}
