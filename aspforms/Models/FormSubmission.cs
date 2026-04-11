using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net;

namespace FormsManagementApi.Models;

public class FormSubmission
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid FormId { get; set; }
    
    [Required]
    [Column(TypeName = "jsonb")]
    public string ResponseData { get; set; } = string.Empty; // JSON response data
    
    public int? FormVersion { get; set; }
    
    [Column(TypeName = "inet")]
    public IPAddress? SubmitterIp { get; set; }
    
    [MaxLength(255)]
    [EmailAddress]
    public string? SubmitterEmail { get; set; }
    
    [Required]
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("FormId")]
    public virtual Form Form { get; set; } = null!;
}