using Microsoft.AspNetCore.Http;

namespace DevTrack.Api.Services;

public sealed record StoredFileResult(string StoragePath, long SizeBytes, string ContentType);

public interface IFileStorageService
{
    Task<StoredFileResult> SaveAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<FileStream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken = default);
    Task DeleteIfExistsAsync(string storagePath, CancellationToken cancellationToken = default);
}
