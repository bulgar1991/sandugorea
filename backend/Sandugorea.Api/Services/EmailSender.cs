using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Sandugorea.Api.Options;

namespace Sandugorea.Api.Services;

public sealed record EmailMessage(string To, string Subject, string Html, string Text, string? ReplyTo = null);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

/// <summary>
/// Sends through SMTP (MailKit) when Email:SmtpHost is set; otherwise writes each email to
/// {Storage:Root}/outbox so development and tests never send real mail.
/// </summary>
public sealed class EmailSender(
    IOptions<EmailOptions> email,
    IOptions<StorageOptions> storage,
    ILogger<EmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var o = email.Value;
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(o.FromName, o.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.To));
        if (message.ReplyTo is not null) mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.Html, TextBody = message.Text }.ToMessageBody();

        if (string.IsNullOrWhiteSpace(o.SmtpHost))
        {
            var dir = Path.Combine(Path.GetFullPath(storage.Value.Root), "outbox");
            Directory.CreateDirectory(dir);
            var file = Path.Combine(dir, $"{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.eml");
            await mime.WriteToAsync(file, ct);
            logger.LogInformation("SMTP not configured - email to {To} saved to {File}", message.To, file);
            return;
        }

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(o.SmtpHost, o.SmtpPort, SecureSocketOptions.StartTlsWhenAvailable, ct);
        if (!string.IsNullOrEmpty(o.SmtpUser)) await smtp.AuthenticateAsync(o.SmtpUser, o.SmtpPassword, ct);
        await smtp.SendAsync(mime, ct);
        await smtp.DisconnectAsync(true, ct);
    }
}
