using Microsoft.Extensions.Options;
using Sandugorea.Api.Data;
using Sandugorea.Api.Options;
using SkiaSharp;

namespace Sandugorea.Api.Services;

public enum PhotoVariant
{
    /// <summary>~800px WebP for grids.</summary>
    Thumb,
    /// <summary>~2048px WebP for the lightbox.</summary>
    Preview,
    /// <summary>The untouched uploaded file (downloads).</summary>
    Original,
}

public sealed class PhotoRejectedException(string reason) : Exception(reason)
{
    /// <summary>"type", "size" or "dimensions".</summary>
    public string Reason { get; } = reason;
}

/// <summary>
/// Stores photos on disk OUTSIDE wwwroot: {root}/projects/{projectId}/{variant}/{photoId}.ext
/// Files are only ever served through authorised endpoints.
/// </summary>
public sealed class PhotoStorage(IOptions<StorageOptions> options, ILogger<PhotoStorage> logger)
{
    private const int ThumbSize = 800;
    private const int PreviewSize = 2048;
    private const int WebpQuality = 82;

    /// <summary>Decoding big photos is memory-hungry; limit parallel work on a small VPS.</summary>
    private static readonly SemaphoreSlim Gate = new(2);

    private static readonly Dictionary<SKEncodedImageFormat, (string Ext, string Mime)> Allowed = new()
    {
        [SKEncodedImageFormat.Jpeg] = (".jpg", "image/jpeg"),
        [SKEncodedImageFormat.Png] = (".png", "image/png"),
        [SKEncodedImageFormat.Webp] = (".webp", "image/webp"),
    };

    private readonly StorageOptions _options = options.Value;

    public string Root => Path.GetFullPath(_options.Root);

    public string ProjectDir(Guid projectId) => Path.Combine(Root, "projects", projectId.ToString("N"));

    public string PathFor(Photo photo, PhotoVariant variant) => variant switch
    {
        PhotoVariant.Original => Path.Combine(ProjectDir(photo.ProjectId), "original", photo.Id.ToString("N") + photo.Extension),
        PhotoVariant.Preview => Path.Combine(ProjectDir(photo.ProjectId), "preview", photo.Id.ToString("N") + ".webp"),
        _ => Path.Combine(ProjectDir(photo.ProjectId), "thumb", photo.Id.ToString("N") + ".webp"),
    };

    public static string ContentTypeFor(Photo photo, PhotoVariant variant) =>
        variant == PhotoVariant.Original ? photo.ContentType : "image/webp";

    /// <summary>
    /// Validates the upload by actually decoding it (file name and browser content type are
    /// ignored), stores the original untouched and writes thumb + preview, rotated upright and
    /// without EXIF/GPS metadata.
    /// </summary>
    public async Task<Photo> SaveAsync(Guid projectId, IFormFile file, CancellationToken ct)
    {
        if (file.Length <= 0 || file.Length > _options.MaxUploadBytes) throw new PhotoRejectedException("size");

        var photo = new Photo
        {
            ProjectId = projectId,
            FileName = SanitizeFileName(file.FileName),
            Extension = ".jpg",
            ContentType = "image/jpeg",
            Size = file.Length,
        };

        var incoming = Path.Combine(ProjectDir(projectId), "incoming");
        Directory.CreateDirectory(incoming);
        var tempPath = Path.Combine(incoming, photo.Id.ToString("N"));

        await Gate.WaitAsync(ct);
        try
        {
            await using (var target = File.Create(tempPath))
            {
                await file.CopyToAsync(target, ct);
            }

            // CPU-bound decode/encode off the request thread.
            await Task.Run(() => Process(photo, tempPath), ct);

            var originalPath = PathFor(photo, PhotoVariant.Original);
            Directory.CreateDirectory(Path.GetDirectoryName(originalPath)!);
            File.Move(tempPath, originalPath);
            return photo;
        }
        catch
        {
            Delete(photo);
            throw;
        }
        finally
        {
            Gate.Release();
            TryDelete(tempPath);
        }
    }

    private void Process(Photo photo, string path)
    {
        using var codec = SKCodec.Create(path) ?? throw new PhotoRejectedException("type");
        if (!Allowed.TryGetValue(codec.EncodedFormat, out var type)) throw new PhotoRejectedException("type");

        var full = codec.Info;
        if ((long)full.Width * full.Height > _options.MaxMegapixels * 1_000_000L)
            throw new PhotoRejectedException("dimensions");

        photo.Extension = type.Ext;
        photo.ContentType = type.Mime;
        var swap = SwapsAxes(codec.EncodedOrigin);
        photo.Width = swap ? full.Height : full.Width;
        photo.Height = swap ? full.Width : full.Height;

        // JPEG/WebP can decode straight to a smaller size: far less memory for 40+ MP files.
        var scale = Math.Min(1f, PreviewSize / (float)Math.Max(full.Width, full.Height));
        var size = scale < 1f ? codec.GetScaledDimensions(scale) : full.Size;
        var info = new SKImageInfo(size.Width, size.Height, SKColorType.Rgba8888, SKAlphaType.Premul);

        using var decoded = new SKBitmap(info);
        var result = codec.GetPixels(info, decoded.GetPixels());
        if (result is not (SKCodecResult.Success or SKCodecResult.IncompleteInput))
            throw new PhotoRejectedException("type");

        using var upright = Orient(decoded, codec.EncodedOrigin);
        SaveWebp(upright, PreviewSize, PathFor(photo, PhotoVariant.Preview));
        SaveWebp(upright, ThumbSize, PathFor(photo, PhotoVariant.Thumb));
    }

    private static void SaveWebp(SKBitmap source, int maxSize, string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var scale = Math.Min(1.0, maxSize / (double)Math.Max(source.Width, source.Height));
        var w = Math.Max(1, (int)Math.Round(source.Width * scale));
        var h = Math.Max(1, (int)Math.Round(source.Height * scale));

        using var resized = scale < 1.0
            ? source.Resize(new SKImageInfo(w, h, source.ColorType, source.AlphaType), new SKSamplingOptions(SKCubicResampler.Mitchell))
            : source.Copy();
        using var image = SKImage.FromBitmap(resized);
        // Encoding from pixels writes no EXIF/GPS - metadata is stripped by construction.
        using var data = image.Encode(SKEncodedImageFormat.Webp, WebpQuality);
        using var stream = File.Create(path);
        data.SaveTo(stream);
    }

    private static bool SwapsAxes(SKEncodedOrigin o) =>
        o is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;

    /// <summary>Applies the EXIF orientation so the pixels are upright.</summary>
    private static SKBitmap Orient(SKBitmap src, SKEncodedOrigin origin)
    {
        var swap = SwapsAxes(origin);
        var dst = new SKBitmap(new SKImageInfo(swap ? src.Height : src.Width, swap ? src.Width : src.Height, src.ColorType, src.AlphaType));
        using var canvas = new SKCanvas(dst);
        float w = dst.Width, h = dst.Height;
        switch (origin)
        {
            case SKEncodedOrigin.TopRight: canvas.Translate(w, 0); canvas.Scale(-1, 1); break;
            case SKEncodedOrigin.BottomRight: canvas.Translate(w, h); canvas.RotateDegrees(180); break;
            case SKEncodedOrigin.BottomLeft: canvas.Translate(0, h); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.LeftTop: canvas.Translate(w, 0); canvas.Scale(-1, 1); canvas.Translate(w, 0); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightTop: canvas.Translate(w, 0); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightBottom: canvas.Translate(0, h); canvas.Scale(1, -1); canvas.Translate(w, 0); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.LeftBottom: canvas.Translate(0, h); canvas.RotateDegrees(270); break;
        }
        canvas.DrawBitmap(src, 0, 0);
        return dst;
    }

    public void Delete(Photo photo)
    {
        foreach (var v in Enum.GetValues<PhotoVariant>()) TryDelete(PathFor(photo, v));
    }

    public void DeleteProject(Guid projectId)
    {
        var dir = ProjectDir(projectId);
        try
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, recursive: true);
        }
        catch (IOException ex)
        {
            logger.LogWarning(ex, "Could not delete {Dir}", dir);
        }
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var clean = new string(Path.GetFileName(name).Where(c => !invalid.Contains(c) && !char.IsControl(c)).ToArray()).Trim();
        if (string.IsNullOrEmpty(clean)) clean = "photo";
        return clean.Length > 200 ? clean[^200..] : clean;
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path)) File.Delete(path);
        }
        catch (IOException)
        {
            // Best effort; orphaned files are harmless and outside the web root.
        }
    }
}
