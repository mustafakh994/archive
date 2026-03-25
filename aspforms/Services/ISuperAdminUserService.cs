using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface ISuperAdminUserService
{
    Task<ApiResponse<PagedResult<SuperAdminUserDto>>> GetSuperAdminUsersAsync(PaginationDto pagination);
    Task<ApiResponse<SuperAdminUserDto>> GetSuperAdminUserByIdAsync(Guid id);
    Task<ApiResponse<SuperAdminUserDto>> CreateSuperAdminUserAsync(CreateSuperAdminUserDto createDto);
    Task<ApiResponse<SuperAdminUserDto>> UpdateSuperAdminUserAsync(Guid id, UpdateSuperAdminUserDto updateDto);
    Task<ApiResponse<bool>> DeleteSuperAdminUserAsync(Guid id);
    Task<ApiResponse<bool>> ChangePasswordAsync(Guid id, ChangeSuperAdminPasswordDto changePasswordDto);
    Task<ApiResponse<SuperAdminUserDto>> AuthenticateAsync(string email, string password);
}