using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class RolePermission
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid RoleId { get; set; }
    
    [Required]
    public Guid PermissionId { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;
    
    [ForeignKey("PermissionId")]
    public virtual Permission Permission { get; set; } = null!;
}