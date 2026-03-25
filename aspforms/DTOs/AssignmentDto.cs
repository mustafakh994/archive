namespace FormsManagementApi.DTOs;

public class AssignmentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid RoleId { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Navigation properties for display
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? DepartmentName { get; set; }
    public string? RoleName { get; set; }
}

public class CreateAssignmentDto
{
    public Guid UserId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid RoleId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateAssignmentDto
{
    public Guid UserId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid RoleId { get; set; }
    public bool IsActive { get; set; }
}


