using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IFileService
{
    /// <summary>
    /// Upload a single file
    /// </summary>
    Task<ApiResponse<FileUploadDto>> UploadFileAsync(IFormFile file, Guid userId, Guid? departmentId, string? description = null);
    
    /// <summary>
    /// Upload multiple files
    /// </summary>
    Task<ApiResponse<List<FileUploadDto>>> UploadMultipleFilesAsync(List<IFormFile> files, Guid userId, Guid? departmentId, string? description = null);
    
    /// <summary>
    /// Get file information by ID
    /// </summary>
    Task<ApiResponse<FileInfoDto>> GetFileAsync(Guid fileId);
    
    /// <summary>
    /// Get file bytes for download
    /// </summary>
    Task<byte[]?> GetFileBytesAsync(string filePath);
    
    /// <summary>
    /// Delete a file
    /// </summary>
    Task<ApiResponse<bool>> DeleteFileAsync(Guid fileId, Guid userId, bool isSuperAdmin = false);
    
    /// <summary>
    /// Get files uploaded by a specific user
    /// </summary>
    Task<ApiResponse<PagedResult<FileInfoDto>>> GetUserFilesAsync(Guid userId, PaginationDto pagination);
    
    /// <summary>
    /// Get files for a specific form submission
    /// </summary>
    Task<ApiResponse<List<FileAttachmentDto>>> GetSubmissionFilesAsync(Guid submissionId);
    
    /// <summary>
    /// Attach files to a form submission
    /// </summary>
    Task<ApiResponse<bool>> AttachFilesToSubmissionAsync(Guid submissionId, List<Guid> fileIds);
    
    /// <summary>
    /// Validate file type and size
    /// </summary>
    bool ValidateFile(IFormFile file, out string errorMessage);
}