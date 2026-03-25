using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class SuperAdminUser
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Name { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? Permissions { get; set; } // JSON permissions
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    public DateTimeOffset? LastLoginAt { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset? UpdatedAt { get; set; }
}