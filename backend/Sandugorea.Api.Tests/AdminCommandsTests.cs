using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Sandugorea.Api.Services;

namespace Sandugorea.Api.Tests;

public sealed class AdminCommandsTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Reset_replaces_all_admins_and_signs_out_the_old_one()
    {
        var (oldAdmin, _) = await _factory.AdminAsync();

        var output = new StringWriter();
        Assert.Equal(0, await AdminCommands.RunAsync(_factory.Services, ["reset", "igor", "Sandu"], output));
        var passwords = Regex.Matches(output.ToString(), @"Username: (\S+)\tPassword: (\S+)")
            .ToDictionary(m => m.Groups[1].Value, m => m.Groups[2].Value);
        Assert.Equal(["igor", "sandu"], passwords.Keys.Order());

        // The old admin's session and account are gone.
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldAdmin.GetAsync("/api/admin/stats")).StatusCode);
        var old = await _factory.NewClient().PostAsJsonAsync("/api/admin/auth/login", new { username = ApiFactory.AdminUser, password = ApiFactory.AdminPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, old.StatusCode);

        // Each new admin signs in and is asked to set up two-factor authentication.
        foreach (var (user, password) in passwords)
        {
            var login = await _factory.NewClient().PostAsJsonAsync("/api/admin/auth/login", new { username = user, password });
            Assert.Equal(HttpStatusCode.OK, login.StatusCode);
            Assert.Equal("enroll", (await login.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("next").GetString());
        }

        Assert.Equal(2, await AdminCommands.RunAsync(_factory.Services, ["reset", "x"], TextWriter.Null));
    }
}
