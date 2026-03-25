using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IPermissionService
{
    Task<ApiResponse<PagedResult<PermissionDto>>> GetPermissionsByDepartmentAsync(Guid departmentId, PaginationDto pagination);
    Task<ApiResponse<PermissionDto>> GetPermissionByIdAsync(Guid id);
    Task<ApiResponse<PermissionDto>> CreatePermissionAsync(CreatePermissionDto createDto);
    Task<ApiResponse<PermissionDto>> UpdatePermissionAsync(Guid id, UpdatePermissionDto updateDto);
    Task<ApiResponse<bool>> DeletePermissionAsync(Guid id);
    Task<ApiResponse<List<PermissionDto>>> GetAllPermissionsAsync();
}