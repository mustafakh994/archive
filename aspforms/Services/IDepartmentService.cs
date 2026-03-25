using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IDepartmentService
{
    Task<ApiResponse<PagedResult<DepartmentDto>>> GetDepartmentsAsync(PaginationDto pagination);
    Task<ApiResponse<DepartmentDto>> GetDepartmentByIdAsync(Guid id);
    Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(CreateDepartmentDto createDto);
    Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(Guid id, UpdateDepartmentDto updateDto);
    Task<ApiResponse<bool>> DeleteDepartmentAsync(Guid id);
    Task<ApiResponse<bool>> ExistsByCodeAsync(string code);
}