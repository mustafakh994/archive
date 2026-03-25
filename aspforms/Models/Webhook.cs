using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormsManagementApi.Models;

public class Webhook
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid FormId { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;
    
    [Column(TypeName = "text[]")]
    public string[] Events { get; set; } = Array.Empty<string>();
    
    [Column(TypeName = "jsonb")]
    public string? Headers { get; set; } // JSON headers
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    [Column(TypeName = "jsonb")]
    public string? RetryConfig { get; set; } // JSON retry configuration
    
    [Required]
    public Guid CreatedBy { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("FormId")]
    public virtual Form Form { get; set; } = null!;
    
    [ForeignKey("CreatedBy")]
    public virtual User Creator { get; set; } = null!;
    
    public virtual ICollection<WebhookDelivery> Deliveries { get; set; } = new List<WebhookDelivery>();
}

public class WebhookDelivery
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid WebhookId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    [Column(TypeName = "jsonb")]
    public string? Payload { get; set; } // JSON payload
    
    public int? ResponseStatus { get; set; }
    
    public string? ResponseBody { get; set; }
    
    [Required]
    public int AttemptCount { get; set; } = 1;
    
    public DateTimeOffset? DeliveredAt { get; set; }
    
    public DateTimeOffset? NextRetryAt { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    [ForeignKey("WebhookId")]
    public virtual Webhook Webhook { get; set; } = null!;
}

