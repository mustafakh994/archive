using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class FileInfoDto
{
    public Guid Id { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? Description { get; set; }
    public Guid UploadedBy { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public string? UploaderName { get; set; }
    public string? DepartmentName { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
}

public class FileUploadDto
{
    public Guid Id { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
    public string FileId { get; set; } = string.Empty;
}

public class CreateFileDto
{
    [Required]
    public string OriginalFileName { get; set; } = string.Empty;
    
    [Required]
    public string FileName { get; set; } = string.Empty;
    
    [Required]
    public string FilePath { get; set; } = string.Empty;
    
    [Required]
    public string ContentType { get; set; } = string.Empty;
    
    [Required]
    public long FileSize { get; set; }
    
    public string? Description { get; set; }
    
    [Required]
    public Guid UploadedBy { get; set; }
    
    public Guid? DepartmentId { get; set; }
}

public class FileAttachmentDto
{
    public Guid FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
    public DateTimeOffset UploadedAt { get; set; }
}