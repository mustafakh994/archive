using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IUserService
{
    Task<ApiResponse<PagedResult<UserDto>>> GetUsersAsync(PaginationDto pagination, Guid? departmentId = null);
    Task<ApiResponse<UserDto>> GetUserByIdAsync(Guid id);
    Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserDto createUserDto);
    Task<ApiResponse<UserDto>> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto);
    Task<ApiResponse<bool>> DeleteUserAsync(Guid id);
    Task<ApiResponse<bool>> ToggleUserStatusAsync(Guid id);
    Task<ApiResponse<List<UserPermissionDto>>> GetUserPermissionsAsync(Guid userId);
    Task<ApiResponse<UserPermissionDto>> AddUserPermissionAsync(Guid userId, string permission);
    Task<ApiResponse<bool>> RemoveUserPermissionAsync(Guid userId, string permission);
}