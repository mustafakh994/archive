using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class ExportRequestDto
{
    [Required]
    public Guid FormId { get; set; }
    
    public List<string> SelectedFields { get; set; } = new();
    
    public ExportMetadataDto IncludeMetadata { get; set; } = new();
    
    public ExportFilterDto Filters { get; set; } = new();
}

public class ExportMetadataDto
{
    public bool Email { get; set; }
    public bool SubmittedAt { get; set; }
    public bool Ip { get; set; }
    public bool Version { get; set; }
}

public class ExportFilterDto
{
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
    
    [MaxLength(500)]
    public string? Search { get; set; }
    
    [Range(1, int.MaxValue, ErrorMessage = "Page must be greater than 0")]
    public int Page { get; set; } = 1;
    
    [Range(1, 10000, ErrorMessage = "Page size must be between 1 and 10,000")]
    public int PageSize { get; set; } = 1000;
    
    /// <summary>
    /// Gets the calculated skip value for pagination (Page - 1) * PageSize
    /// </summary>
    public int Skip => (Page - 1) * PageSize;
    
    /// <summary>
    /// Gets the take value for pagination (same as PageSize)
    /// </summary>
    public int Take => PageSize;
}

public class ExportDataDto
{
    public string FormName { get; set; } = string.Empty;
    public int TotalResponses { get; set; }
    public List<Dictionary<string, object>> Responses { get; set; } = new();
    public List<FormFieldDefinitionDto> Fields { get; set; } = new();
    public ExportPaginationMetadataDto Pagination { get; set; } = new();
}

public class ExportPaginationMetadataDto
{
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public int TotalRecords { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
    
    public static ExportPaginationMetadataDto Create(int currentPage, int pageSize, int totalRecords)
    {
        var totalPages = (int)Math.Ceiling((double)totalRecords / pageSize);
        
        return new ExportPaginationMetadataDto
        {
            CurrentPage = currentPage,
            PageSize = pageSize,
            TotalPages = totalPages,
            TotalRecords = totalRecords,
            HasNextPage = currentPage < totalPages,
            HasPreviousPage = currentPage > 1
        };
    }
}

public class FormFieldDefinitionDto
{
    [Required]
    public string Id { get; set; } = string.Empty;
    
    [Required]
    public string Label { get; set; } = string.Empty;
    
    [Required]
    public string Type { get; set; } = string.Empty;
    
    public List<FieldOptionDto>? Options { get; set; }
}

public class FieldOptionDto
{
    [Required]
    public string Value { get; set; } = string.Empty;
    
    [Required]
    public string Label { get; set; } = string.Empty;
}

// Server-side export DTOs (Optional - for future implementation)
public class ServerExportRequestDto : ExportRequestDto
{
    [Required]
    [RegularExpression("^(xlsx|csv)$", ErrorMessage = "Format must be 'xlsx' or 'csv'")]
    public string Format { get; set; } = "xlsx";
    
    [Url]
    public string? CallbackUrl { get; set; }
    
    /// <summary>
    /// Custom filename for the export (without extension)
    /// </summary>
    [MaxLength(100)]
    public string? FileName { get; set; }
    
    /// <summary>
    /// Date format preference (gregorian, hijri, etc.)
    /// </summary>
    public string? DateFormat { get; set; }
    
    /// <summary>
    /// Whether to include empty responses in the export
    /// </summary>
    public bool IncludeEmptyResponses { get; set; } = true;
}

public class ExportResultDto
{
    public Guid ExportId { get; set; }
    
    [Required]
    public string Status { get; set; } = "Processing";
    
    [Url]
    public string? DownloadUrl { get; set; }
    
    public DateTime EstimatedCompletion { get; set; }
    
    /// <summary>
    /// File size in bytes (when completed)
    /// </summary>
    public long? FileSizeBytes { get; set; }
}

public class ExportStatusDto
{
    public Guid ExportId { get; set; }
    
    [Required]
    public string Status { get; set; } = string.Empty;
    
    [Range(0, 100)]
    public int Progress { get; set; }
    
    [Url]
    public string? DownloadUrl { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// File size in bytes (when completed)
    /// </summary>
    public long? FileSizeBytes { get; set; }
    
    /// <summary>
    /// Export creation timestamp
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Export completion timestamp
    /// </summary>
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// Internal DTO for tracking export operations
/// </summary>
public class ExportOperationDto
{
    public Guid ExportId { get; set; }
    public Guid FormId { get; set; }
    public string Format { get; set; } = string.Empty;
    public string Status { get; set; } = "Processing";
    public int Progress { get; set; }
    public string? FilePath { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long? FileSizeBytes { get; set; }
    public ServerExportRequestDto Request { get; set; } = new();
}