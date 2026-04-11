using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class WebhookEndpointDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public object? Headers { get; set; } // JSON headers
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public string? DepartmentName { get; set; }
}

public class CreateWebhookEndpointDto
{
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(500)]
    [Url]
    public string Url { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Method { get; set; } = "POST";
    
    public object? Headers { get; set; } // JSON object for headers
    
    public bool IsActive { get; set; } = true;
}

public class UpdateWebhookEndpointDto
{
    [Required]
    [MaxLength(500)]
    [Url]
    public string Url { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Method { get; set; } = "POST";
    
    public object? Headers { get; set; } // JSON object for headers
    
    public bool IsActive { get; set; }
}