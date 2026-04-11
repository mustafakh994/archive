using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class UsageMetric
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string MetricType { get; set; } = string.Empty;
    
    public int? Value { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? Details { get; set; } // JSON details
    
    [Required]
    public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("DepartmentId")]
    public virtual Department Department { get; set; } = null!;
}