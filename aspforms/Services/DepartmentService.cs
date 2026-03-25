using AutoMapper;
using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using System;
using System.Linq;

namespace FormsManagementApi.Services;

public class DepartmentService : IDepartmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public DepartmentService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<DepartmentDto>>> GetDepartmentsAsync(PaginationDto pagination)
    {
        try
        {
            var query = _context.Departments.AsQueryable();

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(d => d.Name.Contains(pagination.Search) || (d.Code != null && d.Code.Contains(pagination.Search)));
            }

            var totalItems = await query.CountAsync();
            var departments = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var departmentDtos = _mapper.Map<List<DepartmentDto>>(departments);
            var pagedResult = new PagedResult<DepartmentDto>(departmentDtos, totalItems, pagination.Page, pagination.PageSize);
            
            return ApiResponse<PagedResult<DepartmentDto>>.SuccessResponse(pagedResult, "Departments retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<DepartmentDto>>.ErrorResponse($"Error retrieving departments: {ex.Message}");
        }
    }

    public async Task<ApiResponse<DepartmentDto>> GetDepartmentByIdAsync(Guid id)
    {
        try
        {
            var department = await _context.Departments
                .FirstOrDefaultAsync(d => d.Id == id);

            if (department == null)
            {
                return ApiResponse<DepartmentDto>.ErrorResponse("Department not found.");
            }

            var departmentDto = _mapper.Map<DepartmentDto>(department);
            return ApiResponse<DepartmentDto>.SuccessResponse(departmentDto, "Department retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<DepartmentDto>.ErrorResponse($"Error retrieving department: {ex.Message}");
        }
    }

    public async Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(CreateDepartmentDto createDto)
    {
        try
        {
            var department = _mapper.Map<Department>(createDto);
            department.CreatedAt = DateTimeOffset.UtcNow;

            _context.Departments.Add(department);
            await _context.SaveChangesAsync();

            var departmentDto = _mapper.Map<DepartmentDto>(department);
            return ApiResponse<DepartmentDto>.SuccessResponse(departmentDto, "Department created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<DepartmentDto>.ErrorResponse($"Error creating department: {ex.Message}");
        }
    }

    public async Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(Guid id, UpdateDepartmentDto updateDto)
    {
        try
        {
            var department = await _context.Departments.FindAsync(id);
            if (department == null)
            {
                return ApiResponse<DepartmentDto>.ErrorResponse("Department not found.");
            }

            _mapper.Map(updateDto, department);
            department.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var departmentDto = _mapper.Map<DepartmentDto>(department);
            return ApiResponse<DepartmentDto>.SuccessResponse(departmentDto, "Department updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<DepartmentDto>.ErrorResponse($"Error updating department: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteDepartmentAsync(Guid id)
    {
        try
        {
            var department = await _context.Departments
                .Include(d => d.Users)
                    .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(d => d.Id == id);
            if (department == null)
            {
                return ApiResponse<bool>.ErrorResponse("Department not found.");
            }

            // Preserve any users that have the SuperAdmin role by detaching them from the department
            var superAdminUsers = department.Users?
                .Where(u => u.Role != null && string.Equals(u.Role.Name, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
                .ToList() ?? new List<User>();

            if (superAdminUsers.Count > 0)
            {
                foreach (var user in superAdminUsers)
                {
                    user.DepartmentId = null;
                    user.Department = null;
                }

                _context.Users.UpdateRange(superAdminUsers);
            }

            _context.Departments.Remove(department);
            await _context.SaveChangesAsync();

            var message = "Department deleted successfully.";
            if (superAdminUsers.Count > 0)
            {
                message += $" {superAdminUsers.Count} SuperAdmin user(s) were retained.";
            }

            return ApiResponse<bool>.SuccessResponse(true, message);
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"Error deleting department: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> ExistsByCodeAsync(string code)
    {
        try
        {
            var exists = await _context.Departments.AnyAsync(d => d.Code == code);
            return ApiResponse<bool>.SuccessResponse(exists, "Code existence check completed.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"Error checking department code: {ex.Message}");
        }
    }
}