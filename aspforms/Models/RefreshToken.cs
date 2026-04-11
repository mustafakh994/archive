using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.Models;

public class RefreshToken
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    public Guid UserId { get; set; }
    
    public User User { get; set; } = null!;
    
    [Required]
    public DateTimeOffset ExpiresAt { get; set; }
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; }
    
    public DateTimeOffset? RevokedAt { get; set; }
    
    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt;
    
    public bool IsRevoked => RevokedAt.HasValue;
    
    public bool IsActive => !IsExpired && !IsRevoked;
}