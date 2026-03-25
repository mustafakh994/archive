using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class RoleDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public List<PermissionDto> Permissions { get; set; } = new();
}

public class CreateRoleDto
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
    
    public bool IsSystemRole { get; set; } = false;
    
    public bool IsActive { get; set; } = true;
    
    public List<Guid> PermissionIds { get; set; } = new();
}

public class UpdateRoleDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? DisplayName { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public bool IsActive { get; set; }
    
    public List<Guid> PermissionIds { get; set; } = new();
}