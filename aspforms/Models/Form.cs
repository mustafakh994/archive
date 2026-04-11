using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class Form
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
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
    
    [Column(TypeName = "jsonb")]
    public string? FormSchema { get; set; } // JSON schema for form fields
    
    [Column(TypeName = "jsonb")]
    public string? Settings { get; set; } // JSON settings
    
    public Guid? CreatedBy { get; set; }
    
    [Required]
    public int Version { get; set; } = 1;
    
    [MaxLength(50)]
    public string? Status { get; set; } = "Inactive";
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("DepartmentId")]
    public virtual Department Department { get; set; } = null!;
    
    [ForeignKey("CreatedBy")]
    public virtual User? Creator { get; set; }
    
    public virtual ICollection<FormSubmission> FormSubmissions { get; set; } = new List<FormSubmission>();
    public virtual ICollection<FormSchemaVersion> FormSchemaVersions { get; set; } = new List<FormSchemaVersion>();
    public virtual ICollection<Webhook> Webhooks { get; set; } = new List<Webhook>();
}