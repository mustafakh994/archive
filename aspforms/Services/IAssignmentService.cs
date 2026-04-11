using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IAssignmentService
{
    Task<ApiResponse<AssignmentDto>> CreateAssignmentAsync(CreateAssignmentDto createDto);
    Task<ApiResponse<AssignmentDto>> GetAssignmentByIdAsync(Guid id);
    Task<ApiResponse<List<AssignmentDto>>> GetAllAssignmentsAsync();
    Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByUserIdAsync(Guid userId);
    Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByDepartmentIdAsync(Guid departmentId);
    Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByRoleIdAsync(Guid roleId);
    Task<ApiResponse<AssignmentDto>> UpdateAssignmentAsync(Guid id, UpdateAssignmentDto updateDto);
    Task<ApiResponse<bool>> DeleteAssignmentAsync(Guid id);
    Task<ApiResponse<bool>> DeactivateAssignmentAsync(Guid id);
    Task<ApiResponse<bool>> ActivateAssignmentAsync(Guid id);
}


