using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Superadmin")]
public class AssignmentController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;

    public AssignmentController(IAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    /// <summary>
    /// Create a new assignment (SuperAdmin only)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<AssignmentDto>>> CreateAssignment([FromBody] CreateAssignmentDto createDto)
    {
        var result = await _assignmentService.CreateAssignmentAsync(createDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetAssignment), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Get assignment by ID (SuperAdmin only)
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<AssignmentDto>>> GetAssignment(Guid id)
    {
        var result = await _assignmentService.GetAssignmentByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get all assignments (SuperAdmin only)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<AssignmentDto>>>> GetAllAssignments()
    {
        var result = await _assignmentService.GetAllAssignmentsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Get assignments by user ID (SuperAdmin only)
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<ApiResponse<List<AssignmentDto>>>> GetAssignmentsByUser(Guid userId)
    {
        var result = await _assignmentService.GetAssignmentsByUserIdAsync(userId);
        return Ok(result);
    }

    /// <summary>
    /// Get assignments by department ID (SuperAdmin only)
    /// </summary>
    [HttpGet("department/{departmentId}")]
    public async Task<ActionResult<ApiResponse<List<AssignmentDto>>>> GetAssignmentsByDepartment(Guid departmentId)
    {
        var result = await _assignmentService.GetAssignmentsByDepartmentIdAsync(departmentId);
        return Ok(result);
    }

    /// <summary>
    /// Get assignments by role ID (SuperAdmin only)
    /// </summary>
    [HttpGet("role/{roleId}")]
    public async Task<ActionResult<ApiResponse<List<AssignmentDto>>>> GetAssignmentsByRole(Guid roleId)
    {
        var result = await _assignmentService.GetAssignmentsByRoleIdAsync(roleId);
        return Ok(result);
    }

    /// <summary>
    /// Update an assignment (SuperAdmin only)
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<AssignmentDto>>> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentDto updateDto)
    {
        var result = await _assignmentService.UpdateAssignmentAsync(id, updateDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete an assignment (SuperAdmin only)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAssignment(Guid id)
    {
        var result = await _assignmentService.DeleteAssignmentAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Deactivate an assignment (SuperAdmin only)
    /// </summary>
    [HttpPatch("{id}/deactivate")]
    public async Task<ActionResult<ApiResponse<bool>>> DeactivateAssignment(Guid id)
    {
        var result = await _assignmentService.DeactivateAssignmentAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Activate an assignment (SuperAdmin only)
    /// </summary>
    [HttpPatch("{id}/activate")]
    public async Task<ActionResult<ApiResponse<bool>>> ActivateAssignment(Guid id)
    {
        var result = await _assignmentService.ActivateAssignmentAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
