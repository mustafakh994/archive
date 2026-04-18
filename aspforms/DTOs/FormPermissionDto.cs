namespace FormsManagementApi.DTOs
{
    public class FormPermissionDto
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public Guid UserId { get; set; }
        public string Permission { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public string UserName { get; set; } = string.Empty;
        public string FormTitle { get; set; } = string.Empty;
    }

    public class CreateFormPermissionDto
    {
        public Guid FormId { get; set; }
        public Guid UserId { get; set; }
        public string Permission { get; set; } = string.Empty;
    }

    public class UpdateFormPermissionDto
    {
        public string Permission { get; set; } = string.Empty;
    }
}

