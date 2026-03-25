using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class UsageMetricDto
{
    public Guid Id { get; set; }
    public Guid DepartmentId { get; set; }
    public string MetricType { get; set; } = string.Empty;
    public int? Value { get; set; }
    public object? Details { get; set; } // JSON details
    public DateTimeOffset RecordedAt { get; set; }
    public string? DepartmentName { get; set; }
}

public class CreateUsageMetricDto
{
    [Required]
    public Guid DepartmentId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string MetricType { get; set; } = string.Empty;
    
    public int? Value { get; set; }
    
    public object? Details { get; set; }
}