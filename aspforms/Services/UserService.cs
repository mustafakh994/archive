using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using Npgsql;
using System.Data;

namespace FormsManagementApi.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private bool? _isUserPermissionStoreAvailable;

    public UserService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<UserDto>>> GetUsersAsync(PaginationDto pagination, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Users
                .Include(u => u.Department)
                .Include(u => u.Role)
                .AsQueryable();

            // Filter by department if specified
            if (departmentId.HasValue)
            {
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            }

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(u => (u.Name != null && u.Name.Contains(pagination.Search)) || 
                                       u.Email.Contains(pagination.Search));
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
            await TryPopulateUserPermissionsAsync(items, userDtos);
            var pagedResult = new PagedResult<UserDto>(userDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<UserDto>>.SuccessResponse(pagedResult, "Users retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<UserDto>>.ErrorResponse($"An error occurred while retrieving users: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> GetUserByIdAsync(Guid id)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Department)
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found.");
            }

            var userDto = _mapper.Map<UserDto>(user);
            await TryPopulateUserPermissionsAsync(new[] { user }, new[] { userDto });
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

            // Validate department if specified
            if (createUserDto.DepartmentId.HasValue)
            {
                var department = await _context.Departments.FindAsync(createUserDto.DepartmentId.Value);
                if (department == null)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid department.");
                }
            }

            // Determine role - prioritize RoleId if provided, otherwise use Role name
            Guid? roleId = null;
            if (createUserDto.RoleId.HasValue)
            {
                // Validate that the role exists
                var roleExists = await _context.Roles.AnyAsync(r => r.Id == createUserDto.RoleId.Value);
                if (!roleExists)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid role ID.");
                }
                roleId = createUserDto.RoleId.Value;
            }
            else if (!string.IsNullOrEmpty(createUserDto.Role))
            {
                var role = await ResolveRoleByNameAndDepartmentAsync(createUserDto.Role, createUserDto.DepartmentId);
                if (role != null)
                {
                    roleId = role.Id;
                }
            }

            var user = new User
            {
                Name = createUserDto.Name,
                Email = createUserDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password),
                RoleId = roleId,
                DepartmentId = createUserDto.DepartmentId ?? Guid.Empty,
                IsActive = createUserDto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            await TrySyncPrimaryRoleAssignmentAsync(user);

            // Reload user with related data
            user = await _context.Users
                .Include(u => u.Department)
                .Include(u => u.Role)
                .FirstAsync(u => u.Id == user.Id);

            var userDto = _mapper.Map<UserDto>(user);
            await TryPopulateUserPermissionsAsync(new[] { user }, new[] { userDto });
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred while creating user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserDto>> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto)
    {
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found.");
            }

            // Check if new email conflicts with existing user (only if email is being updated)
            if (!string.IsNullOrEmpty(updateUserDto.Email))
            {
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == updateUserDto.Email && u.Id != id);
                if (existingUser != null)
                {
                    return ApiResponse<UserDto>.ErrorResponse("User with this email already exists.");
                }
            }

            // Validate department if specified
            if (updateUserDto.DepartmentId.HasValue)
            {
                var department = await _context.Departments.FindAsync(updateUserDto.DepartmentId.Value);
                if (department == null)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid department.");
                }
            }

            // Update role - prioritize RoleId if provided, otherwise use Role name
            if (updateUserDto.RoleId.HasValue)
            {
                // Validate that the role exists
                var roleExists = await _context.Roles.AnyAsync(r => r.Id == updateUserDto.RoleId.Value);
                if (!roleExists)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Invalid role ID.");
                }
                user.RoleId = updateUserDto.RoleId.Value;
            }
            else if (!string.IsNullOrEmpty(updateUserDto.Role))
            {
                var role = await ResolveRoleByNameAndDepartmentAsync(updateUserDto.Role, updateUserDto.DepartmentId ?? user.DepartmentId);
                user.RoleId = role?.Id;
            }

            // Update user properties (only update if provided)
            if (!string.IsNullOrEmpty(updateUserDto.Name))
                user.Name = updateUserDto.Name;
            
            if (!string.IsNullOrEmpty(updateUserDto.Email))
                user.Email = updateUserDto.Email;
            
            if (updateUserDto.DepartmentId.HasValue)
                user.DepartmentId = updateUserDto.DepartmentId.Value;
            
            if (updateUserDto.IsActive.HasValue)
                user.IsActive = updateUserDto.IsActive.Value;

            // Optional admin reset password from user edit endpoint.
            if (!string.IsNullOrWhiteSpace(updateUserDto.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updateUserDto.Password);
            
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await TrySyncPrimaryRoleAssignmentAsync(user);

            // Reload user with updated data
            user = await _context.Users
                .Include(u => u.Department)
                .Include(u => u.Role)
                .FirstAsync(u => u.Id == id);

            var userDto = _mapper.Map<UserDto>(user);
            await TryPopulateUserPermissionsAsync(new[] { user }, new[] { userDto });
            return ApiResponse<UserDto>.SuccessResponse(userDto, "User updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserDto>.ErrorResponse($"An error occurred while updating user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteUserAsync(Guid id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found.");
            }

            // Note: Form submissions are orphaned (kept in database) when user is deleted
            // The foreign key relationship allows SET NULL or CASCADE is not configured
            // Submissions remain accessible but user reference is removed
            
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "User deleted successfully. Associated submissions have been preserved.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting user: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> ToggleUserStatusAsync(Guid id)
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

    public async Task<ApiResponse<List<UserPermissionDto>>> GetUserPermissionsAsync(Guid userId)
    {
        try
        {
            if (!await IsUserPermissionStoreAvailableAsync())
            {
                return ApiResponse<List<UserPermissionDto>>.SuccessResponse(new List<UserPermissionDto>(), "User permissions table is not available in this database yet.");
            }

            var permissions = await _context.UserPermissions
                .Include(up => up.Permission)
                .Where(up => up.UserId == userId)
                .OrderBy(up => up.Permission.Name)
                .ToListAsync();

            var permissionDtos = _mapper.Map<List<UserPermissionDto>>(permissions);
            return ApiResponse<List<UserPermissionDto>>.SuccessResponse(permissionDtos, "User permissions retrieved successfully.");
        }
        catch (PostgresException ex) when (IsUserPermissionStoreUnavailable(ex))
        {
            _isUserPermissionStoreAvailable = false;
            return ApiResponse<List<UserPermissionDto>>.SuccessResponse(new List<UserPermissionDto>(), "User permissions table is not available in this database yet.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<UserPermissionDto>>.ErrorResponse($"An error occurred while retrieving user permissions: {ex.Message}");
        }
    }

    public async Task<ApiResponse<UserPermissionDto>> AddUserPermissionAsync(Guid userId, string permission)
    {
        try
        {
            if (!await IsUserPermissionStoreAvailableAsync())
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("User-specific permissions are not available in this database yet.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("User not found.");
            }

            // Resolve permission by name within the user's department (supports same Name per department)
            var permissionEntity = await _context.Permissions.FirstOrDefaultAsync(p =>
                p.Name == permission && p.DepartmentId == user.DepartmentId);
            if (permissionEntity == null)
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("Permission not found for this user's department.");
            }

            // Check if permission already exists
            var existingPermission = await _context.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.PermissionId == permissionEntity.Id);
            if (existingPermission != null)
            {
                return ApiResponse<UserPermissionDto>.ErrorResponse("User already has this permission.");
            }

            var userPermission = new UserPermission
            {
                UserId = userId,
                PermissionId = permissionEntity.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserPermissions.Add(userPermission);
            await _context.SaveChangesAsync();

            // Reload with permission data
            userPermission = await _context.UserPermissions
                .Include(up => up.Permission)
                .FirstAsync(up => up.UserId == userId && up.PermissionId == permissionEntity.Id);

            var permissionDto = _mapper.Map<UserPermissionDto>(userPermission);
            return ApiResponse<UserPermissionDto>.SuccessResponse(permissionDto, "Permission added successfully.");
        }
        catch (PostgresException ex) when (IsUserPermissionStoreUnavailable(ex))
        {
            _isUserPermissionStoreAvailable = false;
            return ApiResponse<UserPermissionDto>.ErrorResponse("User-specific permissions are not available in this database yet.");
        }
        catch (Exception ex)
        {
            return ApiResponse<UserPermissionDto>.ErrorResponse($"An error occurred while adding user permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> RemoveUserPermissionAsync(Guid userId, string permission)
    {
        try
        {
            if (!await IsUserPermissionStoreAvailableAsync())
            {
                return ApiResponse<bool>.ErrorResponse("User-specific permissions are not available in this database yet.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found.");
            }

            var permissionEntity = await _context.Permissions.FirstOrDefaultAsync(p =>
                p.Name == permission && p.DepartmentId == user.DepartmentId);
            if (permissionEntity == null)
            {
                return ApiResponse<bool>.ErrorResponse("Permission not found for this user's department.");
            }

            var userPermission = await _context.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.PermissionId == permissionEntity.Id);

            if (userPermission == null)
            {
                return ApiResponse<bool>.ErrorResponse("Permission not found for this user.");
            }

            _context.UserPermissions.Remove(userPermission);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Permission removed successfully.");
        }
        catch (PostgresException ex) when (IsUserPermissionStoreUnavailable(ex))
        {
            _isUserPermissionStoreAvailable = false;
            return ApiResponse<bool>.ErrorResponse("User-specific permissions are not available in this database yet.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while removing user permission: {ex.Message}");
        }
    }

    private async Task TryPopulateUserPermissionsAsync(IEnumerable<User> users, IEnumerable<UserDto> userDtos)
    {
        var userIds = users.Select(u => u.Id).Distinct().ToList();
        var dtoByUserId = userDtos.ToDictionary(u => u.Id);

        foreach (var dto in dtoByUserId.Values)
        {
            dto.Permissions = new List<PermissionDto>();
        }

        if (userIds.Count == 0)
        {
            return;
        }

        if (!await IsUserPermissionStoreAvailableAsync())
        {
            return;
        }

        try
        {
            var userPermissions = await _context.UserPermissions
                .Where(up => userIds.Contains(up.UserId))
                .Include(up => up.Permission)
                .AsNoTracking()
                .ToListAsync();

            foreach (var group in userPermissions.GroupBy(up => up.UserId))
            {
                if (dtoByUserId.TryGetValue(group.Key, out var dto))
                {
                    dto.Permissions = _mapper.Map<List<PermissionDto>>(group.Select(up => up.Permission).ToList());
                }
            }
        }
        catch (PostgresException ex) when (IsUserPermissionStoreUnavailable(ex))
        {
            _isUserPermissionStoreAvailable = false;
            // Some deployments still use an older schema without the EF-managed UserPermissions table.
            // In that case, user reads should still succeed and simply report no explicit per-user permissions.
        }
    }

    private async Task<bool> IsUserPermissionStoreAvailableAsync()
    {
        if (_isUserPermissionStoreAvailable.HasValue)
        {
            return _isUserPermissionStoreAvailable.Value;
        }

        try
        {
            await using var command = _context.Database.GetDbConnection().CreateCommand();
            if (command.Connection?.State != ConnectionState.Open)
            {
                await command.Connection!.OpenAsync();
            }

            command.CommandText = "SELECT to_regclass('public.\"UserPermissions\"') IS NOT NULL;";
            var result = await command.ExecuteScalarAsync();
            _isUserPermissionStoreAvailable = result is bool exists && exists;
        }
        catch
        {
            _isUserPermissionStoreAvailable = false;
        }

        return _isUserPermissionStoreAvailable.Value;
    }

    private static bool IsUserPermissionStoreUnavailable(PostgresException ex)
    {
        return ex.SqlState == PostgresErrorCodes.UndefinedTable
            || ex.SqlState == PostgresErrorCodes.UndefinedColumn;
    }

    /// <inheritdoc />
    public async Task<bool> HasUserPermissionAsync(Guid userId, string permissionName)
    {
        if (!await IsUserPermissionStoreAvailableAsync())
        {
            return false;
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return false;
        }

        return await _context.UserPermissions
            .Include(up => up.Permission)
            .AnyAsync(up =>
                up.UserId == userId &&
                up.Granted &&
                up.Permission.Name == permissionName &&
                up.Permission.DepartmentId == user.DepartmentId);
    }

    private async Task<Role?> ResolveRoleByNameAndDepartmentAsync(string roleName, Guid? departmentId)
    {
        if (departmentId.HasValue && departmentId.Value != Guid.Empty)
        {
            var exact = await _context.Roles.FirstOrDefaultAsync(r =>
                r.Name == roleName && r.DepartmentId == departmentId.Value);
            if (exact != null)
            {
                return exact;
            }
        }

        return await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
    }

    private async Task TrySyncPrimaryRoleAssignmentAsync(User user)
    {
        try
        {
            await SyncPrimaryRoleAssignmentAsync(user);
            await _context.SaveChangesAsync();
        }
        catch (PostgresException ex) when (IsAssignmentStoreUnavailable(ex))
        {
            // Some deployments still use a schema without the Assignments table.
            // In that case, preserve the legacy single-role behavior on the Users table.
        }
    }

    private async Task SyncPrimaryRoleAssignmentAsync(User user)
    {
        var activeAssignments = await _context.Assignments
            .Where(a => a.UserId == user.Id && a.IsActive)
            .ToListAsync();

        // The current user model exposes a single primary role/department,
        // so keep only one active assignment aligned with those fields.
        foreach (var assignment in activeAssignments)
        {
            var isCurrentAssignment = user.RoleId.HasValue
                && user.DepartmentId.HasValue
                && assignment.RoleId == user.RoleId.Value
                && assignment.DepartmentId == user.DepartmentId.Value;

            if (!isCurrentAssignment)
            {
                assignment.IsActive = false;
                assignment.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        if (!user.RoleId.HasValue || !user.DepartmentId.HasValue || user.DepartmentId == Guid.Empty)
        {
            return;
        }

        var currentAssignment = activeAssignments.FirstOrDefault(a =>
            a.RoleId == user.RoleId.Value && a.DepartmentId == user.DepartmentId.Value);

        if (currentAssignment != null)
        {
            if (!currentAssignment.IsActive)
            {
                currentAssignment.IsActive = true;
                currentAssignment.UpdatedAt = DateTimeOffset.UtcNow;
            }

            return;
        }

        var existingAssignment = await _context.Assignments
            .FirstOrDefaultAsync(a =>
                a.UserId == user.Id &&
                a.RoleId == user.RoleId.Value &&
                a.DepartmentId == user.DepartmentId.Value);

        if (existingAssignment != null)
        {
            existingAssignment.IsActive = true;
            existingAssignment.UpdatedAt = DateTimeOffset.UtcNow;
            return;
        }

        _context.Assignments.Add(new Assignment
        {
            UserId = user.Id,
            DepartmentId = user.DepartmentId.Value,
            RoleId = user.RoleId.Value,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
    }

    private static bool IsAssignmentStoreUnavailable(PostgresException ex)
    {
        return ex.SqlState == PostgresErrorCodes.UndefinedTable
            || ex.SqlState == PostgresErrorCodes.UndefinedColumn;
    }
}
