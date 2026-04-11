using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class DepartmentDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Code { get; set; }
    public object? Settings { get; set; } // JSON settings object
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public int UserCount { get; set; }
    public int FormCount { get; set; }
}

public class CreateDepartmentDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string? Code { get; set; }
    
    public object? Settings { get; set; }
}

public class UpdateDepartmentDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string? Code { get; set; }
    
    public object? Settings { get; set; }
}