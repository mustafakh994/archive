using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class PermissionDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? Resource { get; set; }
    public string? Action { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class CreatePermissionDto
{
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? DisplayName { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? Resource { get; set; }
    
    [MaxLength(100)]
    public string? Action { get; set; }
    
    public bool IsActive { get; set; } = true;
}

public class UpdatePermissionDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? DisplayName { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? Resource { get; set; }
    
    [MaxLength(100)]
    public string? Action { get; set; }
    
    public bool IsActive { get; set; }
}