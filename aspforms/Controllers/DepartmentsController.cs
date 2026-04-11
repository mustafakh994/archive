using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentsController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    /// <summary>
    /// Get all departments (SuperAdmin only)
    /// </summary>
    [HttpGet]
    [Authorize] // Will need to implement SuperAdmin check
    public async Task<ActionResult<ApiResponse<PagedResult<DepartmentDto>>>> GetDepartments([FromQuery] PaginationDto pagination)
    {
        var result = await _departmentService.GetDepartmentsAsync(pagination);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get department by ID (SuperAdmin or department members)
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> GetDepartment(Guid id)
    {
        // TODO: Implement authorization checks for department access
        var result = await _departmentService.GetDepartmentByIdAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Department not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new department (SuperAdmin only)
    /// </summary>
    [HttpPost]
    [Authorize] // Will need to implement SuperAdmin check
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> CreateDepartment([FromBody] CreateDepartmentDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<DepartmentDto>.Failure("Invalid input data", ModelState));
        }

        // Check if department code already exists
        if (!string.IsNullOrEmpty(createDto.Code))
        {
            var existsResult = await _departmentService.ExistsByCodeAsync(createDto.Code);
            if (existsResult.Success && existsResult.Data)
            {
                return BadRequest(ApiResponse<DepartmentDto>.Failure("A department with this code already exists"));
            }
        }

        var result = await _departmentService.CreateDepartmentAsync(createDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetDepartment), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update a department (SuperAdmin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize] // Will need to implement SuperAdmin check
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> UpdateDepartment(Guid id, [FromBody] UpdateDepartmentDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<DepartmentDto>.Failure("Invalid input data", ModelState));
        }

        var result = await _departmentService.UpdateDepartmentAsync(id, updateDto);
        
        if (!result.Success)
        {
            if (result.Message == "Department not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete a department (SuperAdmin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize] // Will need to implement SuperAdmin check
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDepartment(Guid id)
    {
        var result = await _departmentService.DeleteDepartmentAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Department not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }
}