using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IRoleService
{
    Task<ApiResponse<PagedResult<RoleDto>>> GetRolesByDepartmentAsync(Guid departmentId, PaginationDto pagination);
    Task<ApiResponse<RoleDto>> GetRoleByIdAsync(Guid id);
    Task<ApiResponse<RoleDto>> CreateRoleAsync(CreateRoleDto createDto);
    Task<ApiResponse<RoleDto>> UpdateRoleAsync(Guid id, UpdateRoleDto updateDto);
    Task<ApiResponse<bool>> DeleteRoleAsync(Guid id);
    Task<ApiResponse<bool>> AssignPermissionsToRoleAsync(Guid roleId, List<Guid> permissionIds);
}