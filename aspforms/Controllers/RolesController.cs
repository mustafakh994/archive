using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    /// <summary>
    /// Get roles by department
    /// </summary>
    [HttpGet("department/{departmentId:guid}")]
    public async Task<ActionResult<ApiResponse<PagedResult<RoleDto>>>> GetRolesByDepartment(
        Guid departmentId, 
        [FromQuery] PaginationDto pagination)
    {
        // TODO: Implement authorization - user should have access to the department
        var result = await _roleService.GetRolesByDepartmentAsync(departmentId, pagination);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get role by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> GetRole(Guid id)
    {
        var result = await _roleService.GetRoleByIdAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Role not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new role
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoleDto>>> CreateRole([FromBody] CreateRoleDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<RoleDto>.Failure("Invalid input data", ModelState));
        }

        // TODO: Implement authorization - user should have permission to create roles in the department

        var result = await _roleService.CreateRoleAsync(createDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetRole), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update a role
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> UpdateRole(Guid id, [FromBody] UpdateRoleDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<RoleDto>.Failure("Invalid input data", ModelState));
        }

        var result = await _roleService.UpdateRoleAsync(id, updateDto);
        
        if (!result.Success)
        {
            if (result.Message == "Role not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete a role
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(Guid id)
    {
        var result = await _roleService.DeleteRoleAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Role not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Assign permissions to a role
    /// </summary>
    [HttpPost("{id:guid}/permissions")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignPermissions(Guid id, [FromBody] List<Guid> permissionIds)
    {
        var result = await _roleService.AssignPermissionsToRoleAsync(id, permissionIds);
        
        if (!result.Success)
        {
            if (result.Message == "Role not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }
}