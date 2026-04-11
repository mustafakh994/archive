using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class FormSchemaVersion
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid FormId { get; set; }
    
    [Required]
    public int VersionNumber { get; set; }
    
    [Required]
    [Column(TypeName = "jsonb")]
    public string SchemaData { get; set; } = string.Empty;
    
    public Guid? CreatedBy { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("FormId")]
    public virtual Form Form { get; set; } = null!;
    
    [ForeignKey("CreatedBy")]
    public virtual User? Creator { get; set; }
}