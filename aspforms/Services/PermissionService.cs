using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class PermissionService : IPermissionService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public PermissionService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<List<PermissionDto>>> GetAllPermissionsAsync()
    {
        try
        {
            var permissions = await _context.Permissions
                .Include(p => p.Department)
                .OrderBy(p => p.Name)
                .ToListAsync();

            var permissionDtos = _mapper.Map<List<PermissionDto>>(permissions);
            return ApiResponse<List<PermissionDto>>.SuccessResponse(permissionDtos, "All permissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<PermissionDto>>.ErrorResponse($"Error retrieving all permissions: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PagedResult<PermissionDto>>> GetPermissionsByDepartmentAsync(Guid departmentId, PaginationDto pagination)
    {
        try
        {
            var query = _context.Permissions
                .Where(p => p.DepartmentId == departmentId)
                .Include(p => p.Department)
                .AsQueryable();

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(p => p.Name.Contains(pagination.Search) || 
                                       (p.Description != null && p.Description.Contains(pagination.Search)));
            }

            var totalItems = await query.CountAsync();
            var permissions = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var permissionDtos = _mapper.Map<List<PermissionDto>>(permissions);
            var pagedResult = new PagedResult<PermissionDto>(permissionDtos, totalItems, pagination.Page, pagination.PageSize);
            
            return ApiResponse<PagedResult<PermissionDto>>.SuccessResponse(pagedResult, "Permissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<PermissionDto>>.ErrorResponse($"Error retrieving permissions: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PermissionDto>> GetPermissionByIdAsync(Guid id)
    {
        try
        {
            var permission = await _context.Permissions
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (permission == null)
            {
                return ApiResponse<PermissionDto>.ErrorResponse("Permission not found.");
            }

            var permissionDto = _mapper.Map<PermissionDto>(permission);
            return ApiResponse<PermissionDto>.SuccessResponse(permissionDto, "Permission retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PermissionDto>.ErrorResponse($"Error retrieving permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PermissionDto>> CreatePermissionAsync(CreatePermissionDto createDto)
    {
        try
        {
            var permission = _mapper.Map<Permission>(createDto);
            permission.CreatedAt = DateTimeOffset.UtcNow;

            _context.Permissions.Add(permission);
            await _context.SaveChangesAsync();

            // Load the created permission with its relationships
            var createdPermission = await _context.Permissions
                .Include(p => p.Department)
                .FirstAsync(p => p.Id == permission.Id);

            var permissionDto = _mapper.Map<PermissionDto>(createdPermission);
            return ApiResponse<PermissionDto>.SuccessResponse(permissionDto, "Permission created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PermissionDto>.ErrorResponse($"Error creating permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PermissionDto>> UpdatePermissionAsync(Guid id, UpdatePermissionDto updateDto)
    {
        try
        {
            var permission = await _context.Permissions.FindAsync(id);
            if (permission == null)
            {
                return ApiResponse<PermissionDto>.ErrorResponse("Permission not found.");
            }

            _mapper.Map(updateDto, permission);
            permission.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // Load the updated permission with its relationships
            var updatedPermission = await _context.Permissions
                .Include(p => p.Department)
                .FirstAsync(p => p.Id == permission.Id);

            var permissionDto = _mapper.Map<PermissionDto>(updatedPermission);
            return ApiResponse<PermissionDto>.SuccessResponse(permissionDto, "Permission updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PermissionDto>.ErrorResponse($"Error updating permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeletePermissionAsync(Guid id)
    {
        try
        {
            var permission = await _context.Permissions.FindAsync(id);
            if (permission == null)
            {
                return ApiResponse<bool>.ErrorResponse("Permission not found.");
            }

            // Check if permission is in use by any roles
            var hasRoles = await _context.RolePermissions.AnyAsync(rp => rp.PermissionId == id);
            if (hasRoles)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete permission that is assigned to roles.");
            }

            // Check if permission is in use by any user permissions
            var hasUserPermissions = await _context.UserPermissions.AnyAsync(up => up.PermissionId == id);
            if (hasUserPermissions)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete permission that is assigned to users.");
            }

            _context.Permissions.Remove(permission);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Permission deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"Error deleting permission: {ex.Message}");
        }
    }
}


