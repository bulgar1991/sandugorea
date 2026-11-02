using System.Net.Http.Json;
using System.Text.Json;
using SkiaSharp;

namespace Sandugorea.Api.Tests;

/// <summary>Cameras store portraits sideways plus an EXIF "orientation" flag; previews must come out upright.</summary>
public sealed class OrientationTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    /// <summary>300x200 JPEG: left half red, right half blue, with the given EXIF orientation.</summary>
    private static byte[] JpegWithOrientation(ushort orientation)
    {
        using var bitmap = new SKBitmap(300, 200);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.DrawRect(0, 0, 150, 200, new SKPaint { Color = SKColors.Red });
            canvas.DrawRect(150, 0, 150, 200, new SKPaint { Color = SKColors.Blue });
        }
        using var image = SKImage.FromBitmap(bitmap);
        var jpeg = image.Encode(SKEncodedImageFormat.Jpeg, 95).ToArray();

        // Minimal APP1/Exif segment: little-endian TIFF, one IFD entry 0x0112 (Orientation).
        byte[] tiff =
        [
            (byte)'I', (byte)'I', 42, 0, 8, 0, 0, 0,     // header, IFD at offset 8
            1, 0,                                         // 1 entry
            0x12, 0x01, 3, 0, 1, 0, 0, 0,                 // tag 0x0112, SHORT, count 1
            (byte)orientation, 0, 0, 0,                   // value
            0, 0, 0, 0,                                   // no next IFD
        ];
        var payload = "Exif\0\0"u8.ToArray().Concat(tiff).ToArray();
        var length = payload.Length + 2;
        byte[] app1 = [0xFF, 0xE1, (byte)(length >> 8), (byte)(length & 0xFF), .. payload];
        return [.. jpeg[..2], .. app1, .. jpeg[2..]]; // right after SOI
    }

    [Theory]
    // orientation, expected thumb size, where the red half ends up
    [InlineData(1, 300, 200, "left")]
    [InlineData(3, 300, 200, "right")]  // rotated 180
    [InlineData(6, 200, 300, "top")]    // rotate 90 clockwise
    [InlineData(8, 200, 300, "bottom")] // rotate 90 counter-clockwise
    [InlineData(2, 300, 200, "right")]  // mirrored
    [InlineData(5, 200, 300, "top")]    // transposed
    [InlineData(7, 200, 300, "bottom")] // transversed
    public async Task Previews_are_rotated_upright(ushort orientation, int width, int height, string red)
    {
        var (admin, _) = await _factory.AdminAsync();
        var project = await (await admin.PostAsJsonAsync("/api/admin/projects", new
        {
            title = "T", date = "2026-01-01", customerName = "C", customerEmail = "c@example.com",
            language = "en", username = $"orient{orientation}", password = "Customer-Pass-1",
        })).Content.ReadFromJsonAsync<JsonElement>();

        var upload = await admin.PostAsync($"/api/admin/projects/{project.GetProperty("id").GetString()}/photos",
            SecurityTests.PhotoForm(JpegWithOrientation(orientation)));
        var photo = await upload.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(width, photo.GetProperty("width").GetInt32());
        Assert.Equal(height, photo.GetProperty("height").GetInt32());

        var bytes = await admin.GetByteArrayAsync(photo.GetProperty("thumbUrl").GetString());
        using var thumb = SKBitmap.Decode(bytes);
        Assert.Equal(width, thumb.Width);
        Assert.Equal(height, thumb.Height);

        var probe = red switch
        {
            "left" => thumb.GetPixel(thumb.Width / 4, thumb.Height / 2),
            "right" => thumb.GetPixel(thumb.Width * 3 / 4, thumb.Height / 2),
            "top" => thumb.GetPixel(thumb.Width / 2, thumb.Height / 4),
            _ => thumb.GetPixel(thumb.Width / 2, thumb.Height * 3 / 4),
        };
        Assert.True(probe.Red > 200 && probe.Blue < 60, $"expected red on the {red}, got {probe}");
    }
}
