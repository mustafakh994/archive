using System.ComponentModel.DataAnnotations;
using System.Net;

namespace FormsManagementApi.DTOs;

public class FormDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public object? FormSchema { get; set; } // JSON schema
    public object? Settings { get; set; } // JSON settings
    public Guid? CreatedBy { get; set; }
    public int Version { get; set; }
    public string? Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public string? DepartmentName { get; set; }
    public string? CreatorName { get; set; }
    public int SubmissionCount { get; set; }
}

public class CreateFormDto
{
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Code { get; set; }
    
    [MaxLength(300)]
    public string? Title { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public object? FormSchema { get; set; }
    
    public object? Settings { get; set; }
    
    [MaxLength(50)]
    public string? Status { get; set; }
}

public class CreateFormRequestDto
{
    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string DepartmentId { get; set; } = string.Empty;
    
    public List<FormPageDto>? Schema { get; set; }
    
    public List<FormSettingDto>? Settings { get; set; }
}

public class FormPageDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<FormFieldDto>? Fields { get; set; }
}

public class FormFieldDto
{
    public string Type { get; set; } = string.Empty;
    public FormFieldPropertiesDto Properties { get; set; } = new();
    public string Id { get; set; } = string.Empty;
}

public class FormFieldPropertiesDto
{
    public string Label { get; set; } = string.Empty;
    public string? Placeholder { get; set; }
    public bool Required { get; set; }
    public bool IsSearchable { get; set; }
    public List<FormFieldOptionDto>? Options { get; set; }
    public FormFieldValidationDto? Validation { get; set; }
}

public class FormFieldOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class FormFieldValidationDto
{
    public string? Rule { get; set; }
    public string? Pattern { get; set; }
    public string? ErrorMessage { get; set; }
    public int? MaxValue { get; set; }
}

public class FormSettingDto
{
    public string Key { get; set; } = string.Empty;
    public object? Value { get; set; }
}

public class UpdateFormDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Code { get; set; }
    
    [MaxLength(300)]
    public string? Title { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public object? FormSchema { get; set; }
    
    public object? Settings { get; set; }
    
    [MaxLength(50)]
    public string? Status { get; set; }
}

public class FormSubmissionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public object ResponseData { get; set; } = null!; // JSON response data
    public int? FormVersion { get; set; }
    public string? SubmitterIp { get; set; }
    public string? SubmitterEmail { get; set; }
    public Guid? SubmittedByUserId { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }
    public string? FormName { get; set; }
}

public class CreateFormSubmissionDto
{
    [Required]
    public object ResponseData { get; set; } = null!; // JSON object
    
    public int? FormVersion { get; set; }
    
    public string? SubmitterIp { get; set; }
    
    [EmailAddress]
    public string? SubmitterEmail { get; set; }
}

public class CreateFormSubmissionWithFilesDto
{
    [Required]
    public string ResponseDataJson { get; set; } = string.Empty; // JSON string containing R2 URLs for file fields
    
    public int? FormVersion { get; set; }
    
    public string? SubmitterIp { get; set; }
    
    [EmailAddress]
    public string? SubmitterEmail { get; set; }
    
    // Files are now handled by Cloudflare R2, URLs are included in ResponseDataJson
    // This property is kept for backward compatibility but not used
    public List<IFormFile>? Files { get; set; }
}

public class FormSchemaVersionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public int VersionNumber { get; set; }
    public object SchemaData { get; set; } = null!;
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatorName { get; set; }
}