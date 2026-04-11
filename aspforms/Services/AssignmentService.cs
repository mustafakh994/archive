using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using AutoMapper;

namespace FormsManagementApi.Services;

public class AssignmentService : IAssignmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AssignmentService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<AssignmentDto>> CreateAssignmentAsync(CreateAssignmentDto createDto)
    {
        try
        {
            // Check if assignment already exists
            var existingAssignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.UserId == createDto.UserId && 
                                         a.DepartmentId == createDto.DepartmentId && 
                                         a.RoleId == createDto.RoleId);

            if (existingAssignment != null)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Assignment already exists for this user, department, and role combination."
                };
            }

            // Verify that user, department, and role exist
            var userExists = await _context.Users.AnyAsync(u => u.Id == createDto.UserId);
            var departmentExists = await _context.Departments.AnyAsync(d => d.Id == createDto.DepartmentId);
            var roleExists = await _context.Roles.AnyAsync(r => r.Id == createDto.RoleId);

            if (!userExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "User not found."
                };
            }

            if (!departmentExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Department not found."
                };
            }

            if (!roleExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Role not found."
                };
            }

            var assignment = _mapper.Map<Assignment>(createDto);
            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            var assignmentDto = await GetAssignmentWithDetailsAsync(assignment.Id);
            return new ApiResponse<AssignmentDto>
            {
                Success = true,
                Data = assignmentDto,
                Message = "Assignment created successfully."
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AssignmentDto>
            {
                Success = false,
                Message = $"Error creating assignment: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<AssignmentDto>> GetAssignmentByIdAsync(Guid id)
    {
        try
        {
            var assignmentDto = await GetAssignmentWithDetailsAsync(id);
            if (assignmentDto == null)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Assignment not found."
                };
            }

            return new ApiResponse<AssignmentDto>
            {
                Success = true,
                Data = assignmentDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AssignmentDto>
            {
                Success = false,
                Message = $"Error retrieving assignment: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<List<AssignmentDto>>> GetAllAssignmentsAsync()
    {
        try
        {
            var assignments = await _context.Assignments
                .Include(a => a.User)
                .Include(a => a.Department)
                .Include(a => a.Role)
                .OrderBy(a => a.CreatedAt)
                .ToListAsync();

            var assignmentDtos = assignments.Select(a => new AssignmentDto
            {
                Id = a.Id,
                UserId = a.UserId,
                DepartmentId = a.DepartmentId,
                RoleId = a.RoleId,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UserName = a.User?.Name,
                UserEmail = a.User?.Email,
                DepartmentName = a.Department?.Name,
                RoleName = a.Role?.Name
            }).ToList();

            return new ApiResponse<List<AssignmentDto>>
            {
                Success = true,
                Data = assignmentDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AssignmentDto>>
            {
                Success = false,
                Message = $"Error retrieving assignments: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByUserIdAsync(Guid userId)
    {
        try
        {
            var assignments = await _context.Assignments
                .Include(a => a.User)
                .Include(a => a.Department)
                .Include(a => a.Role)
                .Where(a => a.UserId == userId)
                .OrderBy(a => a.CreatedAt)
                .ToListAsync();

            var assignmentDtos = assignments.Select(a => new AssignmentDto
            {
                Id = a.Id,
                UserId = a.UserId,
                DepartmentId = a.DepartmentId,
                RoleId = a.RoleId,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UserName = a.User?.Name,
                UserEmail = a.User?.Email,
                DepartmentName = a.Department?.Name,
                RoleName = a.Role?.Name
            }).ToList();

            return new ApiResponse<List<AssignmentDto>>
            {
                Success = true,
                Data = assignmentDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AssignmentDto>>
            {
                Success = false,
                Message = $"Error retrieving assignments for user: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByDepartmentIdAsync(Guid departmentId)
    {
        try
        {
            var assignments = await _context.Assignments
                .Include(a => a.User)
                .Include(a => a.Department)
                .Include(a => a.Role)
                .Where(a => a.DepartmentId == departmentId)
                .OrderBy(a => a.CreatedAt)
                .ToListAsync();

            var assignmentDtos = assignments.Select(a => new AssignmentDto
            {
                Id = a.Id,
                UserId = a.UserId,
                DepartmentId = a.DepartmentId,
                RoleId = a.RoleId,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UserName = a.User?.Name,
                UserEmail = a.User?.Email,
                DepartmentName = a.Department?.Name,
                RoleName = a.Role?.Name
            }).ToList();

            return new ApiResponse<List<AssignmentDto>>
            {
                Success = true,
                Data = assignmentDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AssignmentDto>>
            {
                Success = false,
                Message = $"Error retrieving assignments for department: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<List<AssignmentDto>>> GetAssignmentsByRoleIdAsync(Guid roleId)
    {
        try
        {
            var assignments = await _context.Assignments
                .Include(a => a.User)
                .Include(a => a.Department)
                .Include(a => a.Role)
                .Where(a => a.RoleId == roleId)
                .OrderBy(a => a.CreatedAt)
                .ToListAsync();

            var assignmentDtos = assignments.Select(a => new AssignmentDto
            {
                Id = a.Id,
                UserId = a.UserId,
                DepartmentId = a.DepartmentId,
                RoleId = a.RoleId,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UserName = a.User?.Name,
                UserEmail = a.User?.Email,
                DepartmentName = a.Department?.Name,
                RoleName = a.Role?.Name
            }).ToList();

            return new ApiResponse<List<AssignmentDto>>
            {
                Success = true,
                Data = assignmentDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AssignmentDto>>
            {
                Success = false,
                Message = $"Error retrieving assignments for role: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<AssignmentDto>> UpdateAssignmentAsync(Guid id, UpdateAssignmentDto updateDto)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Assignment not found."
                };
            }

            // Check if the new combination already exists (excluding current assignment)
            var existingAssignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id != id && 
                                         a.UserId == updateDto.UserId && 
                                         a.DepartmentId == updateDto.DepartmentId && 
                                         a.RoleId == updateDto.RoleId);

            if (existingAssignment != null)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Assignment already exists for this user, department, and role combination."
                };
            }

            // Verify that user, department, and role exist
            var userExists = await _context.Users.AnyAsync(u => u.Id == updateDto.UserId);
            var departmentExists = await _context.Departments.AnyAsync(d => d.Id == updateDto.DepartmentId);
            var roleExists = await _context.Roles.AnyAsync(r => r.Id == updateDto.RoleId);

            if (!userExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "User not found."
                };
            }

            if (!departmentExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Department not found."
                };
            }

            if (!roleExists)
            {
                return new ApiResponse<AssignmentDto>
                {
                    Success = false,
                    Message = "Role not found."
                };
            }

            assignment.UserId = updateDto.UserId;
            assignment.DepartmentId = updateDto.DepartmentId;
            assignment.RoleId = updateDto.RoleId;
            assignment.IsActive = updateDto.IsActive;
            assignment.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var assignmentDto = await GetAssignmentWithDetailsAsync(assignment.Id);
            return new ApiResponse<AssignmentDto>
            {
                Success = true,
                Data = assignmentDto,
                Message = "Assignment updated successfully."
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AssignmentDto>
            {
                Success = false,
                Message = $"Error updating assignment: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<bool>> DeleteAssignmentAsync(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Assignment not found."
                };
            }

            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>
            {
                Success = true,
                Data = true,
                Message = "Assignment deleted successfully."
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = $"Error deleting assignment: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<bool>> DeactivateAssignmentAsync(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Assignment not found."
                };
            }

            assignment.IsActive = false;
            assignment.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>
            {
                Success = true,
                Data = true,
                Message = "Assignment deactivated successfully."
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = $"Error deactivating assignment: {ex.Message}"
            };
        }
    }

    public async Task<ApiResponse<bool>> ActivateAssignmentAsync(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Assignment not found."
                };
            }

            assignment.IsActive = true;
            assignment.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>
            {
                Success = true,
                Data = true,
                Message = "Assignment activated successfully."
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = $"Error activating assignment: {ex.Message}"
            };
        }
    }

    private async Task<AssignmentDto?> GetAssignmentWithDetailsAsync(Guid id)
    {
        var assignment = await _context.Assignments
            .Include(a => a.User)
            .Include(a => a.Department)
            .Include(a => a.Role)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment == null)
            return null;

        return new AssignmentDto
        {
            Id = assignment.Id,
            UserId = assignment.UserId,
            DepartmentId = assignment.DepartmentId,
            RoleId = assignment.RoleId,
            IsActive = assignment.IsActive,
            CreatedAt = assignment.CreatedAt,
            UpdatedAt = assignment.UpdatedAt,
            UserName = assignment.User?.Name,
            UserEmail = assignment.User?.Email,
            DepartmentName = assignment.Department?.Name,
            RoleName = assignment.Role?.Name
        };
    }
}


