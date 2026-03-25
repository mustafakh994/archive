using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;

    public PermissionsController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    /// <summary>
    /// Get all permissions (for selection lists)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PermissionDto>>>> GetAllPermissions()
    {
        var result = await _permissionService.GetAllPermissionsAsync();
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get permissions by department
    /// </summary>
    [HttpGet("department/{departmentId:guid}")]
    public async Task<ActionResult<ApiResponse<PagedResult<PermissionDto>>>> GetPermissionsByDepartment(
        Guid departmentId, 
        [FromQuery] PaginationDto pagination)
    {
        // TODO: Implement authorization - user should have access to the department
        var result = await _permissionService.GetPermissionsByDepartmentAsync(departmentId, pagination);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get permission by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> GetPermission(Guid id)
    {
        var result = await _permissionService.GetPermissionByIdAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Permission not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new permission
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> CreatePermission([FromBody] CreatePermissionDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<PermissionDto>.Failure("Invalid input data", ModelState));
        }

        // TODO: Implement authorization - user should have permission to create permissions in the department

        var result = await _permissionService.CreatePermissionAsync(createDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetPermission), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update a permission
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> UpdatePermission(Guid id, [FromBody] UpdatePermissionDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<PermissionDto>.Failure("Invalid input data", ModelState));
        }

        var result = await _permissionService.UpdatePermissionAsync(id, updateDto);
        
        if (!result.Success)
        {
            if (result.Message == "Permission not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete a permission
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeletePermission(Guid id)
    {
        var result = await _permissionService.DeletePermissionAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Permission not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }
}