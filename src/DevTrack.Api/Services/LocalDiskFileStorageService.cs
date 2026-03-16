using System.Text.RegularExpressions;

namespace DevTrack.Api.Services;

public sealed class LocalDiskFileStorageService(IWebHostEnvironment environment) : IFileStorageService
{
    private readonly string _storageRoot = Path.Combine(environment.ContentRootPath, "App_Data", "uploads");

    public async Task<StoredFileResult> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_storageRoot);

        string extension = Path.GetExtension(file.FileName);
        string safeExtension = extension.Length > 10 ? extension[..10] : extension;
        string uniqueName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{safeExtension}";
        string relativePath = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"), uniqueName);
        string fullPath = Path.Combine(_storageRoot, relativePath);
        string? parentDirectory = Path.GetDirectoryName(fullPath);

        if (!string.IsNullOrWhiteSpace(parentDirectory))
        {
            Directory.CreateDirectory(parentDirectory);
        }

        await using FileStream stream = File.Create(fullPath);
        await file.CopyToAsync(stream, cancellationToken);

        string normalizedRelativePath = Regex.Replace(relativePath, @"[\\/]+", "/");
        string contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        return new StoredFileResult(normalizedRelativePath, file.Length, contentType);
    }

    public Task<FileStream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken = default)
    {
        string fullPath = Path.Combine(_storageRoot, storagePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<FileStream?>(null);
        }

        FileStream stream = File.Open(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<FileStream?>(stream);
    }

    public Task DeleteIfExistsAsync(string storagePath, CancellationToken cancellationToken = default)
    {
        string fullPath = Path.Combine(_storageRoot, storagePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
