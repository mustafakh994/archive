using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

/// <summary>
/// Controller for server-side export operations
/// Handles Excel and CSV file generation and download
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IServerExportService _serverExportService;
    private readonly ILogger<ExportController> _logger;

    public ExportController(IServerExportService serverExportService, ILogger<ExportController> logger)
    {
        _serverExportService = serverExportService;
        _logger = logger;
    }

    /// <summary>
    /// Initiates a server-side export operation for form submissions
    /// Supports Excel (xlsx) and CSV formats with async processing
    /// </summary>
    /// <param name="request">Export request with form ID, filters, and format specification</param>
    /// <returns>Export operation details with tracking ID</returns>
    [HttpPost("formsubmissions")]
    public async Task<ActionResult<ApiResponse<ExportResultDto>>> ExportFormSubmissions(
        [FromBody] ServerExportRequestDto request)
    {
        try
        {
            // Validate the request
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<ExportResultDto>.ErrorResponse("Validation failed", errors));
            }

            // Validate export format
            var supportedFormats = new[] { "xlsx", "csv" };
            if (!supportedFormats.Contains(request.Format.ToLower()))
            {
                return BadRequest(ApiResponse<ExportResultDto>.ErrorResponse(
                    $"Unsupported export format. Supported formats: {string.Join(", ", supportedFormats)}"));
            }

            // Validate date range
            if (request.Filters.StartDate.HasValue && request.Filters.EndDate.HasValue && 
                request.Filters.StartDate > request.Filters.EndDate)
            {
                return BadRequest(ApiResponse<ExportResultDto>.ErrorResponse("Start date cannot be after end date"));
            }

            // Get user ID
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = HttpContext.User.FindFirst("UserId");
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            // Check department-based access control
            if (!HttpContext.IsSuperAdmin())
            {
                var userDepartmentId = HttpContext.GetDepartmentId();
                if (!userDepartmentId.HasValue)
                {
                    return Forbid("You must be associated with a department to export form data.");
                }
            }

            var result = await _serverExportService.InitiateExportAsync(request, userId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Accepted(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid export request for form {FormId}", request.FormId);
            return BadRequest(ApiResponse<ExportResultDto>.ErrorResponse($"Invalid request: {ex.Message}"));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized export attempt for form {FormId}", request.FormId);
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initiate export for form {FormId}", request.FormId);
            return StatusCode(500, ApiResponse<ExportResultDto>.ErrorResponse("An error occurred while initiating the export"));
        }
    }

    /// <summary>
    /// Gets the status of a server-side export operation
    /// Returns progress, completion status, and download URL when ready
    /// </summary>
    /// <param name="exportId">Unique identifier of the export operation</param>
    /// <returns>Current export status and progress information</returns>
    [HttpGet("status/{exportId}")]
    public async Task<ActionResult<ApiResponse<ExportStatusDto>>> GetExportStatus(Guid exportId)
    {
        try
        {
            // Get user ID for access control
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = HttpContext.User.FindFirst("UserId");
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            var result = await _serverExportService.GetExportStatusAsync(exportId, userId);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get export status for {ExportId}", exportId);
            return StatusCode(500, ApiResponse<ExportStatusDto>.ErrorResponse("An error occurred while retrieving export status"));
        }
    }

    /// <summary>
    /// Downloads a completed export file
    /// Returns the Excel or CSV file as a downloadable attachment
    /// </summary>
    /// <param name="exportId">Unique identifier of the export operation</param>
    /// <returns>File download response</returns>
    [HttpGet("download/{exportId}")]
    public async Task<IActionResult> DownloadExport(Guid exportId)
    {
        try
        {
            // Get user ID for access control
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = HttpContext.User.FindFirst("UserId");
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            var (fileStream, fileName, contentType) = await _serverExportService.DownloadExportAsync(exportId, userId);

            if (fileStream == null || string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(contentType))
            {
                return NotFound(new { message = "Export file not found or not ready for download" });
            }

            return File(fileStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download export {ExportId}", exportId);
            return StatusCode(500, new { message = "An error occurred while downloading the export file" });
        }
    }

    /// <summary>
    /// Cancels a running export operation
    /// Can only cancel exports that are currently processing
    /// </summary>
    /// <param name="exportId">Unique identifier of the export operation</param>
    /// <returns>Cancellation result</returns>
    [HttpPost("cancel/{exportId}")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelExport(Guid exportId)
    {
        try
        {
            // Get user ID for access control
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = HttpContext.User.FindFirst("UserId");
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            var result = await _serverExportService.CancelExportAsync(exportId, userId);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel export {ExportId}", exportId);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while canceling the export"));
        }
    }

    /// <summary>
    /// Administrative endpoint to cleanup old export files
    /// Removes export operations and files older than specified hours
    /// </summary>
    /// <param name="olderThanHours">Remove exports older than this many hours (default: 24)</param>
    /// <returns>Number of cleaned up operations</returns>
    [HttpPost("cleanup")]
    [Authorize(Roles = "SuperAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<int>>> CleanupOldExports([FromQuery] int olderThanHours = 24)
    {
        try
        {
            if (olderThanHours < 1)
            {
                return BadRequest(ApiResponse<int>.ErrorResponse("olderThanHours must be at least 1"));
            }

            var cleanedCount = await _serverExportService.CleanupOldExportsAsync(olderThanHours);

            return Ok(ApiResponse<int>.SuccessResponse(cleanedCount, $"Cleaned up {cleanedCount} old export operations"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old exports");
            return StatusCode(500, ApiResponse<int>.ErrorResponse("An error occurred during cleanup"));
        }
    }

    /// <summary>
    /// Gets a list of recent export operations for the current user
    /// Useful for tracking export history and status
    /// </summary>
    /// <param name="limit">Maximum number of recent exports to return (default: 10, max: 50)</param>
    /// <returns>List of recent export operations</returns>
    [HttpGet("recent")]
    public async Task<ActionResult<ApiResponse<List<ExportStatusDto>>>> GetRecentExports([FromQuery] int limit = 10)
    {
        try
        {
            // Limit the number of results
            limit = Math.Min(Math.Max(limit, 1), 50);

            // Get user ID
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = HttpContext.User.FindFirst("UserId");
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            // For now, return empty list as we don't have user-specific tracking
            // In a full implementation, you would filter exports by user
            var recentExports = new List<ExportStatusDto>();

            return Ok(ApiResponse<List<ExportStatusDto>>.SuccessResponse(recentExports, "Recent exports retrieved successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get recent exports");
            return StatusCode(500, ApiResponse<List<ExportStatusDto>>.ErrorResponse("An error occurred while retrieving recent exports"));
        }
    }

}