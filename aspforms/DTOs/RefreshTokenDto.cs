using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.DTOs;

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}