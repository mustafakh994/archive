using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

/// <summary>
/// Service interface for server-side export functionality
/// </summary>
public interface IServerExportService
{
    /// <summary>
    /// Initiates a server-side export operation
    /// </summary>
    /// <param name="request">Export request parameters</param>
    /// <param name="userId">ID of the user requesting the export</param>
    /// <returns>Export operation result with tracking ID</returns>
    Task<ApiResponse<ExportResultDto>> InitiateExportAsync(ServerExportRequestDto request, Guid? userId);

    /// <summary>
    /// Gets the status of an export operation
    /// </summary>
    /// <param name="exportId">Export operation ID</param>
    /// <param name="userId">ID of the user checking status</param>
    /// <returns>Current export status</returns>
    Task<ApiResponse<ExportStatusDto>> GetExportStatusAsync(Guid exportId, Guid? userId);

    /// <summary>
    /// Downloads the completed export file
    /// </summary>
    /// <param name="exportId">Export operation ID</param>
    /// <param name="userId">ID of the user downloading the file</param>
    /// <returns>File stream and metadata</returns>
    Task<(Stream? FileStream, string? FileName, string? ContentType)> DownloadExportAsync(Guid exportId, Guid? userId);

    /// <summary>
    /// Cancels a running export operation
    /// </summary>
    /// <param name="exportId">Export operation ID</param>
    /// <param name="userId">ID of the user canceling the export</param>
    /// <returns>Cancellation result</returns>
    Task<ApiResponse<bool>> CancelExportAsync(Guid exportId, Guid? userId);

    /// <summary>
    /// Cleans up old export files and operations
    /// </summary>
    /// <param name="olderThanHours">Remove exports older than specified hours</param>
    /// <returns>Number of cleaned up operations</returns>
    Task<int> CleanupOldExportsAsync(int olderThanHours = 24);
}