using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Get all users with optional department filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<UserDto>>>> GetUsers([FromQuery] PaginationDto pagination)
    {
        Guid? departmentId = null;
        
        // SuperAdmin can see all users, others can only see users from their department
        if (!HttpContext.IsSuperAdmin())
        {
            departmentId = HttpContext.GetDepartmentId();
            if (!departmentId.HasValue)
            {
                return Forbid("You must be associated with a department to view users.");
            }
        }

        var result = await _userService.GetUsersAsync(pagination, departmentId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get user by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUser(Guid id)
    {
        var result = await _userService.GetUserByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        // Check authorization - users can only view users from their department (except SuperAdmin)
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (result.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only access users from your department.");
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new user (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserDto createUserDto)
    {
        // TenantAdmin can only create users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (createUserDto.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only create users in your own department.");
            }
        }

        var result = await _userService.CreateUserAsync(createUserDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetUser), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update user (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(Guid id, [FromBody] UpdateUserDto updateUserDto)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(id);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only update users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only update users in your own department.");
            }
        }

        var result = await _userService.UpdateUserAsync(id, updateUserDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete user (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(Guid id)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(id);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only delete users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only delete users in your own department.");
            }
        }

        var result = await _userService.DeleteUserAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Toggle user active status (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleUserStatus(Guid id)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(id);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only toggle users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only manage users in your own department.");
            }
        }

        var result = await _userService.ToggleUserStatusAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get user permissions (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpGet("{userId}/permissions")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<List<UserPermissionDto>>>> GetUserPermissions(Guid userId)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(userId);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only view permissions for users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only view permissions for users in your own department.");
            }
        }

        var result = await _userService.GetUserPermissionsAsync(userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Add user permission (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpPost("{userId}/permissions")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<UserPermissionDto>>> AddUserPermission(Guid userId, [FromBody] string permission)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(userId);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only manage permissions for users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only manage permissions for users in your own department.");
            }
        }

        var result = await _userService.AddUserPermissionAsync(userId, permission);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetUserPermissions), new { userId }, result);
    }

    /// <summary>
    /// Remove user permission (SuperAdmin or TenantAdmin)
    /// </summary>
    [HttpDelete("{userId}/permissions/{permission}")]
    [Authorize(Roles = "SuperAdmin,TenantAdmin,Superadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveUserPermission(Guid userId, string permission)
    {
        // Get current user info to check authorization
        var currentUserResult = await _userService.GetUserByIdAsync(userId);
        if (!currentUserResult.Success)
        {
            return NotFound(currentUserResult);
        }

        // TenantAdmin can only manage permissions for users in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentUserResult.Data!.DepartmentId != userDepartmentId)
            {
                return Forbid("You can only manage permissions for users in your own department.");
            }
        }

        var result = await _userService.RemoveUserPermissionAsync(userId, permission);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}