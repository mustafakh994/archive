using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class RoleService : IRoleService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public RoleService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<RoleDto>>> GetRolesByDepartmentAsync(Guid departmentId, PaginationDto pagination)
    {
        try
        {
            var query = _context.Roles
                .Where(r => r.DepartmentId == departmentId)
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .AsQueryable();

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(r => r.Name.Contains(pagination.Search) || 
                                       (r.Description != null && r.Description.Contains(pagination.Search)));
            }

            var totalItems = await query.CountAsync();
            var roles = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var roleDtos = _mapper.Map<List<RoleDto>>(roles);
            var pagedResult = new PagedResult<RoleDto>(roleDtos, totalItems, pagination.Page, pagination.PageSize);
            
            return ApiResponse<PagedResult<RoleDto>>.SuccessResponse(pagedResult, "Roles retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<RoleDto>>.ErrorResponse($"Error retrieving roles: {ex.Message}");
        }
    }

    public async Task<ApiResponse<RoleDto>> GetRoleByIdAsync(Guid id)
    {
        try
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .Include(r => r.Department)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (role == null)
            {
                return ApiResponse<RoleDto>.ErrorResponse("Role not found.");
            }

            var roleDto = _mapper.Map<RoleDto>(role);
            return ApiResponse<RoleDto>.SuccessResponse(roleDto, "Role retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<RoleDto>.ErrorResponse($"Error retrieving role: {ex.Message}");
        }
    }

    public async Task<ApiResponse<RoleDto>> CreateRoleAsync(CreateRoleDto createDto)
    {
        try
        {
            var role = _mapper.Map<Role>(createDto);
            role.CreatedAt = DateTimeOffset.UtcNow;

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            // Load the created role with its relationships
            var createdRole = await _context.Roles
                .Include(r => r.Department)
                .FirstAsync(r => r.Id == role.Id);

            var roleDto = _mapper.Map<RoleDto>(createdRole);
            return ApiResponse<RoleDto>.SuccessResponse(roleDto, "Role created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<RoleDto>.ErrorResponse($"Error creating role: {ex.Message}");
        }
    }

    public async Task<ApiResponse<RoleDto>> UpdateRoleAsync(Guid id, UpdateRoleDto updateDto)
    {
        try
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null)
            {
                return ApiResponse<RoleDto>.ErrorResponse("Role not found.");
            }

            _mapper.Map(updateDto, role);
            role.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // Load the updated role with its relationships
            var updatedRole = await _context.Roles
                .Include(r => r.Department)
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstAsync(r => r.Id == role.Id);

            var roleDto = _mapper.Map<RoleDto>(updatedRole);
            return ApiResponse<RoleDto>.SuccessResponse(roleDto, "Role updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<RoleDto>.ErrorResponse($"Error updating role: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteRoleAsync(Guid id)
    {
        try
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null)
            {
                return ApiResponse<bool>.ErrorResponse("Role not found.");
            }

            // Check if role is in use by any users
            var hasUsers = await _context.Users.AnyAsync(u => u.RoleId == id);
            if (hasUsers)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete role that is assigned to users.");
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Role deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"Error deleting role: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> AssignPermissionsToRoleAsync(Guid roleId, List<Guid> permissionIds)
    {
        try
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Id == roleId);

            if (role == null)
            {
                return ApiResponse<bool>.ErrorResponse("Role not found.");
            }

            // Remove existing permissions
            _context.RolePermissions.RemoveRange(role.RolePermissions);

            // Add new permissions
            foreach (var permissionId in permissionIds)
            {
                var permission = await _context.Permissions.FindAsync(permissionId);
                if (permission != null)
                {
                    role.RolePermissions.Add(new RolePermission
                    {
                        RoleId = roleId,
                        PermissionId = permissionId,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            return ApiResponse<bool>.SuccessResponse(true, "Permissions assigned to role successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"Error assigning permissions to role: {ex.Message}");
        }
    }
}


