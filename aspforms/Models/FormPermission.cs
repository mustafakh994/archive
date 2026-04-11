using System.ComponentModel.DataAnnotations;

namespace FormsManagementApi.Models
{
    public class FormPermission
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid FormId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Permission { get; set; } = string.Empty; // read, write, admin
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public Form Form { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
