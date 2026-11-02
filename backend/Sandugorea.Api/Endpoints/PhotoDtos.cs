using Sandugorea.Api.Contracts;
using Sandugorea.Api.Data;

namespace Sandugorea.Api.Endpoints;

internal static class PhotoDtos
{
    /// <param name="area">"admin" or "customer" - each has its own authorised photo endpoint.</param>
    public static PhotoDto ToDto(this Photo p, string area)
    {
        var baseUrl = $"/api/{area}/photos/{p.Id}";
        return new PhotoDto(p.Id, p.FileName, p.Size, p.Width, p.Height, p.UploadedAt,
            $"{baseUrl}/thumb", $"{baseUrl}/preview", $"{baseUrl}/original");
    }

    public static bool TryParseVariant(string value, out Services.PhotoVariant variant) =>
        Enum.TryParse(value, ignoreCase: true, out variant) && Enum.IsDefined(variant);
}
