namespace Sandugorea.Api.Security;

public static class SecurityMiddleware
{
    public const string CsrfHeader = "X-Requested-With";
    public const string CsrfValue = "XMLHttpRequest";

    /// <summary>
    /// CSRF guard: state-changing /api requests must carry a custom header. Browsers only send
    /// custom headers cross-site after a CORS preflight, which this API never allows - so a
    /// forged form post from another site is rejected (on top of SameSite=Strict cookies).
    /// </summary>
    public static IApplicationBuilder UseCsrfHeaderCheck(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            var method = ctx.Request.Method;
            var unsafeMethod = !(HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method));
            if (unsafeMethod && ctx.Request.Path.StartsWithSegments("/api")
                && ctx.Request.Headers[CsrfHeader] != CsrfValue)
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsJsonAsync(new { error = "csrf" });
                return;
            }
            await next();
        });

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            ctx.Response.OnStarting(() =>
            {
                var h = ctx.Response.Headers;
                h["X-Content-Type-Options"] = "nosniff";
                h["X-Frame-Options"] = "DENY";
                h["Referrer-Policy"] = "strict-origin-when-cross-origin";
                h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
                h["Cross-Origin-Opener-Policy"] = "same-origin";
                h["Content-Security-Policy"] =
                    "default-src 'self'; " +
                    "script-src 'self'; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' data: https://fonts.gstatic.com; " +   // data: = the icon font embedded in the CSS
                    // picsum.photos: placeholder images until the real portfolio is added.
                    "img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos; " +
                    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
                if (ctx.Request.Path.StartsWithSegments("/api"))
                {
                    // Private data: never cache in shared caches. Photo endpoints override this.
                    h.TryAdd("Cache-Control", "no-store");
                }
                return Task.CompletedTask;
            });
            await next();
        });
}
