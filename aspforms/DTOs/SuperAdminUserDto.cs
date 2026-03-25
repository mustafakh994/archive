using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class SuperAdminUserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public object? Permissions { get; set; } // JSON permissions
    public bool IsActive { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}

public class CreateSuperAdminUserDto
{
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MinLength(6)]
    [MaxLength(255)]
    public string Password { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Name { get; set; }
    
    public object? Permissions { get; set; }
    
    public bool IsActive { get; set; } = true;
}

public class UpdateSuperAdminUserDto
{
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Name { get; set; }
    
    public object? Permissions { get; set; }
    
    public bool IsActive { get; set; }
}

public class ChangeSuperAdminPasswordDto
{
    [Required]
    [MinLength(6)]
    [MaxLength(255)]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [MinLength(6)]
    [MaxLength(255)]
    public string NewPassword { get; set; } = string.Empty;
}