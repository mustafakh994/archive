namespace FormsManagementApi.DTOs;

public class AdvancedSearchDto : PaginationDto
{
    public Guid? FormId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public Dictionary<string, string>? DynamicFilters { get; set; }
    // The base PaginationDto Search property will be used for JSONB dynamic text search
}
