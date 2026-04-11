using System.ComponentModel.DataAnnotations;
using System.Net;

namespace FormsManagementApi.DTOs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? ResourceType { get; set; }
    public Guid? ResourceId { get; set; }
    public object? Details { get; set; } // JSON details
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? DepartmentName { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
}

public class CreateAuditLogDto
{
    [Required]
    public Guid DepartmentId { get; set; }
    
    public Guid? UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? ResourceType { get; set; }
    
    public Guid? ResourceId { get; set; }
    
    public object? Details { get; set; }
    
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
}