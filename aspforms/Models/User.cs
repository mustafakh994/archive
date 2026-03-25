using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid? DepartmentId { get; set; }
    
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Name { get; set; }
    
    public Guid? RoleId { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? Profile { get; set; } // JSON profile data
    
    [Column(TypeName = "jsonb")]
    public string? CustomPermissions { get; set; } // JSON custom permissions
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    
    public DateTimeOffset? LastLoginAt { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("DepartmentId")]
    public virtual Department? Department { get; set; }
    
    [ForeignKey("RoleId")]
    public virtual Role? Role { get; set; }
    
    public virtual ICollection<FormSubmission> FormSubmissions { get; set; } = new List<FormSubmission>();
    public virtual ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
    public virtual ICollection<Form> CreatedForms { get; set; } = new List<Form>();
}