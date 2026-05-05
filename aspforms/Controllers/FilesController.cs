using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly ILogger<FilesController> _logger;

    public FilesController(IFileService fileService, ILogger<FilesController> logger)
    {
        _fileService = fileService;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file for form attachments
    /// </summary>
    [HttpPost("upload")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<FileUploadDto>>> UploadFile(IFormFile file, [FromForm] string? description = null)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<FileUploadDto>.ErrorResponse("No file provided or file is empty."));
            }

            var userId = HttpContext.GetUserId();
            var departmentId = HttpContext.GetDepartmentId();

            if (!userId.HasValue)
            {
                return BadRequest(ApiResponse<FileUploadDto>.ErrorResponse("User ID is required."));
            }

            var result = await _fileService.UploadFileAsync(file, userId.Value, departmentId, description);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file");
            return StatusCode(500, ApiResponse<FileUploadDto>.ErrorResponse("An error occurred while uploading the file."));
        }
    }

    /// <summary>
    /// Upload multiple files for form attachments
    /// </summary>
    [HttpPost("upload-multiple")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<FileUploadDto>>>> UploadMultipleFiles(List<IFormFile> files, [FromForm] string? description = null)
    {
        try
        {
            if (files == null || !files.Any())
            {
                return BadRequest(ApiResponse<List<FileUploadDto>>.ErrorResponse("No files provided."));
            }

            var userId = HttpContext.GetUserId();
            var departmentId = HttpContext.GetDepartmentId();

            if (!userId.HasValue)
            {
                return BadRequest(ApiResponse<List<FileUploadDto>>.ErrorResponse("User ID is required."));
            }

            var result = await _fileService.UploadMultipleFilesAsync(files, userId.Value, departmentId, description);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading multiple files");
            return StatusCode(500, ApiResponse<List<FileUploadDto>>.ErrorResponse("An error occurred while uploading the files."));
        }
    }

    /// <summary>
    /// Download a file by ID
    /// </summary>
    [HttpGet("download/{fileId}")]
    public async Task<IActionResult> DownloadFile(Guid fileId)
    {
        try
        {
            var result = await _fileService.GetFileAsync(fileId);

            if (!result.Success || result.Data == null)
            {
                return NotFound();
            }

            var fileInfo = result.Data;
            var fileBytes = await _fileService.GetFileBytesAsync(fileInfo.FilePath);

            if (fileBytes == null)
            {
                return NotFound();
            }

            return File(fileBytes, fileInfo.ContentType, fileInfo.OriginalFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file {FileId}", fileId);
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Download a file by stored filename (legacy mobile compatibility).
    /// </summary>
    [HttpGet("download/by-name/{fileName}")]
    public async Task<IActionResult> DownloadFileByStoredName(string fileName)
    {
        try
        {
            var result = await _fileService.GetFileByStoredNameAsync(fileName);

            if (!result.Success || result.Data == null)
            {
                return NotFound();
            }

            var fileInfo = result.Data;
            var fileBytes = await _fileService.GetFileBytesAsync(fileInfo.FilePath);

            if (fileBytes == null)
            {
                return NotFound();
            }

            return File(fileBytes, fileInfo.ContentType, fileInfo.OriginalFileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file by stored name {FileName}", fileName);
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Get file information by ID
    /// </summary>
    [HttpGet("{fileId}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<FileInfoDto>>> GetFileInfo(Guid fileId)
    {
        try
        {
            var result = await _fileService.GetFileAsync(fileId);

            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file info {FileId}", fileId);
            return StatusCode(500, ApiResponse<FileInfoDto>.ErrorResponse("An error occurred while retrieving file information."));
        }
    }

    /// <summary>
    /// Delete a file by ID
    /// </summary>
    [HttpDelete("{fileId}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFile(Guid fileId)
    {
        try
        {
            var userId = HttpContext.GetUserId();
            var isSuperAdmin = HttpContext.IsSuperAdmin();

            if (!userId.HasValue)
            {
                return BadRequest(ApiResponse<bool>.ErrorResponse("User ID is required."));
            }

            var result = await _fileService.DeleteFileAsync(fileId, userId.Value, isSuperAdmin);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file {FileId}", fileId);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while deleting the file."));
        }
    }

    /// <summary>
    /// Get files uploaded by current user
    /// </summary>
    [HttpGet("my-files")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PagedResult<FileInfoDto>>>> GetMyFiles([FromQuery] PaginationDto pagination)
    {
        try
        {
            var userId = HttpContext.GetUserId();
            
            if (!userId.HasValue)
            {
                return BadRequest(ApiResponse<PagedResult<FileInfoDto>>.ErrorResponse("User ID is required."));
            }

            var result = await _fileService.GetUserFilesAsync(userId.Value, pagination);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user files");
            return StatusCode(500, ApiResponse<PagedResult<FileInfoDto>>.ErrorResponse("An error occurred while retrieving files."));
        }
    }
}