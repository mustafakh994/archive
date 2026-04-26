using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using FormsManagementApi.DTOs;
using FormsManagementApi.Services;
using FormsManagementApi.Middleware;

namespace FormsManagementApi.Controllers;

/// <summary>
/// Controller for managing form submissions with support for multiple form schema versions.
/// Provides endpoints for CRUD operations, version-specific submissions, schema validation, and analytics.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FormSubmissionsController : ControllerBase
{
    private readonly IFormSubmissionService _formSubmissionService;

    /// <summary>
    /// Initializes a new instance of the FormSubmissionsController.
    /// </summary>
    /// <param name="formSubmissionService">The form submission service for business logic.</param>
    public FormSubmissionsController(IFormSubmissionService formSubmissionService)
    {
        _formSubmissionService = formSubmissionService;
    }

    /// <summary>
    /// For users who are not SuperAdmin / DepartmentAdmin: restrict listings to forms where they have
    /// <c>search_inquiry</c> / read / write / admin (all submissions) or <c>archivist</c> (own submissions only).
    /// </summary>
    private async Task<SubmissionQueryContext?> ResolveSubmissionAccessAsync()
    {
        if (HttpContext.IsSuperAdmin() || HttpContext.IsDepartmentAdmin())
            return null;

        var deptId = HttpContext.GetDepartmentId();
        var userId = HttpContext.GetUserId();
        if (!deptId.HasValue || !userId.HasValue)
        {
            return new SubmissionQueryContext
            {
                UserId = Guid.Empty,
                UserEmail = null,
                FullAccessFormIds = new HashSet<Guid>(),
                OwnSubmissionsOnlyFormIds = new HashSet<Guid>()
            };
        }

        var email = HttpContext.User.FindFirst(ClaimTypes.Email)?.Value;
        return await _formSubmissionService.BuildRestrictedSubmissionContextAsync(userId.Value, deptId.Value, email);
    }

    /// <summary>
    /// Retrieves all form submissions across all forms with department-based filtering.
    /// SuperAdmin can see all submissions, other users can only see submissions from their department.
    /// Supports search functionality and sorting by submission date, form name, or submitter email.
    /// Optionally filter by specific form ID.
    /// </summary>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <param name="formId">Optional form ID to filter submissions for a specific form.</param>
    /// <returns>A paginated result of all form submissions the user has access to.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<FormSubmissionDto>>>> GetAllSubmissions(
        [FromQuery] PaginationDto pagination,
        [FromQuery] Guid? formId = null)
    {
        Guid? departmentId = null;
        
        // SuperAdmin can see all submissions, others can only see submissions from their department
        if (!HttpContext.IsSuperAdmin())
        {
            departmentId = HttpContext.GetDepartmentId();
            if (!departmentId.HasValue)
            {
                return Forbid("You must be associated with a department to view submissions.");
            }
        }

        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetAllSubmissionsAsync(pagination, departmentId, formId, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Performs an advanced search on form submissions using multiple filters.
    /// Supports filtering by FormTemplate, Department, Date Range, and Dynamic Text inside JSON Data.
    /// </summary>
    /// <param name="searchDto">The advanced search parameters.</param>
    /// <returns>A paginated result of matching form submissions.</returns>
    [HttpPost("advanced-search")]
    public async Task<ActionResult<ApiResponse<PagedResult<FormSubmissionDto>>>> AdvancedSearch(
        [FromBody] AdvancedSearchDto searchDto)
    {
        Guid? departmentId = null;
        
        // SuperAdmin can search across all departments, others are restricted to their own
        if (!HttpContext.IsSuperAdmin())
        {
            departmentId = HttpContext.GetDepartmentId();
            if (!departmentId.HasValue)
            {
                return Forbid("You must be associated with a department to perform a search.");
            }
        }

        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.AdvancedSearchAsync(searchDto, departmentId, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves a paginated list of form submissions for a specific form.
    /// Supports search functionality and sorting by submission date, form version, or submitter email.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <returns>A paginated result of form submissions.</returns>
    [HttpGet("form/{formId}")]
    public async Task<ActionResult<ApiResponse<PagedResult<FormSubmissionDto>>>> GetFormSubmissions(
        Guid formId, 
        [FromQuery] PaginationDto pagination)
    {
        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetFormSubmissionsAsync(formId, pagination, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves a specific form submission by its unique identifier.
    /// </summary>
    /// <param name="submissionId">The unique identifier of the form submission.</param>
    /// <returns>The form submission details.</returns>
    [HttpGet("{submissionId}")]
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> GetFormSubmission(Guid submissionId)
    {
        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetFormSubmissionByIdAsync(submissionId, access);
        
        if (!result.Success)
        {
            if (result.Message?.Contains("Access denied", StringComparison.OrdinalIgnoreCase) == true)
            {
                return StatusCode(StatusCodes.Status403Forbidden, result);
            }
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new form submission for the specified form.
    /// Uses the form version specified in the DTO, or falls back to the form's current version if not specified.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including response data, version, and submitter information.</param>
    /// <returns>The created form submission.</returns>
    [HttpPost("form/{formId}")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmission(
        Guid formId, 
        [FromBody] CreateFormSubmissionDto createSubmissionDto)
    {
        Guid? userId = HttpContext.User.Identity?.IsAuthenticated == true ? HttpContext.GetUserId() : null;

        // Set IP address
        createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _formSubmissionService.CreateFormSubmissionAsync(formId, createSubmissionDto, userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetFormSubmission), new { submissionId = result.Data!.Id }, result);
    }

    /// <summary>
    /// Creates a new form submission with Cloudflare R2 file URLs.
    /// Files are uploaded to R2 by frontend, URLs are included in responseData JSON.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including R2 URLs for file fields.</param>
    /// <returns>The created form submission.</returns>
    [HttpPost("form/{formId}/with-files")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmissionWithFiles(
        Guid formId, 
        [FromBody] CreateFormSubmissionWithFilesDto createSubmissionDto)
    {
        try
        {
            Guid? userId = HttpContext.User.Identity?.IsAuthenticated == true ? HttpContext.GetUserId() : null;

            // Set IP address
            createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            var result = await _formSubmissionService.CreateFormSubmissionWithFilesAsync(formId, createSubmissionDto, userId);
            
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
    /// Deletes a form submission by its unique identifier.
    /// Requires SuperAdmin or DepartmentAdmin role.
    /// </summary>
    /// <param name="submissionId">The unique identifier of the form submission to delete.</param>
    /// <returns>Success status of the deletion operation.</returns>
    [HttpDelete("{submissionId}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,DepartmentManager,Department Manager,Superadmin,Departmentadmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFormSubmission(Guid submissionId)
    {
        var result = await _formSubmissionService.DeleteFormSubmissionAsync(submissionId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves form submissions filtered by a specific schema version.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific schema version number to filter by.</param>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <returns>A paginated result of form submissions for the specified version.</returns>
    [HttpGet("form/{formId}/version/{versionNumber}")]
    public async Task<ActionResult<ApiResponse<PagedResult<FormSubmissionDto>>>> GetFormSubmissionsByVersion(
        Guid formId, 
        int versionNumber, 
        [FromQuery] PaginationDto pagination)
    {
        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetFormSubmissionsByVersionAsync(formId, versionNumber, pagination, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new form submission using a specific schema version.
    /// This method enforces the use of a particular schema version, ensuring data consistency.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific schema version number to use for this submission.</param>
    /// <param name="createSubmissionDto">The submission data including response data and submitter information.</param>
    /// <returns>The created form submission with the specified version.</returns>
    [HttpPost("form/{formId}/version/{versionNumber}")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmissionWithVersion(
        Guid formId, 
        int versionNumber, 
        [FromBody] CreateFormSubmissionDto createSubmissionDto)
    {
        Guid? userId = HttpContext.User.Identity?.IsAuthenticated == true ? HttpContext.GetUserId() : null;

        // Set IP address
        createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _formSubmissionService.CreateFormSubmissionWithVersionAsync(formId, versionNumber, createSubmissionDto, userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetFormSubmission), new { submissionId = result.Data!.Id }, result);
    }

    /// <summary>
    /// Creates a new form submission using the latest available schema version.
    /// This method automatically determines and uses the most recent schema version for the form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including response data and submitter information.</param>
    /// <returns>The created form submission with the latest version.</returns>
    [HttpPost("form/{formId}/latest")]
    
    public async Task<ActionResult<ApiResponse<FormSubmissionDto>>> CreateFormSubmissionWithLatestVersion(
        Guid formId, 
        [FromBody] CreateFormSubmissionDto createSubmissionDto)
    {
        Guid? userId = HttpContext.User.Identity?.IsAuthenticated == true ? HttpContext.GetUserId() : null;

        // Set IP address
        createSubmissionDto.SubmitterIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _formSubmissionService.CreateFormSubmissionWithLatestVersionAsync(formId, createSubmissionDto, userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetFormSubmission), new { submissionId = result.Data!.Id }, result);
    }

    /// <summary>
    /// Retrieves all schema versions for a specific form, ordered by version number (descending).
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>A list of all schema versions for the form.</returns>
    [HttpGet("form/{formId}/versions")]
    public async Task<ActionResult<ApiResponse<List<FormSchemaVersionDto>>>> GetFormSchemaVersions(Guid formId)
    {
        var result = await _formSubmissionService.GetFormSchemaVersionsAsync(formId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves a specific schema version for a form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific version number to retrieve.</param>
    /// <returns>The schema version details.</returns>
    [HttpGet("form/{formId}/version/{versionNumber}/schema")]
    public async Task<ActionResult<ApiResponse<FormSchemaVersionDto>>> GetFormSchemaVersion(
        Guid formId, 
        int versionNumber)
    {
        var result = await _formSubmissionService.GetFormSchemaVersionAsync(formId, versionNumber);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves the latest (most recent) schema version for a form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>The latest schema version details.</returns>
    [HttpGet("form/{formId}/versions/latest")]
    public async Task<ActionResult<ApiResponse<FormSchemaVersionDto>>> GetLatestFormSchemaVersion(Guid formId)
    {
        var result = await _formSubmissionService.GetLatestFormSchemaVersionAsync(formId);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Validates submission data against a specific schema version.
    /// Performs basic validation checks including JSON format validation and non-empty data validation.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The schema version number to validate against.</param>
    /// <param name="responseData">The submission data to validate.</param>
    /// <returns>Validation result indicating whether the data is valid against the schema.</returns>
    [HttpPost("form/{formId}/version/{versionNumber}/validate")]
    
    public async Task<ActionResult<ApiResponse<bool>>> ValidateSubmissionAgainstSchema(
        Guid formId, 
        int versionNumber, 
        [FromBody] object responseData)
    {
        var result = await _formSubmissionService.ValidateSubmissionAgainstSchemaAsync(formId, versionNumber, responseData);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Validates submission data against the latest schema version for a form.
    /// This is a convenience method that automatically uses the most recent schema version.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="responseData">The submission data to validate.</param>
    /// <returns>Validation result indicating whether the data is valid against the latest schema.</returns>
    [HttpPost("form/{formId}/validate")]
    
    public async Task<ActionResult<ApiResponse<bool>>> ValidateSubmissionAgainstLatestSchema(
        Guid formId, 
        [FromBody] object responseData)
    {
        var result = await _formSubmissionService.ValidateSubmissionAgainstLatestSchemaAsync(formId, responseData);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves submission counts grouped by schema version for a specific form.
    /// This method provides analytics data showing how many submissions were made for each version of the form schema.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>A dictionary with version numbers as keys and submission counts as values.</returns>
    [HttpGet("form/{formId}/analytics/version-counts")]
    public async Task<ActionResult<ApiResponse<Dictionary<int, int>>>> GetSubmissionCountByVersion(Guid formId)
    {
        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetSubmissionCountByVersionAsync(formId, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves the most recent form submissions for a specific form, ordered by submission date (descending).
    /// This method is useful for displaying recent activity or creating dashboards.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="count">The maximum number of recent submissions to retrieve (default: 10, max: 100).</param>
    /// <returns>A list of the most recent form submissions.</returns>
    [HttpGet("form/{formId}/recent")]
    public async Task<ActionResult<ApiResponse<List<FormSubmissionDto>>>> GetRecentSubmissions(
        Guid formId, 
        [FromQuery] int count = 10)
    {
        // Limit the count to prevent excessive data retrieval
        count = Math.Min(Math.Max(count, 1), 100);

        var access = await ResolveSubmissionAccessAsync();
        var result = await _formSubmissionService.GetRecentSubmissionsAsync(formId, count, access);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves form submission data for export with customizable field selection, filtering, and transformation.
    /// Supports date range filtering, search functionality, and metadata inclusion.
    /// </summary>
    /// <param name="request">Export request containing form ID, field selection, filters, and metadata options.</param>
    /// <returns>Transformed form submission data ready for export.</returns>
    [HttpPost("export-data")]
    public async Task<ActionResult<ApiResponse<ExportDataDto>>> GetExportData([FromBody] ExportRequestDto request)
    {
        // Validate the request
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<ExportDataDto>.ErrorResponse("Validation failed", errors));
        }

        // Validate date range
        if (request.Filters.StartDate.HasValue && request.Filters.EndDate.HasValue && 
            request.Filters.StartDate > request.Filters.EndDate)
        {
            return BadRequest(ApiResponse<ExportDataDto>.ErrorResponse("Start date cannot be after end date"));
        }

        try
        {
            var access = await ResolveSubmissionAccessAsync();

            // First, get the form to check if it exists and verify access
            var formResult = await _formSubmissionService.GetFormSubmissionsAsync(request.FormId, new PaginationDto { Page = 1, PageSize = 1 }, access);
            
            if (!formResult.Success)
            {
                if (formResult.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(ApiResponse<ExportDataDto>.ErrorResponse("Form not found"));
                }
                if (formResult.Message.Contains("Access denied", StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid(formResult.Message);
                }
                return BadRequest(ApiResponse<ExportDataDto>.ErrorResponse("Unable to access form"));
            }

            // Check department-based access control
            if (!HttpContext.IsSuperAdmin())
            {
                var userDepartmentId = HttpContext.GetDepartmentId();
                if (!userDepartmentId.HasValue)
                {
                    return Forbid("You must be associated with a department to export form data.");
                }
            }

            // Get export data
            var result = await _formSubmissionService.GetFormSubmissionsForExportAsync(
                request.FormId, 
                request.Filters, 
                request.SelectedFields, 
                request.IncludeMetadata,
                access);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(result);
                }
                if (result.Message.Contains("access denied", StringComparison.OrdinalIgnoreCase) ||
                    result.Message.Contains("forbidden", StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid(result.Message);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ExportDataDto>.ErrorResponse($"Invalid request: {ex.Message}"));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(500, ApiResponse<ExportDataDto>.ErrorResponse("An error occurred while processing the export request"));
        }
    }

    /// <summary>
    /// Retrieves form field definitions for export configuration.
    /// Returns field metadata including labels, types, and options for dropdown/radio fields.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>Array of form field definitions with metadata.</returns>
    [HttpGet("form/{formId}/field-definitions")]
    public async Task<ActionResult<ApiResponse<FormFieldDefinitionDto[]>>> GetFormFieldDefinitions(Guid formId)
    {
        try
        {
            var access = await ResolveSubmissionAccessAsync();
            // Check if form exists and user has access by attempting to get form submissions
            var accessCheck = await _formSubmissionService.GetFormSubmissionsAsync(formId, new PaginationDto { Page = 1, PageSize = 1 }, access);
            
            if (!accessCheck.Success)
            {
                if (accessCheck.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(ApiResponse<FormFieldDefinitionDto[]>.ErrorResponse("Form not found"));
                }
                return BadRequest(ApiResponse<FormFieldDefinitionDto[]>.ErrorResponse("Unable to access form"));
            }

            // Check department-based access control
            if (!HttpContext.IsSuperAdmin())
            {
                var userDepartmentId = HttpContext.GetDepartmentId();
                if (!userDepartmentId.HasValue)
                {
                    return Forbid("You must be associated with a department to access form field definitions.");
                }
            }

            var result = await _formSubmissionService.GetFormFieldDefinitionsAsync(formId);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(result);
                }
                if (result.Message.Contains("access denied", StringComparison.OrdinalIgnoreCase) ||
                    result.Message.Contains("forbidden", StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid(result.Message);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<FormFieldDefinitionDto[]>.ErrorResponse($"Invalid form ID: {ex.Message}"));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(500, ApiResponse<FormFieldDefinitionDto[]>.ErrorResponse("An error occurred while retrieving form field definitions"));
        }
    }
}
