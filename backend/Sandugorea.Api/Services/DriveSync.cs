using Microsoft.EntityFrameworkCore;
using Sandugorea.Api.Data;

namespace Sandugorea.Api.Services;

/// <summary>
/// Creates each project's folder in Google Drive and moves original photos from the server's disk to Google Drive, one at a time, in the
/// background. An upload lands on disk first (thumb + preview are made there and stay there);
/// this then copies the original to the project's Drive folder and deletes the local copy.
/// Until that has happened the original is simply served from disk, so nothing waits on it.
/// </summary>
public sealed class DriveSync(
    IServiceScopeFactory scopes,
    GoogleDrive drive,
    PhotoStorage storage,
    ILogger<DriveSync> logger) : BackgroundService
{
    /// <summary>DriveFileId of a photo whose original was lost before it could be moved.</summary>
    public const string Missing = "missing";

    private static readonly TimeSpan IdleDelay = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromMinutes(2);

    private readonly SemaphoreSlim _wake = new(0, int.MaxValue);

    /// <summary>New work (an upload, a fresh connection): start now instead of at the next check.</summary>
    public void Wake()
    {
        if (_wake.CurrentCount == 0) _wake.Release();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!drive.Configured) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = IdleDelay;
            try
            {
                // Keep going while there's work; rest when the backlog is empty.
                while (await MoveNextAsync(stoppingToken)) { }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (DriveUnavailableException ex)
            {
                logger.LogWarning("Drive sync paused: {Reason}", ex.Message);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Drive sync failed; retrying in {Delay}", ErrorDelay);
                delay = ErrorDelay;
            }

            try
            {
                await _wake.WaitAsync(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    /// <summary>Creates one missing project folder or moves one photo. False when there's nothing left to do.</summary>
    internal async Task<bool> MoveNextAsync(CancellationToken ct)
    {
        if (!await drive.IsConnectedAsync(ct)) return false;

        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Every project gets its Drive folder right away, even before it has photos.
        var withoutFolder = await db.Projects.Where(p => p.DriveFolderId == null)
            .OrderBy(p => p.CreatedAt).FirstOrDefaultAsync(ct);
        if (withoutFolder is not null)
        {
            await drive.EnsureProjectFolderAsync(db, withoutFolder, ct);
            logger.LogInformation("Created Drive folder for project {Title}", withoutFolder.Title);
            return true;
        }

        var photo = await db.Photos.Include(p => p.Project)
            .Where(p => p.DriveFileId == null)
            .OrderBy(p => p.UploadedAt)
            .FirstOrDefaultAsync(ct);
        if (photo?.Project is null) return false;

        var path = storage.PathFor(photo, PhotoVariant.Original);
        if (!File.Exists(path))
        {
            // Lost locally (should not happen): mark it so the queue doesn't stall on it.
            logger.LogError("Original of photo {Id} is missing on disk; skipped", photo.Id);
            photo.DriveFileId = Missing;
            await db.SaveChangesAsync(ct);
            return true;
        }

        var folder = await drive.EnsureProjectFolderAsync(db, photo.Project, ct);
        string fileId;
        await using (var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20, useAsync: true))
        {
            fileId = await drive.UploadAsync(folder, photo.FileName, photo.ContentType, file, file.Length, ct);
        }

        // Deleted (photo or whole project) while it was uploading: don't keep an orphan in Drive.
        db.ChangeTracker.Clear();
        var current = await db.Photos.FirstOrDefaultAsync(p => p.Id == photo.Id, ct);
        if (current is null)
        {
            await drive.TrashAsync(fileId, ct);
            return true;
        }

        current.DriveFileId = fileId;
        await db.SaveChangesAsync(ct);
        storage.DeleteOriginal(current);
        logger.LogInformation("Moved {Name} ({Size} bytes) to Drive", current.FileName, current.Size);
        return true;
    }
}
