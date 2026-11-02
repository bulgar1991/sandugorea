using System.Net;

namespace Sandugorea.Api.Services;

/// <summary>Customer-facing emails in the project's language (en, de, it, fr, ro).</summary>
public static class EmailTemplates
{
    private sealed record InvitationText(string Subject, string Hello, string Ready, string Open, string Username, string Password, string NoPassword, string Private, string Bye);

    private static readonly Dictionary<string, InvitationText> Invitation = new()
    {
        ["en"] = new("Your photos are ready: {0}", "Hello {0},", "Your photographs from “{0}” are ready in your private project.", "Open my photos", "Username", "Password", "Use the password you received from your photographer.", "Only you can open this project. Please don't share your login details.", "With warm wishes,"),
        ["de"] = new("Deine Fotos sind fertig: {0}", "Hallo {0},", "Deine Fotos von „{0}“ sind in deinem privaten Projekt bereit.", "Meine Fotos öffnen", "Benutzername", "Passwort", "Verwende das Passwort, das du von deinem Fotografen erhalten hast.", "Nur du kannst dieses Projekt öffnen. Bitte gib deine Zugangsdaten nicht weiter.", "Herzliche Grüße,"),
        ["it"] = new("Le tue foto sono pronte: {0}", "Ciao {0},", "Le tue fotografie di «{0}» sono pronte nel tuo progetto privato.", "Apri le mie foto", "Nome utente", "Password", "Usa la password che hai ricevuto dal tuo fotografo.", "Solo tu puoi aprire questo progetto. Non condividere i tuoi dati di accesso.", "Con affetto,"),
        ["fr"] = new("Vos photos sont prêtes : {0}", "Bonjour {0},", "Vos photographies de « {0} » vous attendent dans votre projet privé.", "Ouvrir mes photos", "Identifiant", "Mot de passe", "Utilisez le mot de passe reçu de votre photographe.", "Vous seul(e) pouvez ouvrir ce projet. Ne partagez pas vos identifiants.", "Bien chaleureusement,"),
        ["ro"] = new("Fotografiile tale sunt gata: {0}", "Bună {0},", "Fotografiile tale din „{0}” te așteaptă în proiectul tău privat.", "Deschide fotografiile mele", "Utilizator", "Parolă", "Folosește parola primită de la fotograful tău.", "Doar tu poți deschide acest proiect. Te rog nu împărtăși datele de autentificare.", "Cu drag,"),
    };

    public static EmailMessage ProjectInvitation(
        string language, string to, string customerName, string title, string loginUrl, string username, string? password, string signature)
    {
        var t = Invitation.GetValueOrDefault(language) ?? Invitation["en"];
        static string e(string value) => WebUtility.HtmlEncode(value);
        var passwordLine = password is null ? t.NoPassword : $"{t.Password}: {password}";
        var passwordHtml = password is null
            ? $"<p style=\"color:#a39e94\">{e(t.NoPassword)}</p>"
            : Row(t.Password, password);

        var html = $"""
            <div style="background:#000;color:#f3ede3;font-family:Georgia,serif;padding:40px 24px">
              <div style="max-width:520px;margin:0 auto">
                <p style="letter-spacing:.3em;text-transform:uppercase;color:#c9a46a;font:12px Arial,sans-serif">{e(signature)}</p>
                <h1 style="font-weight:300;font-size:30px">{e(string.Format(t.Hello, customerName))}</h1>
                <p style="font:15px/1.6 Arial,sans-serif;color:#d8d2c8">{e(string.Format(t.Ready, title))}</p>
                <table style="margin:24px 0;font:14px monospace;color:#f3ede3">{Row(t.Username, username)}{(password is null ? "" : passwordHtml)}</table>
                {(password is null ? passwordHtml : "")}
                <p><a href="{e(loginUrl)}" style="display:inline-block;background:#c9a46a;color:#000;padding:14px 28px;border-radius:999px;text-decoration:none;font:bold 12px Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase">{e(t.Open)}</a></p>
                <p style="font:12px/1.6 Arial,sans-serif;color:#6b675f;margin-top:32px">{e(t.Private)}</p>
                <p style="font:14px Arial,sans-serif;color:#a39e94">{e(t.Bye)}<br>{e(signature)}</p>
              </div>
            </div>
            """;

        var text = $"""
            {string.Format(t.Hello, customerName)}

            {string.Format(t.Ready, title)}

            {loginUrl}
            {t.Username}: {username}
            {passwordLine}

            {t.Private}

            {t.Bye}
            {signature}
            """;

        return new EmailMessage(to, string.Format(t.Subject, title), html, text);

        static string Row(string label, string value) =>
            $"<tr><td style=\"padding:4px 16px 4px 0;color:#6b675f\">{WebUtility.HtmlEncode(label)}</td><td>{WebUtility.HtmlEncode(value)}</td></tr>";
    }

    /// <summary>Booking request forwarded to the photographer (reply goes to the visitor).</summary>
    public static EmailMessage BookingRequest(string ownerAddress, IReadOnlyList<(string Label, string Value)> fields, string replyTo)
    {
        static string e(string value) => WebUtility.HtmlEncode(value);
        var rows = string.Concat(fields.Select(f =>
            $"<tr><td style=\"padding:6px 16px 6px 0;color:#666;vertical-align:top\">{e(f.Label)}</td><td style=\"white-space:pre-wrap\">{e(f.Value)}</td></tr>"));
        var html = $"<h2 style=\"font-family:Georgia,serif\">New booking request</h2><table style=\"font:14px Arial,sans-serif\">{rows}</table>";
        var text = "New booking request\n\n" + string.Join('\n', fields.Select(f => $"{f.Label}: {f.Value}"));
        var name = fields.FirstOrDefault(f => f.Label == "Name").Value ?? "";
        return new EmailMessage(ownerAddress, $"Booking request from {name}", html, text, replyTo);
    }
}
