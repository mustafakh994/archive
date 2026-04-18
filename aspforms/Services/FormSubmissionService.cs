using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using System.Text.Json;
using System.Net;

namespace FormsManagementApi.Services;

/// <summary>
/// Service for managing form submissions with support for multiple form schema versions.
/// This service handles CRUD operations for form submissions, version-specific submissions,
/// schema validation, and analytics related to form submissions across different schema versions.
/// </summary>
public class FormSubmissionService : IFormSubmissionService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    /// <summary>
    /// Initializes a new instance of the FormSubmissionService.
    /// </summary>
    /// <param name="context">The database context for data access.</param>
    /// <param name="mapper">The AutoMapper instance for object mapping.</param>
    public FormSubmissionService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    /// <summary>
    /// Retrieves all form submissions across all forms with optional department and form filtering.
    /// SuperAdmin can see all submissions, other users see only submissions from their department.
    /// Supports search functionality and sorting by submission date, form name, or submitter email.
    /// </summary>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <param name="departmentId">Optional department ID to filter submissions. If null, returns all submissions (SuperAdmin only).</param>
    /// <param name="formId">Optional form ID to filter submissions for a specific form.</param>
    /// <returns>An ApiResponse containing a paginated result of FormSubmissionDto objects.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetAllSubmissionsAsync(PaginationDto pagination, Guid? departmentId = null, Guid? formId = null, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .ThenInclude(f => f.Department)
                .AsQueryable();

            // Filter by department if specified (non-SuperAdmin users)
            if (departmentId.HasValue)
            {
                query = query.Where(fs => fs.Form.DepartmentId == departmentId.Value);
            }

            // Filter by form if specified
            if (formId.HasValue)
            {
                query = query.Where(fs => fs.FormId == formId.Value);
            }

            query = ApplySubmissionAccessFilter(query, accessContext);

            // Apply search filter
            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(fs => 
                    (fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(pagination.Search)) ||
                    fs.Form.Name.Contains(pagination.Search) ||
                    (fs.Form.Title != null && fs.Form.Title.Contains(pagination.Search)));
                // TODO: Implement JSONB search using raw SQL or PostgreSQL-specific functions
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "submittedat":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.SubmittedAt) : query.OrderBy(fs => fs.SubmittedAt);
                        break;
                    case "submitteremail":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.SubmitterEmail) : query.OrderBy(fs => fs.SubmitterEmail);
                        break;
                    case "formname":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.Form.Name) : query.OrderBy(fs => fs.Form.Name);
                        break;
                    case "formversion":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.FormVersion) : query.OrderBy(fs => fs.FormVersion);
                        break;
                    case "department":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.Form.Department.Name) : query.OrderBy(fs => fs.Form.Department.Name);
                        break;
                    default:
                        query = query.OrderByDescending(fs => fs.SubmittedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(fs => fs.SubmittedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var submissionDtos = _mapper.Map<List<FormSubmissionDto>>(items);
            
            // Add department information to each submission
            foreach (var dto in submissionDtos)
            {
                var submission = items.First(s => s.Id == dto.Id);
                if (submission.Form?.Department != null)
                {
                    // Add department name to the DTO (you might want to extend FormSubmissionDto to include this)
                    dto.FormName = $"{submission.Form.Name} ({submission.Form.Department.Name})";
                }
            }

            var pagedResult = new PagedResult<FormSubmissionDto>(submissionDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<FormSubmissionDto>>.SuccessResponse(pagedResult, "All submissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse($"An error occurred while retrieving submissions: {ex.Message}");
        }
    }

    /// <summary>
    /// Performs an advanced search on form submissions with multiple filters.
    /// Supports filtering by FormTemplate, Department, Date Range, and Dynamic Text inside JSON Data.
    /// </summary>
    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> AdvancedSearchAsync(AdvancedSearchDto searchDto, Guid? departmentId = null, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .ThenInclude(f => f.Department)
                .AsQueryable();

            // Filter by department if specified
            if (departmentId.HasValue)
            {
                query = query.Where(fs => fs.Form.DepartmentId == departmentId.Value);
            }

            query = ApplySubmissionAccessFilter(query, accessContext);
            
            // Filter by specific department requested in search
            if (searchDto.DepartmentId.HasValue && (!departmentId.HasValue || searchDto.DepartmentId.Value == departmentId.Value))
            {
                query = query.Where(fs => fs.Form.DepartmentId == searchDto.DepartmentId.Value);
            }

            // Filter by form template
            if (searchDto.FormId.HasValue)
            {
                query = query.Where(fs => fs.FormId == searchDto.FormId.Value);
            }

            // Filter by date range
            if (searchDto.StartDate.HasValue)
            {
                query = query.Where(fs => fs.SubmittedAt >= searchDto.StartDate.Value);
            }
            if (searchDto.EndDate.HasValue)
            {
                // Include the entire end date day
                var endDate = searchDto.EndDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(fs => fs.SubmittedAt <= endDate);
            }

            // Apply dynamic field filters inside JSONB data
            if (searchDto.DynamicFilters != null && searchDto.DynamicFilters.Any())
            {
                foreach (var filter in searchDto.DynamicFilters)
                {
                    if (!string.IsNullOrEmpty(filter.Value))
                    {
                        var key = filter.Key;
                        // Use string-based JSON matching as a fallback for Npgsql 8.0 to ensure build success
                        // This searches for the key and value in proximity within the JSON text
                        var searchPattern = $"%\"{key}\":%\"{filter.Value}%\"%";
                        query = query.Where(fs => EF.Functions.ILike(Convert.ToString(fs.ResponseData), searchPattern));
                    }
                }
            }

            // Apply text search inside JSONB data and other text limits
            if (!string.IsNullOrEmpty(searchDto.Search))
            {
                // We use Convert.ToString to force EF Core to cast the JSONB column to text, avoiding ILIKE operator errors
                var searchPattern = $"%{searchDto.Search}%";
                query = query.Where(fs => 
                    (fs.SubmitterEmail != null && EF.Functions.ILike(fs.SubmitterEmail, searchPattern)) ||
                    EF.Functions.ILike(fs.Form.Name, searchPattern) ||
                    (fs.Form.Title != null && EF.Functions.ILike(fs.Form.Title, searchPattern)) ||
                    EF.Functions.ILike(Convert.ToString(fs.ResponseData), searchPattern));
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(searchDto.SortBy))
            {
                switch (searchDto.SortBy.ToLower())
                {
                    case "submittedat":
                        query = searchDto.SortDescending ? query.OrderByDescending(fs => fs.SubmittedAt) : query.OrderBy(fs => fs.SubmittedAt);
                        break;
                    case "formname":
                        query = searchDto.SortDescending ? query.OrderByDescending(fs => fs.Form.Name) : query.OrderBy(fs => fs.Form.Name);
                        break;
                    default:
                        query = query.OrderByDescending(fs => fs.SubmittedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(fs => fs.SubmittedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var submissionDtos = _mapper.Map<List<FormSubmissionDto>>(items);
            
            // Add department information to each submission
            foreach (var dto in submissionDtos)
            {
                var submission = items.First(s => s.Id == dto.Id);
                if (submission.Form?.Department != null)
                {
                    dto.FormName = $"{submission.Form.Name} ({submission.Form.Department.Name})";
                }
            }

            var pagedResult = new PagedResult<FormSubmissionDto>(submissionDtos, totalItems, searchDto.Page, searchDto.PageSize);

            return ApiResponse<PagedResult<FormSubmissionDto>>.SuccessResponse(pagedResult, "Advanced search completed successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse($"An error occurred during advanced search: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves a paginated list of form submissions for a specific form.
    /// Supports search functionality and sorting by submission date, form version, or submitter email.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <returns>An ApiResponse containing a paginated result of FormSubmissionDto objects.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsAsync(Guid formId, PaginationDto pagination, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            // Verify form exists
            var formExists = await _context.Forms.AnyAsync(f => f.Id == formId);
            if (!formExists)
            {
                return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse("Form not found.");
            }

            if (accessContext != null && (!accessContext.CanAccessForm(formId) || accessContext.IsDenyAll))
            {
                return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse("Access denied to this form.");
            }

            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Where(fs => fs.FormId == formId)
                .AsQueryable();

            query = ApplySubmissionAccessFilter(query, accessContext);

            // Apply search filter
            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(fs => 
                    (fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(pagination.Search)));
                    // Note: JSONB search temporarily disabled due to PostgreSQL compatibility issues
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "submittedat":
                        query = pagination.SortDescending ? 
                            query.OrderByDescending(fs => fs.SubmittedAt) : 
                            query.OrderBy(fs => fs.SubmittedAt);
                        break;
                    case "formversion":
                        query = pagination.SortDescending ? 
                            query.OrderByDescending(fs => fs.FormVersion) : 
                            query.OrderBy(fs => fs.FormVersion);
                        break;
                    case "submitteremail":
                        query = pagination.SortDescending ? 
                            query.OrderByDescending(fs => fs.SubmitterEmail) : 
                            query.OrderBy(fs => fs.SubmitterEmail);
                        break;
                    default:
                        query = query.OrderByDescending(fs => fs.SubmittedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(fs => fs.SubmittedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var submissionDtos = _mapper.Map<List<FormSubmissionDto>>(items);
            var pagedResult = new PagedResult<FormSubmissionDto>(submissionDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<FormSubmissionDto>>.SuccessResponse(pagedResult, "Form submissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse($"An error occurred while retrieving form submissions: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves a specific form submission by its unique identifier.
    /// </summary>
    /// <param name="submissionId">The unique identifier of the form submission.</param>
    /// <returns>An ApiResponse containing the FormSubmissionDto if found, or an error message if not found.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<FormSubmissionDto>> GetFormSubmissionByIdAsync(Guid submissionId, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            var submission = await _context.FormSubmissions
                .Include(fs => fs.Form)
                .FirstOrDefaultAsync(fs => fs.Id == submissionId);

            if (submission == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form submission not found.");
            }

            if (!SubmissionMatchesAccess(submission, accessContext))
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Access denied.");
            }

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while retrieving form submission: {ex.Message}");
        }
    }

    /// <summary>
    /// Creates a new form submission for the specified form.
    /// Uses the form version specified in the DTO, or falls back to the form's current version if not specified.
    /// Validates that the form exists, is active, and the specified version exists.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including response data, version, and submitter information.</param>
    /// <param name="userId">Optional user ID of the submitter (currently not used but available for future enhancements).</param>
    /// <returns>An ApiResponse containing the created FormSubmissionDto or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during submission creation.</exception>
    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.FormSchemaVersions)
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found." + formId);
            }

            if (form.Status != "Active")
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            // Determine version to use
            int versionToUse = createSubmissionDto.FormVersion ?? form.Version;

            // Validate that the version exists
            var schemaVersion = await _context.FormSchemaVersions
                .FirstOrDefaultAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionToUse);

            if (schemaVersion == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse($"Form schema version {versionToUse} not found.");
            }

            // Parse IP address if provided
            IPAddress? submitterIp = null;
            if (!string.IsNullOrEmpty(createSubmissionDto.SubmitterIp))
            {
                if (!IPAddress.TryParse(createSubmissionDto.SubmitterIp, out submitterIp))
                {
                    return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid IP address format.");
                }
            }

            var submission = new FormSubmission
            {
                FormId = formId,
                ResponseData = JsonSerializer.Serialize(createSubmissionDto.ResponseData),
                FormVersion = versionToUse,
                SubmitterIp = submitterIp,
                SubmitterEmail = createSubmissionDto.SubmitterEmail,
                SubmittedByUserId = userId,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(submission).Reference(fs => fs.Form).LoadAsync();

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission: {ex.Message}");
        }
    }

    /// <summary>
    /// Creates a new form submission with Cloudflare R2 file URLs.
    /// Files are uploaded to R2 by frontend, URLs are included in responseData JSON.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including R2 URLs for file fields.</param>
    /// <param name="userId">Optional user ID of the submitter.</param>
    /// <returns>An ApiResponse containing the created FormSubmissionDto.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during submission creation.</exception>
    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithFilesAsync(Guid formId, CreateFormSubmissionWithFilesDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.FormSchemaVersions)
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found.");
            }

            if (form.Status != "Active")
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            // Parse and validate response data JSON
            object responseData;
            try
            {
                responseData = JsonSerializer.Deserialize<object>(createSubmissionDto.ResponseDataJson) ?? new object();
            }
            catch (JsonException)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid JSON format in response data.");
            }

            // Validate R2 URLs in the response data (if any)
            var validationResult = ValidateR2UrlsInResponseData(createSubmissionDto.ResponseDataJson);
            if (!validationResult.IsValid)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse($"File URL validation failed: {validationResult.ErrorMessage}");
            }

            // Determine version to use
            int versionToUse = createSubmissionDto.FormVersion ?? form.Version;

            // Validate that the version exists
            var schemaVersion = await _context.FormSchemaVersions
                .FirstOrDefaultAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionToUse);

            if (schemaVersion == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse($"Form schema version {versionToUse} not found.");
            }

            // Parse IP address if provided
            IPAddress? submitterIp = null;
            if (!string.IsNullOrEmpty(createSubmissionDto.SubmitterIp))
            {
                if (!IPAddress.TryParse(createSubmissionDto.SubmitterIp, out submitterIp))
                {
                    return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid IP address format.");
                }
            }

            // Create the form submission (R2 URLs are already in the response data)
            var submission = new FormSubmission
            {
                FormId = formId,
                ResponseData = createSubmissionDto.ResponseDataJson,
                FormVersion = versionToUse,
                SubmitterIp = submitterIp,
                SubmitterEmail = createSubmissionDto.SubmitterEmail,
                SubmittedByUserId = userId,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(submission).Reference(fs => fs.Form).LoadAsync();

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates R2 URLs in response data for file fields.
    /// </summary>
    private (bool IsValid, string ErrorMessage) ValidateR2UrlsInResponseData(string responseDataJson)
    {
        try
        {
            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseDataJson);
            if (responseData == null)
            {
                return (true, string.Empty); // No data to validate
            }

            foreach (var kvp in responseData)
            {
                var value = kvp.Value?.ToString();
                if (string.IsNullOrEmpty(value))
                    continue;

                // Check if this is a file field (URL starting with http)
                if (value.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    if (!IsValidR2Url(value))
                    {
                        return (false, $"Invalid file URL format for field {kvp.Key}: {value}");
                    }
                }
            }

            return (true, string.Empty);
        }
        catch (Exception ex)
        {
            return (false, $"Error validating response data: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates if a URL is a valid Cloudflare R2 URL.
    /// </summary>
    private bool IsValidR2Url(string url)
    {
        if (string.IsNullOrEmpty(url))
            return false;

        try
        {
            var uri = new Uri(url);
            
            // Check if it's HTTPS
            if (uri.Scheme != "https")
                return false;

            // Check if it's an R2 domain (pub-*.r2.dev)
            var host = uri.Host.ToLowerInvariant();
            if (!host.StartsWith("pub-") || !host.EndsWith(".r2.dev"))
                return false;

            // Check if path contains submissions structure
            var path = uri.AbsolutePath;
            if (!path.StartsWith("/submissions/"))
                return false;

            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Extracts filename from R2 URL.
    /// </summary>
    private string ExtractFilenameFromR2Url(string url)
    {
        try
        {
            var uri = new Uri(url);
            var segments = uri.Segments;
            return segments.LastOrDefault()?.TrimEnd('/') ?? "unknown";
        }
        catch
        {
            return "unknown";
        }
    }

    /// <summary>
    /// Deletes a form submission by its unique identifier.
    /// </summary>
    /// <param name="submissionId">The unique identifier of the form submission to delete.</param>
    /// <returns>An ApiResponse containing a boolean indicating success or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during deletion.</exception>
    public async Task<ApiResponse<bool>> DeleteFormSubmissionAsync(Guid submissionId)
    {
        try
        {
            var submission = await _context.FormSubmissions.FindAsync(submissionId);
            if (submission == null)
            {
                return ApiResponse<bool>.ErrorResponse("Form submission not found.");
            }

            _context.FormSubmissions.Remove(submission);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Form submission deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting form submission: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves a paginated list of form submissions filtered by a specific schema version.
    /// This method allows you to view all submissions that were created using a particular version of the form schema.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific schema version number to filter by.</param>
    /// <param name="pagination">Pagination parameters including page number, page size, search term, and sorting options.</param>
    /// <returns>An ApiResponse containing a paginated result of FormSubmissionDto objects for the specified version.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsByVersionAsync(Guid formId, int versionNumber, PaginationDto pagination, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            // Verify form and version exist
            var formExists = await _context.Forms.AnyAsync(f => f.Id == formId);
            if (!formExists)
            {
                return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse("Form not found ." + formId);
            }

            var versionExists = await _context.FormSchemaVersions
                .AnyAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionNumber);
            if (!versionExists)
            {
                return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse($"Form schema version {versionNumber} not found.");
            }

            if (accessContext != null && (!accessContext.CanAccessForm(formId) || accessContext.IsDenyAll))
            {
                return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse("Access denied to this form.");
            }

            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Where(fs => fs.FormId == formId && fs.FormVersion == versionNumber)
                .AsQueryable();

            query = ApplySubmissionAccessFilter(query, accessContext);

            // Apply search filter
            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(fs => 
                    (fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(pagination.Search)));
                    // Note: JSONB search temporarily disabled due to PostgreSQL compatibility issues
            }

            // Apply sorting
            query = !string.IsNullOrEmpty(pagination.SortBy) && pagination.SortBy.ToLower() == "submitteremail" && pagination.SortDescending
                ? query.OrderByDescending(fs => fs.SubmitterEmail)
                : query.OrderByDescending(fs => fs.SubmittedAt);

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var submissionDtos = _mapper.Map<List<FormSubmissionDto>>(items);
            var pagedResult = new PagedResult<FormSubmissionDto>(submissionDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<FormSubmissionDto>>.SuccessResponse(pagedResult, $"Form submissions for version {versionNumber} retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<FormSubmissionDto>>.ErrorResponse($"An error occurred while retrieving form submissions by version: {ex.Message}");
        }
    }

    /// <summary>
    /// Creates a new form submission using a specific schema version.
    /// This method enforces the use of a particular schema version, ensuring data consistency.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific schema version number to use for this submission.</param>
    /// <param name="createSubmissionDto">The submission data including response data and submitter information.</param>
    /// <param name="userId">Optional user ID of the submitter (currently not used but available for future enhancements).</param>
    /// <returns>An ApiResponse containing the created FormSubmissionDto or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during submission creation.</exception>
    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithVersionAsync(Guid formId, int versionNumber, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == formId);
            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found.");
            }

            if (form.Status != "Active")
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            // Validate that the specific version exists
            var schemaVersion = await _context.FormSchemaVersions
                .FirstOrDefaultAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionNumber);

            if (schemaVersion == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse($"Form schema version {versionNumber} not found.");
            }

            // Parse IP address if provided
            IPAddress? submitterIp = null;
            if (!string.IsNullOrEmpty(createSubmissionDto.SubmitterIp))
            {
                if (!IPAddress.TryParse(createSubmissionDto.SubmitterIp, out submitterIp))
                {
                    return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid IP address format.");
                }
            }

            var submission = new FormSubmission
            {
                FormId = formId,
                ResponseData = JsonSerializer.Serialize(createSubmissionDto.ResponseData),
                FormVersion = versionNumber,
                SubmitterIp = submitterIp,
                SubmitterEmail = createSubmissionDto.SubmitterEmail,
                SubmittedByUserId = userId,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(submission).Reference(fs => fs.Form).LoadAsync();

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, $"Form submission created successfully with version {versionNumber}.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission with version: {ex.Message}");
        }
    }

    /// <summary>
    /// Creates a new form submission using the latest available schema version.
    /// This method automatically determines and uses the most recent schema version for the form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="createSubmissionDto">The submission data including response data and submitter information.</param>
    /// <param name="userId">Optional user ID of the submitter (currently not used but available for future enhancements).</param>
    /// <returns>An ApiResponse containing the created FormSubmissionDto or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during submission creation.</exception>
    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithLatestVersionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.FormSchemaVersions)
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found.");
            }

            if (form.Status != "Active")
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            // Get the latest schema version
            var latestSchemaVersion = await _context.FormSchemaVersions
                .Where(fsv => fsv.FormId == formId)
                .OrderByDescending(fsv => fsv.VersionNumber)
                .FirstOrDefaultAsync();

            if (latestSchemaVersion == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("No schema versions found for this form.");
            }

            // Parse IP address if provided
            IPAddress? submitterIp = null;
            if (!string.IsNullOrEmpty(createSubmissionDto.SubmitterIp))
            {
                if (!IPAddress.TryParse(createSubmissionDto.SubmitterIp, out submitterIp))
                {
                    return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid IP address format.");
                }
            }

            var submission = new FormSubmission
            {
                FormId = formId,
                ResponseData = JsonSerializer.Serialize(createSubmissionDto.ResponseData),
                FormVersion = latestSchemaVersion.VersionNumber,
                SubmitterIp = submitterIp,
                SubmitterEmail = createSubmissionDto.SubmitterEmail,
                SubmittedByUserId = userId,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(submission).Reference(fs => fs.Form).LoadAsync();

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, $"Form submission created successfully with latest version {latestSchemaVersion.VersionNumber}.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission with latest version: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves all schema versions for a specific form, ordered by version number (descending).
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>An ApiResponse containing a list of FormSchemaVersionDto objects or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<List<FormSchemaVersionDto>>> GetFormSchemaVersionsAsync(Guid formId)
    {
        try
        {
            var formExists = await _context.Forms.AnyAsync(f => f.Id == formId);
            if (!formExists)
            {
                return ApiResponse<List<FormSchemaVersionDto>>.ErrorResponse("Form not found.");
            }

            var schemaVersions = await _context.FormSchemaVersions
                .Include(fsv => fsv.Creator)
                .Where(fsv => fsv.FormId == formId)
                .OrderByDescending(fsv => fsv.VersionNumber)
                .ToListAsync();

            var schemaVersionDtos = _mapper.Map<List<FormSchemaVersionDto>>(schemaVersions);
            return ApiResponse<List<FormSchemaVersionDto>>.SuccessResponse(schemaVersionDtos, "Form schema versions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<FormSchemaVersionDto>>.ErrorResponse($"An error occurred while retrieving form schema versions: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves a specific schema version for a form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The specific version number to retrieve.</param>
    /// <returns>An ApiResponse containing the FormSchemaVersionDto or an error message if not found.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<FormSchemaVersionDto>> GetFormSchemaVersionAsync(Guid formId, int versionNumber)
    {
        try
        {
            var schemaVersion = await _context.FormSchemaVersions
                .Include(fsv => fsv.Creator)
                .FirstOrDefaultAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionNumber);

            if (schemaVersion == null)
            {
                return ApiResponse<FormSchemaVersionDto>.ErrorResponse($"Form schema version {versionNumber} not found.");
            }

            var schemaVersionDto = _mapper.Map<FormSchemaVersionDto>(schemaVersion);
            return ApiResponse<FormSchemaVersionDto>.SuccessResponse(schemaVersionDto, "Form schema version retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSchemaVersionDto>.ErrorResponse($"An error occurred while retrieving form schema version: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves the latest (most recent) schema version for a form.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>An ApiResponse containing the latest FormSchemaVersionDto or an error message if no versions exist.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<FormSchemaVersionDto>> GetLatestFormSchemaVersionAsync(Guid formId)
    {
        try
        {
            var latestSchemaVersion = await _context.FormSchemaVersions
                .Include(fsv => fsv.Creator)
                .Where(fsv => fsv.FormId == formId)
                .OrderByDescending(fsv => fsv.VersionNumber)
                .FirstOrDefaultAsync();

            if (latestSchemaVersion == null)
            {
                return ApiResponse<FormSchemaVersionDto>.ErrorResponse("No schema versions found for this form.");
            }

            var schemaVersionDto = _mapper.Map<FormSchemaVersionDto>(latestSchemaVersion);
            return ApiResponse<FormSchemaVersionDto>.SuccessResponse(schemaVersionDto, "Latest form schema version retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSchemaVersionDto>.ErrorResponse($"An error occurred while retrieving latest form schema version: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates submission data against a specific schema version.
    /// Performs basic validation checks including JSON format validation and non-empty data validation.
    /// Note: This is a basic implementation that can be extended with more sophisticated JSON schema validation.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="versionNumber">The schema version number to validate against.</param>
    /// <param name="responseData">The submission data to validate.</param>
    /// <returns>An ApiResponse containing a boolean indicating validation success or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during validation.</exception>
    public async Task<ApiResponse<bool>> ValidateSubmissionAgainstSchemaAsync(Guid formId, int versionNumber, object responseData)
    {
        try
        {
            var schemaVersion = await _context.FormSchemaVersions
                .FirstOrDefaultAsync(fsv => fsv.FormId == formId && fsv.VersionNumber == versionNumber);

            if (schemaVersion == null)
            {
                return ApiResponse<bool>.ErrorResponse($"Form schema version {versionNumber} not found.");
            }

            // Basic validation - in a real implementation, you might want to use a JSON schema validator
            // For now, we'll do basic checks
            var responseJson = JsonSerializer.Serialize(responseData);
            var schemaJson = schemaVersion.SchemaData;

            // Simple validation - check if response data is valid JSON and not empty
            if (string.IsNullOrWhiteSpace(responseJson) || responseJson == "null")
            {
                return ApiResponse<bool>.SuccessResponse(false, "Response data is empty or invalid.");
            }

            // Additional validation logic can be added here based on the schema
            // For example, checking required fields, data types, etc.

            return ApiResponse<bool>.SuccessResponse(true, "Submission data is valid against the schema.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while validating submission: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates submission data against the latest schema version for a form.
    /// This is a convenience method that automatically uses the most recent schema version.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="responseData">The submission data to validate.</param>
    /// <returns>An ApiResponse containing a boolean indicating validation success or an error message.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during validation.</exception>
    public async Task<ApiResponse<bool>> ValidateSubmissionAgainstLatestSchemaAsync(Guid formId, object responseData)
    {
        try
        {
            var latestSchemaVersion = await _context.FormSchemaVersions
                .Where(fsv => fsv.FormId == formId)
                .OrderByDescending(fsv => fsv.VersionNumber)
                .FirstOrDefaultAsync();

            if (latestSchemaVersion == null)
            {
                return ApiResponse<bool>.ErrorResponse("No schema versions found for this form.");
            }

            return await ValidateSubmissionAgainstSchemaAsync(formId, latestSchemaVersion.VersionNumber, responseData);
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while validating submission against latest schema: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves submission counts grouped by schema version for a specific form.
    /// This method provides analytics data showing how many submissions were made for each version of the form schema.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>An ApiResponse containing a dictionary with version numbers as keys and submission counts as values.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<Dictionary<int, int>>> GetSubmissionCountByVersionAsync(Guid formId, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            var formExists = await _context.Forms.AnyAsync(f => f.Id == formId);
            if (!formExists)
            {
                return ApiResponse<Dictionary<int, int>>.ErrorResponse("Form not found.");
            }

            if (accessContext != null && (!accessContext.CanAccessForm(formId) || accessContext.IsDenyAll))
            {
                return ApiResponse<Dictionary<int, int>>.ErrorResponse("Access denied to this form.");
            }

            var countQuery = _context.FormSubmissions
                .Where(fs => fs.FormId == formId && fs.FormVersion.HasValue);
            countQuery = ApplySubmissionAccessFilter(countQuery, accessContext);

            var submissionCounts = await countQuery
                .GroupBy(fs => fs.FormVersion!.Value)
                .Select(g => new { Version = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Version, x => x.Count);

            return ApiResponse<Dictionary<int, int>>.SuccessResponse(submissionCounts, "Submission counts by version retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<Dictionary<int, int>>.ErrorResponse($"An error occurred while retrieving submission counts by version: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves the most recent form submissions for a specific form, ordered by submission date (descending).
    /// This method is useful for displaying recent activity or creating dashboards.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="count">The maximum number of recent submissions to retrieve (default: 10).</param>
    /// <returns>An ApiResponse containing a list of FormSubmissionDto objects representing the most recent submissions.</returns>
    /// <exception cref="Exception">Thrown when an error occurs during data retrieval.</exception>
    public async Task<ApiResponse<List<FormSubmissionDto>>> GetRecentSubmissionsAsync(Guid formId, int count = 10, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            var formExists = await _context.Forms.AnyAsync(f => f.Id == formId);
            if (!formExists)
            {
                return ApiResponse<List<FormSubmissionDto>>.ErrorResponse("Form not found.");
            }

            if (accessContext != null && (!accessContext.CanAccessForm(formId) || accessContext.IsDenyAll))
            {
                return ApiResponse<List<FormSubmissionDto>>.ErrorResponse("Access denied to this form.");
            }

            var q = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Where(fs => fs.FormId == formId);
            q = ApplySubmissionAccessFilter(q, accessContext);

            var recentSubmissions = await q
                .OrderByDescending(fs => fs.SubmittedAt)
                .Take(count)
                .ToListAsync();

            var submissionDtos = _mapper.Map<List<FormSubmissionDto>>(recentSubmissions);
            return ApiResponse<List<FormSubmissionDto>>.SuccessResponse(submissionDtos, $"Recent {count} submissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<FormSubmissionDto>>.ErrorResponse($"An error occurred while retrieving recent submissions: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves form submissions for export with filtering and transformation.
    /// Includes comprehensive pagination support with validation and metadata.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <param name="filters">Export filters including date range, search, and pagination.</param>
    /// <param name="selectedFields">List of field IDs to include in export.</param>
    /// <param name="metadata">Metadata inclusion options.</param>
    /// <returns>An ApiResponse containing export data with pagination metadata.</returns>
    public async Task<ApiResponse<ExportDataDto>> GetFormSubmissionsForExportAsync(Guid formId, ExportFilterDto filters, List<string> selectedFields, ExportMetadataDto metadata, SubmissionQueryContext? accessContext = null)
    {
        try
        {
            // Validate pagination parameters
            var paginationValidation = ValidatePaginationParameters(filters);
            if (!paginationValidation.IsValid)
            {
                return ApiResponse<ExportDataDto>.ErrorResponse(paginationValidation.ErrorMessage);
            }

            // Verify form exists
            var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == formId);
            if (form == null)
            {
                return ApiResponse<ExportDataDto>.ErrorResponse("Form not found.");
            }

            if (accessContext != null && (!accessContext.CanAccessForm(formId) || accessContext.IsDenyAll))
            {
                return ApiResponse<ExportDataDto>.ErrorResponse("Access denied to this form.");
            }

            // Build query with filters
            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Where(fs => fs.FormId == formId);

            query = ApplySubmissionAccessFilter(query, accessContext);

            // Apply date range filters
            if (filters.StartDate.HasValue)
            {
                query = query.Where(fs => fs.SubmittedAt >= filters.StartDate.Value);
            }

            if (filters.EndDate.HasValue)
            {
                query = query.Where(fs => fs.SubmittedAt <= filters.EndDate.Value);
            }

            // Apply search filter
            if (!string.IsNullOrEmpty(filters.Search))
            {
                query = query.Where(fs => 
                    (fs.SubmitterEmail != null && fs.SubmitterEmail.Contains(filters.Search)) ||
                    EF.Functions.JsonContains(fs.ResponseData, $"\"{filters.Search}\""));
            }

            // Order by submission date for consistent pagination
            query = query.OrderByDescending(fs => fs.SubmittedAt);

            // Get total count for pagination metadata
            var totalRecords = await query.CountAsync();

            // Validate page boundaries
            var maxPage = (int)Math.Ceiling((double)totalRecords / filters.PageSize);
            if (filters.Page > maxPage && totalRecords > 0)
            {
                return ApiResponse<ExportDataDto>.ErrorResponse($"Page {filters.Page} exceeds maximum page {maxPage} for {totalRecords} total records.");
            }

            // Apply pagination using Skip and Take
            var submissions = await query
                .Skip(filters.Skip)
                .Take(filters.Take)
                .ToListAsync();

            // Create pagination metadata
            var paginationMetadata = ExportPaginationMetadataDto.Create(
                filters.Page, 
                filters.PageSize, 
                totalRecords);

            // Create export data response (transformation will be added in task 4)
            var exportData = new ExportDataDto
            {
                FormName = form.Name,
                TotalResponses = totalRecords,
                Responses = new List<Dictionary<string, object>>(), // Will be populated in task 4
                Fields = new List<FormFieldDefinitionDto>(), // Will be populated in task 4
                Pagination = paginationMetadata
            };

            return ApiResponse<ExportDataDto>.SuccessResponse(exportData, 
                $"Export data retrieved successfully. Page {filters.Page} of {paginationMetadata.TotalPages}, showing {submissions.Count} of {totalRecords} total records.");
        }
        catch (Exception ex)
        {
            return ApiResponse<ExportDataDto>.ErrorResponse($"An error occurred while retrieving export data: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves form field definitions for export configuration.
    /// This is a placeholder implementation - full implementation is in task 4.
    /// </summary>
    /// <param name="formId">The unique identifier of the form.</param>
    /// <returns>An ApiResponse containing form field definitions.</returns>
    public async Task<ApiResponse<FormFieldDefinitionDto[]>> GetFormFieldDefinitionsAsync(Guid formId)
    {
        // Placeholder implementation - will be completed in task 4
        await Task.Delay(1); // Prevent compiler warning
        return ApiResponse<FormFieldDefinitionDto[]>.ErrorResponse("Field definitions functionality is not yet implemented. Please complete task 4 first.");
    }

    public async Task<SubmissionQueryContext> BuildRestrictedSubmissionContextAsync(Guid userId, Guid departmentId, string? userEmail)
    {
        var rows = await (
            from fp in _context.FormPermissions.AsNoTracking()
            join f in _context.Forms.AsNoTracking() on fp.FormId equals f.Id
            where fp.UserId == userId && f.DepartmentId == departmentId
            select new { fp.FormId, fp.Permission }
        ).ToListAsync();

        static bool IsFullViewPermission(string p) =>
            p.Equals("read", StringComparison.OrdinalIgnoreCase) ||
            p.Equals("write", StringComparison.OrdinalIgnoreCase) ||
            p.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
            p.Equals("search_inquiry", StringComparison.OrdinalIgnoreCase);

        static bool IsArchivist(string p) =>
            p.Equals("archivist", StringComparison.OrdinalIgnoreCase);

        var full = new HashSet<Guid>();
        var own = new HashSet<Guid>();

        foreach (var g in rows.GroupBy(r => r.FormId))
        {
            var perms = g.Select(x => x.Permission).ToList();
            if (perms.Any(IsFullViewPermission))
                full.Add(g.Key);
            else if (perms.Any(IsArchivist))
                own.Add(g.Key);
        }

        return new SubmissionQueryContext
        {
            UserId = userId,
            UserEmail = userEmail,
            FullAccessFormIds = full,
            OwnSubmissionsOnlyFormIds = own
        };
    }

    private static IQueryable<FormSubmission> ApplySubmissionAccessFilter(IQueryable<FormSubmission> query, SubmissionQueryContext? access)
    {
        if (access == null) return query;
        if (access.IsDenyAll) return query.Where(_ => false);

        return query.Where(fs =>
            access.FullAccessFormIds.Contains(fs.FormId) ||
            (access.OwnSubmissionsOnlyFormIds.Contains(fs.FormId) && (
                fs.SubmittedByUserId == access.UserId ||
                (fs.SubmittedByUserId == null && access.UserEmail != null && fs.SubmitterEmail != null &&
                 fs.SubmitterEmail.ToLower() == access.UserEmail.ToLower())
            )));
    }

    private static bool SubmissionMatchesAccess(FormSubmission fs, SubmissionQueryContext? access)
    {
        if (access == null) return true;
        if (access.IsDenyAll) return false;
        if (access.FullAccessFormIds.Contains(fs.FormId)) return true;
        if (access.OwnSubmissionsOnlyFormIds.Contains(fs.FormId))
        {
            if (fs.SubmittedByUserId == access.UserId) return true;
            if (fs.SubmittedByUserId == null && !string.IsNullOrEmpty(access.UserEmail) && fs.SubmitterEmail != null &&
                string.Equals(fs.SubmitterEmail, access.UserEmail, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Validates pagination parameters for export requests.
    /// Implements maximum page size validation and page boundary checks.
    /// </summary>
    /// <param name="filters">Export filter containing pagination parameters.</param>
    /// <returns>Validation result with success status and error message if applicable.</returns>
    private (bool IsValid, string ErrorMessage) ValidatePaginationParameters(ExportFilterDto filters)
    {
        // Validate page number
        if (filters.Page < 1)
        {
            return (false, "Page number must be greater than 0.");
        }

        // Validate page size (already validated by data annotations, but double-check)
        if (filters.PageSize < 1)
        {
            return (false, "Page size must be greater than 0.");
        }

        if (filters.PageSize > 10000)
        {
            return (false, "Page size cannot exceed 10,000 records to ensure optimal performance.");
        }

        // Validate date range if both dates are provided
        if (filters.StartDate.HasValue && filters.EndDate.HasValue)
        {
            if (filters.StartDate.Value > filters.EndDate.Value)
            {
                return (false, "Start date cannot be after end date.");
            }
        }

        // Validate search term length
        if (!string.IsNullOrEmpty(filters.Search) && filters.Search.Length > 500)
        {
            return (false, "Search term cannot exceed 500 characters.");
        }

        return (true, string.Empty);
    }
}
