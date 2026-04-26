using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class FileService : IFileService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;
    private readonly IAttachmentCrypto _attachmentCrypto;
    private readonly ILogger<FileService> _logger;
    private readonly string _uploadPath;
    private readonly string[] _allowedExtensions;

    public FileService(ApplicationDbContext context, IMapper mapper, IConfiguration configuration, IAttachmentCrypto attachmentCrypto, ILogger<FileService> logger)
    {
        _context = context;
        _mapper = mapper;
        _configuration = configuration;
        _attachmentCrypto = attachmentCrypto;
        _logger = logger;
        
        // Configure file upload settings
        _uploadPath = _configuration.GetValue<string>("FileUpload:UploadPath") ?? "uploads";
        _allowedExtensions = _configuration.GetSection("FileUpload:AllowedExtensions").Get<string[]>() ?? 
            new[] { ".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip" };
        
        // Ensure upload directory exists
        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);
        }
    }

    public async Task<ApiResponse<FileUploadDto>> UploadFileAsync(IFormFile file, Guid userId, Guid? departmentId, string? description = null)
    {
        try
        {
            // Validate file
            if (!ValidateFile(file, out string errorMessage))
            {
                return ApiResponse<FileUploadDto>.ErrorResponse(errorMessage);
            }

            // Generate unique filename
            var fileExtension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(_uploadPath, uniqueFileName);

            await using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                var plainBytes = ms.ToArray();

                var bytesToStore = _attachmentCrypto.IsEnabled
                    ? _attachmentCrypto.Encrypt(plainBytes)
                    : plainBytes;

                await File.WriteAllBytesAsync(filePath, bytesToStore);
            }

            // Save file info to database (FileSize = original plaintext length for clients)
            var fileAttachment = new FileAttachment
            {
                OriginalFileName = file.FileName,
                FileName = uniqueFileName,
                FilePath = filePath,
                ContentType = file.ContentType,
                FileSize = file.Length,
                Description = description,
                UploadedBy = userId,
                DepartmentId = departmentId,
                UploadedAt = DateTimeOffset.UtcNow,
                IsEncrypted = _attachmentCrypto.IsEnabled
            };

            _context.FileAttachments.Add(fileAttachment);
            await _context.SaveChangesAsync();

            var uploadDto = new FileUploadDto
            {
                Id = fileAttachment.Id,
                OriginalFileName = fileAttachment.OriginalFileName,
                FileName = fileAttachment.FileName,
                ContentType = fileAttachment.ContentType,
                FileSize = fileAttachment.FileSize,
                Description = fileAttachment.Description,
                UploadedAt = fileAttachment.UploadedAt,
                DownloadUrl = $"/api/files/download/{fileAttachment.Id}",
                FileId = fileAttachment.Id.ToString()
            };

            return ApiResponse<FileUploadDto>.SuccessResponse(uploadDto, "File uploaded successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file {FileName}", file.FileName);
            return ApiResponse<FileUploadDto>.ErrorResponse($"An error occurred while uploading the file: {ex.Message}");
        }
    }

    public async Task<ApiResponse<List<FileUploadDto>>> UploadMultipleFilesAsync(List<IFormFile> files, Guid userId, Guid? departmentId, string? description = null)
    {
        try
        {
            var uploadResults = new List<FileUploadDto>();
            var errors = new List<string>();

            foreach (var file in files)
            {
                var result = await UploadFileAsync(file, userId, departmentId, description);
                if (result.Success && result.Data != null)
                {
                    uploadResults.Add(result.Data);
                }
                else
                {
                    errors.Add($"{file.FileName}: {result.Message}");
                }
            }

            if (errors.Any())
            {
                return ApiResponse<List<FileUploadDto>>.ErrorResponse("Some files failed to upload", errors);
            }

            return ApiResponse<List<FileUploadDto>>.SuccessResponse(uploadResults, "All files uploaded successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading multiple files");
            return ApiResponse<List<FileUploadDto>>.ErrorResponse($"An error occurred while uploading files: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FileInfoDto>> GetFileAsync(Guid fileId)
    {
        try
        {
            var file = await _context.FileAttachments
                .Include(f => f.Uploader)
                .Include(f => f.Department)
                .Where(f => f.Id == fileId && !f.IsDeleted)
                .FirstOrDefaultAsync();

            if (file == null)
            {
                return ApiResponse<FileInfoDto>.ErrorResponse("File not found.");
            }

            var fileDto = _mapper.Map<FileInfoDto>(file);
            fileDto.DownloadUrl = $"/api/files/download/{file.Id}";

            return ApiResponse<FileInfoDto>.SuccessResponse(fileDto, "File information retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file {FileId}", fileId);
            return ApiResponse<FileInfoDto>.ErrorResponse($"An error occurred while retrieving file information: {ex.Message}");
        }
    }

    public async Task<byte[]?> GetFileBytesAsync(string filePath)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                return null;
            }

            var stored = await File.ReadAllBytesAsync(filePath);
            if (!_attachmentCrypto.LooksLikeEncryptedPackage(stored))
                return stored;

            if (!_attachmentCrypto.IsEnabled)
            {
                _logger.LogError("Encrypted file at {FilePath} but AttachmentEncryption:KeyBase64 is not configured.", filePath);
                return null;
            }

            try
            {
                return _attachmentCrypto.Decrypt(stored);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decrypt file {FilePath}", filePath);
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading file {FilePath}", filePath);
            return null;
        }
    }

    public async Task<ApiResponse<bool>> DeleteFileAsync(Guid fileId, Guid userId, bool isSuperAdmin = false)
    {
        try
        {
            var file = await _context.FileAttachments
                .Where(f => f.Id == fileId && !f.IsDeleted)
                .FirstOrDefaultAsync();

            if (file == null)
            {
                return ApiResponse<bool>.ErrorResponse("File not found.");
            }

            // Check permissions - only file owner or SuperAdmin can delete
            if (!isSuperAdmin && file.UploadedBy != userId)
            {
                return ApiResponse<bool>.ErrorResponse("You don't have permission to delete this file.");
            }

            // Soft delete
            file.IsDeleted = true;
            file.DeletedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // Optionally delete physical file
            try
            {
                if (File.Exists(file.FilePath))
                {
                    File.Delete(file.FilePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete physical file {FilePath}", file.FilePath);
            }

            return ApiResponse<bool>.SuccessResponse(true, "File deleted successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file {FileId}", fileId);
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting the file: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PagedResult<FileInfoDto>>> GetUserFilesAsync(Guid userId, PaginationDto pagination)
    {
        try
        {
            var query = _context.FileAttachments
                .Include(f => f.Uploader)
                .Include(f => f.Department)
                .Where(f => f.UploadedBy == userId && !f.IsDeleted)
                .AsQueryable();

            // Apply search
            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(f => f.OriginalFileName.Contains(pagination.Search) ||
                                       (f.Description != null && f.Description.Contains(pagination.Search)));
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "filename":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.OriginalFileName) : query.OrderBy(f => f.OriginalFileName);
                        break;
                    case "filesize":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.FileSize) : query.OrderBy(f => f.FileSize);
                        break;
                    case "uploadedat":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.UploadedAt) : query.OrderBy(f => f.UploadedAt);
                        break;
                    default:
                        query = query.OrderByDescending(f => f.UploadedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(f => f.UploadedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var fileDtos = _mapper.Map<List<FileInfoDto>>(items);
            foreach (var dto in fileDtos)
            {
                dto.DownloadUrl = $"/api/files/download/{dto.Id}";
            }

            var pagedResult = new PagedResult<FileInfoDto>(fileDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<FileInfoDto>>.SuccessResponse(pagedResult, "User files retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user files for {UserId}", userId);
            return ApiResponse<PagedResult<FileInfoDto>>.ErrorResponse($"An error occurred while retrieving files: {ex.Message}");
        }
    }

    public async Task<ApiResponse<List<FileAttachmentDto>>> GetSubmissionFilesAsync(Guid submissionId)
    {
        try
        {
            var files = await _context.FormSubmissionAttachments
                .Include(fsa => fsa.FileAttachment)
                .Where(fsa => fsa.FormSubmissionId == submissionId && !fsa.FileAttachment.IsDeleted)
                .Select(fsa => fsa.FileAttachment)
                .ToListAsync();

            var fileDtos = files.Select(f => new FileAttachmentDto
            {
                FileId = f.Id,
                FileName = f.FileName,
                OriginalFileName = f.OriginalFileName,
                ContentType = f.ContentType,
                FileSize = f.FileSize,
                DownloadUrl = $"/api/files/download/{f.Id}",
                UploadedAt = f.UploadedAt
            }).ToList();

            return ApiResponse<List<FileAttachmentDto>>.SuccessResponse(fileDtos, "Submission files retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting submission files for {SubmissionId}", submissionId);
            return ApiResponse<List<FileAttachmentDto>>.ErrorResponse($"An error occurred while retrieving submission files: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> AttachFilesToSubmissionAsync(Guid submissionId, List<Guid> fileIds)
    {
        try
        {
            // Verify submission exists
            var submissionExists = await _context.FormSubmissions.AnyAsync(fs => fs.Id == submissionId);
            if (!submissionExists)
            {
                return ApiResponse<bool>.ErrorResponse("Form submission not found.");
            }

            // Verify all files exist
            var existingFiles = await _context.FileAttachments
                .Where(f => fileIds.Contains(f.Id) && !f.IsDeleted)
                .Select(f => f.Id)
                .ToListAsync();

            if (existingFiles.Count != fileIds.Count)
            {
                return ApiResponse<bool>.ErrorResponse("One or more files not found.");
            }

            // Create attachments
            var attachments = fileIds.Select(fileId => new FormSubmissionAttachment
            {
                FormSubmissionId = submissionId,
                FileAttachmentId = fileId,
                AttachedAt = DateTimeOffset.UtcNow
            }).ToList();

            _context.FormSubmissionAttachments.AddRange(attachments);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Files attached to submission successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error attaching files to submission {SubmissionId}", submissionId);
            return ApiResponse<bool>.ErrorResponse($"An error occurred while attaching files: {ex.Message}");
        }
    }

    public bool ValidateFile(IFormFile file, out string errorMessage)
    {
        errorMessage = string.Empty;

        if (file == null || file.Length == 0)
        {
            errorMessage = "File is empty or not provided.";
            return false;
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
        {
            errorMessage = $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", _allowedExtensions)}";
            return false;
        }

        return true;
    }
}