using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class FileAttachment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [Required]
    public long FileSize { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [Required]
    public Guid UploadedBy { get; set; }
    
    public Guid? DepartmentId { get; set; }
    
    [Required]
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public bool IsDeleted { get; set; } = false;
    
    public DateTimeOffset? DeletedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("UploadedBy")]
    public virtual User Uploader { get; set; } = null!;
    
    [ForeignKey("DepartmentId")]
    public virtual Department? Department { get; set; }
    
    // Relationship with form submissions
    public virtual ICollection<FormSubmissionAttachment> FormSubmissionAttachments { get; set; } = new List<FormSubmissionAttachment>();
}

public class FormSubmissionAttachment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid FormSubmissionId { get; set; }
    
    [Required]
    public Guid FileAttachmentId { get; set; }
    
    [Required]
    public DateTimeOffset AttachedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("FormSubmissionId")]
    public virtual FormSubmission FormSubmission { get; set; } = null!;
    
    [ForeignKey("FileAttachmentId")]
    public virtual FileAttachment FileAttachment { get; set; } = null!;
}