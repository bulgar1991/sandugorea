using Microsoft.Extensions.Options;
using Sandugorea.Api.Contracts;
using Sandugorea.Api.Options;
using Sandugorea.Api.Security;
using Sandugorea.Api.Services;

namespace Sandugorea.Api.Endpoints;

public static class BookingEndpoints
{
    public static void MapBooking(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/booking", async (
            BookingRequest req, IEmailSender email, IOptions<EmailOptions> options,
            ILoggerFactory loggers, CancellationToken ct) =>
        {
            // Honeypot: real visitors never see or fill the "website" field; bots do.
            // Pretend success so they don't learn anything.
            if (!string.IsNullOrEmpty(req.Website)) return Results.Accepted();

            var errors = new List<string>();
            if (!Validation.Length(req.Name, 1, 100)) errors.Add("name");
            if (!Validation.IsEmail(req.Email)) errors.Add("email");
            if (!Validation.Length(req.Message, 10, 4000)) errors.Add("message");
            if (!req.Consent) errors.Add("consent");
            if ((req.Phone?.Length ?? 0) > 30) errors.Add("phone");
            if ((req.Location?.Length ?? 0) > 120) errors.Add("location");
            if ((req.Type?.Length ?? 0) > 40) errors.Add("type");
            if ((req.Date?.Length ?? 0) > 20) errors.Add("date");
            if (errors.Count > 0) return Validation.Invalid(errors);

            var fields = new List<(string, string)>
            {
                ("Name", req.Name.Trim()),
                ("Email", req.Email.Trim()),
                ("Phone", req.Phone?.Trim() ?? "-"),
                ("Session", req.Type ?? "-"),
                ("Date", req.Date ?? "-"),
                ("Location", req.Location?.Trim() ?? "-"),
                ("Language", req.Language ?? "-"),
                ("Message", req.Message.Trim()),
            };
            await email.SendAsync(EmailTemplates.BookingRequest(options.Value.OwnerAddress, fields, req.Email.Trim()), ct);
            loggers.CreateLogger("Booking").LogInformation("Booking request received from {Email}", req.Email);
            return Results.Accepted();
        }).RequireRateLimiting(RateLimits.Booking);
    }
}
