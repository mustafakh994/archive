namespace FormsManagementApi.DTOs;

public class FormPreviewDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public object FormSchema { get; set; } = new object();
    public object? Settings { get; set; }
    public string? Status { get; set; }
    public bool IsActive { get; set; }
    public bool AllowAnonymousSubmissions { get; set; }
    public int Version { get; set; }
    
    // Exclude sensitive information like:
    // - CreatedBy, UpdatedAt, DepartmentId
    // - Internal settings or metadata
    // - User/permission information
}