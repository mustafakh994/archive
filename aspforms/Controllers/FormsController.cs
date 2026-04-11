using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FormsController : ControllerBase
{
    private readonly IFormService _formService;

    public FormsController(IFormService formService)
    {
        _formService = formService;
    }

    /// <summary>
    /// Get all forms with optional department filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<FormDto>>>> GetForms([FromQuery] PaginationDto pagination)
    {
        Guid? departmentId = null;
        
        // SuperAdmin can see all forms, others can only see forms from their department
        if (!HttpContext.IsSuperAdmin())
        {
            departmentId = HttpContext.GetDepartmentId();
            if (!departmentId.HasValue)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<PagedResult<FormDto>>.ErrorResponse("You must be associated with a department to view forms."));
            }
        }

        var result = await _formService.GetFormsAsync(pagination, departmentId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<FormDto>>> GetForm(Guid id)
    {
        var result = await _formService.GetFormByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        // Check authorization - users can only view forms from their department (except SuperAdmin)
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (result.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You can only access forms from your department."));
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Get the latest version of a form
    /// </summary>
    [HttpGet("{formId}/latest")]
    public async Task<ActionResult<ApiResponse<FormDto>>> GetLatestForm(Guid formId)
    {
        var result = await _formService.GetFormByIdAsync(formId);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        // Check authorization - users can only view forms from their department (except SuperAdmin)
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (result.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You can only access forms from your department."));
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form preview for archiving - any authenticated user can access regardless of department
    /// </summary>
    [HttpGet("{formId}/preview")]
    public async Task<ActionResult<ApiResponse<FormDto>>> GetFormPreview(Guid formId)
    {
        try
        {
            var result = await _formService.GetFormByIdAsync(formId);
            
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<FormDto> { 
                Success = false, 
                Message = "Internal server error while fetching form preview", 
                Errors = new List<string> { ex.Message } 
            });
        }
    }

    /// <summary>
    /// Create a new form using the new request format
    /// </summary>
    [HttpPost("create")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<FormDto>>> CreateForm([FromBody] CreateFormRequestDto createFormRequestDto)
    {
        // Validate department access
        if (!HttpContext.IsSuperAdmin())
        {
            // Non-SuperAdmin users can only create forms in their own department
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (!userDepartmentId.HasValue)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You must be associated with a department to create forms."));
            }
            
            if (!Guid.TryParse(createFormRequestDto.DepartmentId, out Guid requestedDeptId) || 
                requestedDeptId != userDepartmentId.Value)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You can only create forms in your own department."));
            }
        }
        else
        {
            // SuperAdmin must provide a valid department ID
            if (string.IsNullOrEmpty(createFormRequestDto.DepartmentId) || 
                !Guid.TryParse(createFormRequestDto.DepartmentId, out _))
            {
                return BadRequest("SuperAdmin must specify a valid department ID when creating forms.");
            }
        }

        var createdBy = HttpContext.GetUserId();
        var result = await _formService.CreateFormFromRequestAsync(createFormRequestDto, createdBy);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetForm), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Create a new form using the legacy format
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<FormDto>>> CreateFormLegacy([FromBody] CreateFormDto createFormDto)
    {
        Guid departmentId;
        
        // SuperAdmin can specify any department, others use their own department
        if (HttpContext.IsSuperAdmin())
        {
            // SuperAdmin can use the departmentId from the request
            if (createFormDto.DepartmentId == Guid.Empty)
            {
                return BadRequest("SuperAdmin must specify a valid department ID when creating forms.");
            }
            departmentId = createFormDto.DepartmentId;
        }
        else
        {
            // Non-SuperAdmin users must use their own department
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (!userDepartmentId.HasValue)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You must be associated with a department to create forms."));
            }
            
            // Ensure non-SuperAdmin users can only create forms in their own department
            if (createFormDto.DepartmentId != userDepartmentId.Value)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You can only create forms in your own department."));
            }
            
            departmentId = userDepartmentId.Value;
        }

        var createdBy = HttpContext.GetUserId();
        var result = await _formService.CreateFormAsync(createFormDto, departmentId, createdBy);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetForm), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update form (DepartmentAdmin or users with update permission)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<FormDto>>> UpdateForm(Guid id, [FromBody] UpdateFormDto updateFormDto)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(id);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only update forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormDto>.ErrorResponse("You can only update forms in your own department."));
            }
        }

        var result = await _formService.UpdateFormAsync(id, updateFormDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete form (DepartmentAdmin or users with delete permission)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteForm(Guid id)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(id);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only delete forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.ErrorResponse("You can only delete forms in your own department."));
            }
        }

        var result = await _formService.DeleteFormAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Toggle form active status (DepartmentAdmin)
    /// Returns the current status after toggle
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<string>>> ToggleFormStatus(Guid id)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(id);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only toggle forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<string>.ErrorResponse("You can only manage forms in your own department."));
            }
        }

        var result = await _formService.ToggleFormStatusAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form submissions
    /// </summary>
    [HttpGet("{formId}/submissions")]
    public async Task<ActionResult<ApiResponse<PagedResult<FormSubmissionDto>>>> GetFormSubmissions(Guid formId, [FromQuery] PaginationDto pagination)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(formId);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // Users can only view submissions from forms in their department (except SuperAdmin)
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse("You can only view submissions from forms in your department."));
            }
        }

        var result = await _formService.GetFormSubmissionsAsync(formId, pagination);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form submission by ID
    /// </summary>
    [HttpGet("submissions/{submissionId}")]
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> GetFormSubmission(Guid submissionId)
    {
        var result = await _formService.GetFormSubmissionByIdAsync(submissionId);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        // Check authorization through form's department
        var formResult = await _formService.GetFormByIdAsync(result.Data!.FormId);
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (formResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormSubmissionDto>.ErrorResponse("You can only view submissions from forms in your department."));
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Create form submission (public endpoint for form filling)
    /// </summary>
    [HttpPost("{formId}/submissions")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmission(Guid formId, [FromBody] CreateFormSubmissionDto createSubmissionDto)
    {
        // Get user ID if authenticated
        Guid? userId = null;
        if (HttpContext.User.Identity?.IsAuthenticated == true)
        {
            userId = HttpContext.GetUserId();
        }

        // Set IP address
        createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _formService.CreateFormSubmissionAsync(formId, createSubmissionDto, userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetFormSubmission), new { submissionId = result.Data!.Id }, result);
    }

    /// <summary>
    /// Create form submission with Cloudflare R2 file URLs (public endpoint for form filling with files)
    /// Files are uploaded to R2 by frontend, URLs are included in responseData
    /// </summary>
    [HttpPost("{formId}/submissions/with-files")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmissionWithFiles(Guid formId, [FromBody] CreateFormSubmissionWithFilesDto createSubmissionDto)
    {
        try
        {
            // Get user ID if authenticated
            Guid? userId = null;
            if (HttpContext.User.Identity?.IsAuthenticated == true)
            {
                userId = HttpContext.GetUserId();
            }

            // Set IP address
            createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            var result = await _formService.CreateFormSubmissionWithFilesAsync(formId, createSubmissionDto, userId);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetFormSubmission), new { submissionId = result.Data!.Id }, result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission: {ex.Message}"));
        }
    }

    /// <summary>
    /// Delete form submission (DepartmentAdmin)
    /// </summary>
    [HttpDelete("submissions/{submissionId}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFormSubmission(Guid submissionId)
    {
        // Get submission to check authorization
        var submissionResult = await _formService.GetFormSubmissionByIdAsync(submissionId);
        if (!submissionResult.Success)
        {
            return NotFound(submissionResult);
        }

        // Check authorization through form's department
        var formResult = await _formService.GetFormByIdAsync(submissionResult.Data!.FormId);
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (formResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.ErrorResponse("You can only delete submissions from forms in your department."));
            }
        }

        var result = await _formService.DeleteFormSubmissionAsync(submissionId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form permissions
    /// </summary>
    [HttpGet("{formId}/permissions")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<List<FormPermissionDto>>>> GetFormPermissions(Guid formId)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(formId);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only view permissions for forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<FormPermissionDto>>.ErrorResponse("You can only view permissions for forms in your own department."));
            }
        }

        var result = await _formService.GetFormPermissionsAsync(formId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Add form permission
    /// </summary>
    [HttpPost("{formId}/permissions")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<FormPermissionDto>>> AddFormPermission(Guid formId, [FromBody] CreateFormPermissionDto createPermissionDto)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(formId);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only manage permissions for forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<FormPermissionDto>.ErrorResponse("You can only manage permissions for forms in your own department."));
            }
        }

        var result = await _formService.AddFormPermissionAsync(formId, createPermissionDto);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetFormPermissions), new { formId }, result);
    }

    /// <summary>
    /// Remove form permission
    /// </summary>
    [HttpDelete("{formId}/permissions/{userId}/{permission}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveFormPermission(Guid formId, Guid userId, string permission)
    {
        // Get current form info to check authorization
        var currentFormResult = await _formService.GetFormByIdAsync(formId);
        if (!currentFormResult.Success)
        {
            return NotFound(currentFormResult);
        }

        // DepartmentAdmin can only manage permissions for forms in their own department
        if (!HttpContext.IsSuperAdmin())
        {
            var userDepartmentId = HttpContext.GetDepartmentId();
            if (currentFormResult.Data!.DepartmentId != userDepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.ErrorResponse("You can only manage permissions for forms in your own department."));
            }
        }

        var result = await _formService.RemoveFormPermissionAsync(formId, userId, permission);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form for authenticated users - internal archiving system
    /// Accepts either a GUID ID or form code
    /// Only returns basic form information needed for display and submission
    /// </summary>
    [HttpGet("{idOrCode}/preview")]
    public async Task<ActionResult<ApiResponse<FormPreviewDto>>> GetFormPreview(string idOrCode)
    {
        var result = await _formService.GetFormPreviewAsync(idOrCode);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get form preview by code (public access)
    /// Allows accessing forms by their code instead of ID for better UX
    /// </summary>
    [HttpGet("code/{code}/preview")]
    
    public async Task<ActionResult<ApiResponse<FormPreviewDto>>> GetFormPreviewByCode(string code)
    {
        var result = await _formService.GetFormPreviewByCodeAsync(code);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
