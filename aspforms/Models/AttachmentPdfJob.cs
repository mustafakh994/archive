using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.Models;

public class AttachmentPdfJob
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string OwnerKey { get; set; } = string.Empty;

    [Required]
    public Guid SubmissionId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string AttachmentUrlsJson { get; set; } = "[]";

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "queued";

    public int Progress { get; set; } = 0;

    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    [MaxLength(1000)]
    public string? FilePath { get; set; }

    [MaxLength(300)]
    public string? FileName { get; set; }

    public long? FileSizeBytes { get; set; }

    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Required]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? CompletedAt { get; set; }
}
