using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UserService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<UserDto>>> GetUsersAsync(PaginationDto pagination, int? tenantId = null)
    {
        try
        {
            var query = _context.Users
                .Include(u => u.Tenant)
                .Include(u => u.UserPermissions)
                .AsQueryable();

            // Filter by tenant if specified
            if (tenantId.HasValue)
            {
                query = query.Where(u => u.TenantId == tenantId.Value);
            }

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(u => u.Name.Contains(pagination.Search) || 
                                       u.Email.Contains(pagination.Search) ||
                                       u.Role.Contains(pagination.Search));
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "name":
                        query = pagination.SortDescending ? query.OrderByDescending(u => u.Name) : query.OrderBy(u => u.Name);
                        break;
                    case "email":
                        query = pagination.SortDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email);
                        break;
                    case "role":
                        query = pagination.SortDescending ? query.OrderByDescending(u => u.Role) : query.OrderBy(u => u.Role);
                        break;
                    case "createdat":
                        query = pagination.SortDescending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt);
                        break;
                    case "isactive":
                        query = pagination.SortDescending ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive);
                        break;
                    default:
                        query = query.OrderByDescending(u => u.CreatedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(u => u.CreatedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var userDtos = _mapper.Map<List<UserDto>>(items);
            var pagedResult = new PagedResult<UserDto>(userDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<UserDto>>.SuccessResponse(pagedResult, "Users retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<UserDto>>.ErrorResponse($"An error occurred while retrieving users: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> GetUserByIdAsync(int id)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Tenant)
                .Include(u => u.UserPermissions)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found.");
            }

            var userDto = _mapper.Map<UserDto>(user);
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred while retrieving user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserDto createUserDto)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == createUserDto.Email);
            if (existingUser != null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User with this email already exists.");
            }

            // Validate tenant if specified
            if (createUserDto.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(createUserDto.TenantId.Value);
                if (tenant == null || !tenant.IsActive)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid or inactive tenant.");
                }
            }

            var user = _mapper.Map<User>(createUserDto);
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Add permissions if specified
            if (createUserDto.Permissions.Any())
            {
                var permissions = createUserDto.Permissions.Select(p => new UserPermission
                {
                    UserId = user.Id,
                    Permission = p,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.UserPermissions.AddRange(permissions);
                await _context.SaveChangesAsync();
            }

            // Reload user with permissions
            user = await _context.Users
                .Include(u => u.Tenant)
                .Include(u => u.UserPermissions)
                .FirstAsync(u => u.Id == user.Id);

            var userDto = _mapper.Map<UserDto>(user);
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred while creating user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> UpdateUserAsync(int id, UpdateUserDto updateUserDto)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.UserPermissions)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found.");
            }

            // Check if new email conflicts with existing user
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == updateUserDto.Email && u.Id != id);
            if (existingUser != null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User with this email already exists.");
            }

            // Validate tenant if specified
            if (updateUserDto.TenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(updateUserDto.TenantId.Value);
                if (tenant == null || !tenant.IsActive)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid or inactive tenant.");
                }
            }

            _mapper.Map(updateUserDto, user);

            // Update permissions
            var existingPermissions = user.UserPermissions.ToList();
            _context.UserPermissions.RemoveRange(existingPermissions);

            if (updateUserDto.Permissions.Any())
            {
                var newPermissions = updateUserDto.Permissions.Select(p => new UserPermission
                {
                    UserId = user.Id,
                    Permission = p,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.UserPermissions.AddRange(newPermissions);
            }

            await _context.SaveChangesAsync();

            // Reload user with updated data
            user = await _context.Users
                .Include(u => u.Tenant)
                .Include(u => u.UserPermissions)
                .FirstAsync(u => u.Id == id);

            var userDto = _mapper.Map<UserDto>(user);
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred while updating user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteUserAsync(int id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found.");
            }

            // Check if user has form submissions
            var hasSubmissions = await _context.FormSubmissions.AnyAsync(fs => fs.UserId == id);
            if (hasSubmissions)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete user with existing form submissions. Consider deactivating the user instead.");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "User deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> ToggleUserStatusAsync(int id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found.");
            }

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var status = user.IsActive ? "activated" : "deactivated";
            return ApiResponse<bool>.SuccessResponse(true, $"User {status} successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while toggling user status: {ex.Message}");
        }
    }

    public async Task<ApiResponse<List<UserPermissionDto>>> GetUserPermissionsAsync(int userId)
    {
        try
        {
            var permissions = await _context.UserPermissions
                .Where(up => up.UserId == userId)
                .OrderBy(up => up.Permission)
                .ToListAsync();

            var permissionDtos = _mapper.Map<List<UserPermissionDto>>(permissions);
            return ApiResponse<List<UserPermissionDto>>.SuccessResponse(permissionDtos, "User permissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<UserPermissionDto>>.ErrorResponse($"An error occurred while retrieving user permissions: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserPermissionDto>> AddUserPermissionAsync(int userId, string permission)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("User not found.");
            }

            // Check if permission already exists
            var existingPermission = await _context.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.Permission == permission);
            if (existingPermission != null)
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("User already has this permission.");
            }

            var userPermission = new UserPermission
            {
                UserId = userId,
                Permission = permission,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserPermissions.Add(userPermission);
            await _context.SaveChangesAsync();

            var permissionDto = _mapper.Map<UserPermissionDto>(userPermission);
            return ApiResponse<UserPermissionDto>.SuccessResponse(permissionDto, "Permission added successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserPermissionDto>.ErrorResponse($"An error occurred while adding user permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> RemoveUserPermissionAsync(int userId, string permission)
    {
        try
        {
            var userPermission = await _context.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.Permission == permission);

            if (userPermission == null)
            {
                return ApiResponse<bool>.ErrorResponse("Permission not found for this user.");
            }

            _context.UserPermissions.Remove(userPermission);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Permission removed successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while removing user permission: {ex.Message}");
        }
    }
}