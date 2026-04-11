using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Will need SuperAdmin authorization
public class SuperAdminUsersController : ControllerBase
{
    private readonly ISuperAdminUserService _superAdminUserService;

    public SuperAdminUsersController(ISuperAdminUserService superAdminUserService)
    {
        _superAdminUserService = superAdminUserService;
    }

    /// <summary>
    /// Get all super admin users (SuperAdmin only)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<SuperAdminUserDto>>>> GetSuperAdminUsers([FromQuery] PaginationDto pagination)
    {
        var result = await _superAdminUserService.GetSuperAdminUsersAsync(pagination);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get super admin user by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SuperAdminUserDto>>> GetSuperAdminUser(Guid id)
    {
        var result = await _superAdminUserService.GetSuperAdminUserByIdAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Super admin user not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new super admin user
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<SuperAdminUserDto>>> CreateSuperAdminUser([FromBody] CreateSuperAdminUserDto createDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<SuperAdminUserDto>.Failure("Invalid input data", ModelState));
        }

        var result = await _superAdminUserService.CreateSuperAdminUserAsync(createDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetSuperAdminUser), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update a super admin user
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SuperAdminUserDto>>> UpdateSuperAdminUser(Guid id, [FromBody] UpdateSuperAdminUserDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<SuperAdminUserDto>.Failure("Invalid input data", ModelState));
        }

        var result = await _superAdminUserService.UpdateSuperAdminUserAsync(id, updateDto);
        
        if (!result.Success)
        {
            if (result.Message == "Super admin user not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete a super admin user
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSuperAdminUser(Guid id)
    {
        var result = await _superAdminUserService.DeleteSuperAdminUserAsync(id);
        
        if (!result.Success)
        {
            if (result.Message == "Super admin user not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Change super admin user password
    /// </summary>
    [HttpPost("{id:guid}/change-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword(Guid id, [FromBody] ChangeSuperAdminPasswordDto changePasswordDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<bool>.Failure("Invalid input data", ModelState));
        }

        var result = await _superAdminUserService.ChangePasswordAsync(id, changePasswordDto);
        
        if (!result.Success)
        {
            if (result.Message == "Super admin user not found")
                return NotFound(result);
            return BadRequest(result);
        }

        return Ok(result);
    }
}