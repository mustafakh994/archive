using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

// Temporary model to maintain compatibility - should be replaced with Webhook model
public class WebhookEndpoint
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Method { get; set; } = "POST";
    
    [Column(TypeName = "jsonb")]
    public string? Headers { get; set; } // JSON headers
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Navigation property
    [ForeignKey("DepartmentId")]
    public virtual Department Department { get; set; } = null!;
}

