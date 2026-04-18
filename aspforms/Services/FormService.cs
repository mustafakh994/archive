using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using System.Text.Json;

namespace FormsManagementApi.Services;

public class FormService : IFormService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<FormService> _logger;

    public FormService(ApplicationDbContext context, IMapper mapper, ILogger<FormService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<FormDto>>> GetFormsAsync(PaginationDto pagination, Guid? departmentId = null)
    {
        try
        {
            // Debug method entry
            
            var query = _context.Forms
                .Include(f => f.Department)
                .Include(f => f.Creator)
                .Include(f => f.FormSubmissions)
                .AsQueryable();
            

            // Filter by department if specified
            if (departmentId.HasValue)
            {
                Console.WriteLine($"[DEBUG] Filtering by departmentId: {departmentId.Value}");
                query = query.Where(f => f.DepartmentId == departmentId.Value);
                Console.WriteLine($"[DEBUG] After department filter, Forms count: {query.Count()}");
            }

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(f => f.Name.Contains(pagination.Search) || 
                                       (f.Description != null && f.Description.Contains(pagination.Search)) ||
                                       (f.Title != null && f.Title.Contains(pagination.Search)));
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "name":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.Name) : query.OrderBy(f => f.Name);
                        break;
                    case "title":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.Title) : query.OrderBy(f => f.Title);
                        break;
                    case "createdat":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.CreatedAt) : query.OrderBy(f => f.CreatedAt);
                        break;
                    case "status":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.Status) : query.OrderBy(f => f.Status);
                        break;
                    default:
                        query = query.OrderByDescending(f => f.CreatedAt);
                        break;
                }
            }
            else
            {
                query = query.OrderByDescending(f => f.CreatedAt);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var formDtos = _mapper.Map<List<FormDto>>(items);
            var pagedResult = new PagedResult<FormDto>(formDtos, totalItems, pagination.Page, pagination.PageSize);

            return ApiResponse<PagedResult<FormDto>>.SuccessResponse(pagedResult, "Forms retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<FormDto>>.ErrorResponse($"An error occurred while retrieving forms: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormDto>> GetFormByIdAsync(Guid id)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.Department)
                .Include(f => f.Creator)
                .Include(f => f.FormSubmissions)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return ApiResponse<FormDto>.ErrorResponse("Form not found.");
            }

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while retrieving form: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormDto>> CreateFormAsync(CreateFormDto createFormDto, Guid departmentId, Guid? createdBy = null)
    {
        try
        {
            // Validate department
            var department = await _context.Departments.FindAsync(departmentId);
            if (department == null)
            {
                return ApiResponse<FormDto>.ErrorResponse("Invalid department.");
            }

            var form = _mapper.Map<Form>(createFormDto);
            form.DepartmentId = departmentId;
            form.CreatedBy = createdBy;

            // Set status to Active by default if not provided
            if (string.IsNullOrWhiteSpace(form.Status))
            {
                form.Status = "Active";
            }

            // Ensure Code is always filled
            if (string.IsNullOrWhiteSpace(form.Code))
            {
                form.Code = await GenerateUniqueFormCodeAsync(form.Name);
            }
            else
            {
                // Check if provided code is unique
                var codeExists = await _context.Forms.AnyAsync(f => f.Code == form.Code);
                if (codeExists)
                {
                    form.Code = await GenerateUniqueFormCodeAsync(form.Name, form.Code);
                }
            }

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            // Create initial schema version
            if (!string.IsNullOrEmpty(form.FormSchema))
            {
                await CreateSchemaVersionAsync(form.Id, form.FormSchema, createdBy, 1);
            }

            // Reload form with related information
            form = await _context.Forms
                .Include(f => f.Department)
                .Include(f => f.Creator)
                .Include(f => f.FormSubmissions)
                .FirstAsync(f => f.Id == form.Id);

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form created successfully.");
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message ?? "No inner exception";
            _logger.LogError(ex, "Error creating form. Inner: {Inner}", innerMsg);
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while creating form: {ex.Message} | Inner: {innerMsg}");
        }
    }

    public async Task<ApiResponse<FormDto>> CreateFormFromRequestAsync(CreateFormRequestDto createFormRequestDto, Guid? createdBy = null)
    {
        try
        {
            // Parse DepartmentId from string to Guid
            if (!Guid.TryParse(createFormRequestDto.DepartmentId, out Guid departmentId))
            {
                return ApiResponse<FormDto>.ErrorResponse("Invalid DepartmentId format.");
            }

            // Parse UserId from string to Guid if provided
            Guid? userId = null;
            if (!string.IsNullOrEmpty(createFormRequestDto.UserId) && Guid.TryParse(createFormRequestDto.UserId, out Guid parsedUserId))
            {
                userId = parsedUserId;
            }

            // Validate department
            var department = await _context.Departments.FindAsync(departmentId);
            if (department == null)
            {
                return ApiResponse<FormDto>.ErrorResponse("Department not found.");
            }

            // Generate unique code for the form
            var formCode = await GenerateUniqueFormCodeAsync(createFormRequestDto.Title);

            // Create form entity
            var form = new Form
            {
                Id = Guid.NewGuid(),
                DepartmentId = departmentId,
                Name = createFormRequestDto.Title, // Use title as name
                Code = formCode, // Always set the code
                Title = createFormRequestDto.Title,
                Description = createFormRequestDto.Description,
                CreatedBy = createdBy ?? userId,
                Status = "Active",
                CreatedAt = DateTimeOffset.UtcNow
            };

            // Serialize schema and settings to JSON
            if (createFormRequestDto.Schema != null)
            {
                // Generate UUIDs for fields that don't have IDs
                GenerateFieldIds(createFormRequestDto.Schema);
                form.FormSchema = JsonSerializer.Serialize(createFormRequestDto.Schema);
            }

            if (createFormRequestDto.Settings != null)
            {
                form.Settings = JsonSerializer.Serialize(createFormRequestDto.Settings);
            }

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            // Create initial schema version with the proper FormPageDto structure
            if (createFormRequestDto.Schema != null && createFormRequestDto.Schema.Any())
            {
                var schemaJson = JsonSerializer.Serialize(createFormRequestDto.Schema);
                await CreateSchemaVersionAsync(form.Id, schemaJson, createdBy ?? userId, 1);
            }

            // Reload form with related information
            form = await _context.Forms
                .Include(f => f.Department)
                .Include(f => f.Creator)
                .Include(f => f.FormSubmissions)
                .FirstAsync(f => f.Id == form.Id);

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form created successfully.");
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message ?? "No inner exception";
            _logger.LogError(ex, "Error creating form from request. Inner: {Inner}", innerMsg);
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while creating form: {ex.Message} | Inner: {innerMsg}");
        }
    }

    public async Task<ApiResponse<FormDto>> UpdateFormAsync(Guid id, UpdateFormDto updateFormDto)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.Department)
                .Include(f => f.Creator)
                .Include(f => f.FormSubmissions)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return ApiResponse<FormDto>.ErrorResponse("Form not found.");
            }
            

            // Store the original schema to compare for changes
            var originalSchema = form.FormSchema;

            // Validate JSON before mapping
            if (updateFormDto.FormSchema != null)
            {
                try
                {
                    var jsonString = JsonSerializer.Serialize(updateFormDto.FormSchema);
                    // Test if it's valid JSON by deserializing it
                    JsonSerializer.Deserialize<object>(jsonString);
                }
                catch (JsonException ex)
                {
                    return ApiResponse<FormDto>.ErrorResponse($"Invalid JSON in FormSchema: {ex.Message}");
                }
            }

            if (updateFormDto.Settings != null)
            {
                try
                {
                    var jsonString = JsonSerializer.Serialize(updateFormDto.Settings);
                    // Test if it's valid JSON by deserializing it
                    JsonSerializer.Deserialize<object>(jsonString);
                }
                catch (JsonException ex)
                {
                    return ApiResponse<FormDto>.ErrorResponse($"Invalid JSON in Settings: {ex.Message}");
                }
            }

            _mapper.Map(updateFormDto, form);

            // Ensure Code is always filled after mapping
            if (string.IsNullOrWhiteSpace(form.Code))
            {
                form.Code = await GenerateUniqueFormCodeAsync(form.Name);
            }
            else
            {
                // Check if updated code conflicts with existing forms (excluding current form)
                var codeExists = await _context.Forms.AnyAsync(f => f.Code == form.Code && f.Id != id);
                if (codeExists)
                {
                    form.Code = await GenerateUniqueFormCodeAsync(form.Name, form.Code);
                }
            }

            form.UpdatedAt = DateTimeOffset.UtcNow;

            // Compare after map so we use the same serialized string that is persisted (matches FormSchemaVersions)
            var schemaChanged = updateFormDto.FormSchema != null
                && !string.IsNullOrWhiteSpace(form.FormSchema)
                && !string.Equals(form.FormSchema, originalSchema, StringComparison.Ordinal);

            await _context.SaveChangesAsync();

            // Create new schema version if schema has changed
            if (schemaChanged)
            {
                // Get the next version number
                var nextVersion = await GetNextSchemaVersionAsync(form.Id);
                await CreateSchemaVersionAsync(form.Id, form.FormSchema ?? string.Empty, form.CreatedBy, nextVersion);
                
                // Update the form's version field to reflect the latest version
                form.Version = nextVersion;
                await _context.SaveChangesAsync();
            }

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while updating form: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteFormAsync(Guid id)
    {
        try
        {
            var form = await _context.Forms.FindAsync(id);
            if (form == null)
            {
                return ApiResponse<bool>.ErrorResponse("Form not found.");
            }

            // Check if form has submissions
            var hasSubmissions = await _context.FormSubmissions.AnyAsync(fs => fs.FormId == id);
            if (hasSubmissions)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete form with existing submissions. Consider deactivating the form instead.");
            }

            _context.Forms.Remove(form);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Form deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while deleting form: {ex.Message}");
        }
    }

    public async Task<ApiResponse<string>> ToggleFormStatusAsync(Guid id)
    {
        try
        {
            var form = await _context.Forms.FindAsync(id);
            if (form == null)
            {
                return ApiResponse<string>.ErrorResponse("Form not found.");
            }

            // Toggle status: Active -> Inactive, anything else -> Active
            form.Status = form.Status == "Active" ? "Inactive" : "Active";
            form.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            var actionMessage = form.Status == "Active" ? "activated" : "deactivated";
            return ApiResponse<string>.SuccessResponse(form.Status, $"Form {actionMessage} successfully. Current status: {form.Status}");
        }
        catch (Exception ex)
        {
            return ApiResponse<string>.ErrorResponse($"An error occurred while toggling form status: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsAsync(Guid formId, PaginationDto pagination)
    {
        try
        {
            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Where(fs => fs.FormId == formId)
                .AsQueryable();

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

    public async Task<ApiResponse<FormSubmissionDto>> GetFormSubmissionByIdAsync(Guid submissionId)
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

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while retrieving form submission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms.FindAsync(formId);
            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found.");
            }

            if (form.Status != "Active")
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            var submission = _mapper.Map<FormSubmission>(createSubmissionDto);
            submission.FormId = formId;
            submission.SubmittedByUserId = userId;

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload submission with related data
            submission = await _context.FormSubmissions
                .Include(fs => fs.Form)
                .FirstAsync(fs => fs.Id == submission.Id);

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithFilesAsync(Guid formId, CreateFormSubmissionWithFilesDto createSubmissionDto, Guid? userId = null)
    {
        try
        {
            var form = await _context.Forms.FindAsync(formId);
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
                responseData = System.Text.Json.JsonSerializer.Deserialize<object>(createSubmissionDto.ResponseDataJson) ?? new object();
            }
            catch (System.Text.Json.JsonException)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Invalid JSON format in response data.");
            }

            // Validate R2 URLs in the response data (if any)
            var validationResult = ValidateR2UrlsInResponseData(createSubmissionDto.ResponseDataJson);
            if (!validationResult.IsValid)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse($"File URL validation failed: {validationResult.ErrorMessage}");
            }

            // Create the form submission (R2 URLs are already in the response data)
            var submission = new FormSubmission
            {
                FormId = formId,
                ResponseData = createSubmissionDto.ResponseDataJson,
                FormVersion = createSubmissionDto.FormVersion,
                SubmitterIp = !string.IsNullOrEmpty(createSubmissionDto.SubmitterIp) && System.Net.IPAddress.TryParse(createSubmissionDto.SubmitterIp, out var ip) ? ip : null,
                SubmitterEmail = createSubmissionDto.SubmitterEmail,
                SubmittedByUserId = userId,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload submission with related data
            submission = await _context.FormSubmissions
                .Include(fs => fs.Form)
                .FirstAsync(fs => fs.Id == submission.Id);

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
            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseDataJson);
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

    public async Task<ApiResponse<List<FormPermissionDto>>> GetFormPermissionsAsync(Guid formId)
    {
        try
        {
            var permissions = await _context.FormPermissions
                .Include(fp => fp.Form)
                .Include(fp => fp.User)
                .Where(fp => fp.FormId == formId)
                .OrderBy(fp => fp.User.Name)
                .ThenBy(fp => fp.Permission)
                .ToListAsync();

            var permissionDtos = _mapper.Map<List<FormPermissionDto>>(permissions);
            return ApiResponse<List<FormPermissionDto>>.SuccessResponse(permissionDtos, "Form permissions retrieved successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<FormPermissionDto>>.ErrorResponse($"An error occurred while retrieving form permissions: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormPermissionDto>> AddFormPermissionAsync(Guid formId, CreateFormPermissionDto createPermissionDto)
    {
        try
        {
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "read", "write", "admin", "search_inquiry", "archivist"
            };
            if (string.IsNullOrWhiteSpace(createPermissionDto.Permission) ||
                !allowed.Contains(createPermissionDto.Permission.Trim()))
            {
                return ApiResponse<FormPermissionDto>.ErrorResponse(
                    "Invalid permission. Allowed: read, write, admin, search_inquiry (بحث واستعلام), archivist (مؤرشف).");
            }

            createPermissionDto.Permission = createPermissionDto.Permission.Trim().ToLowerInvariant();

            var form = await _context.Forms.FindAsync(formId);
            if (form == null)
            {
                return ApiResponse<FormPermissionDto>.ErrorResponse("Form not found.");
            }

            var user = await _context.Users.FindAsync(createPermissionDto.UserId);
            if (user == null)
            {
                return ApiResponse<FormPermissionDto>.ErrorResponse("User not found.");
            }

            // Check if permission already exists
            var existingPermission = await _context.FormPermissions
                .FirstOrDefaultAsync(fp => fp.FormId == formId && fp.UserId == createPermissionDto.UserId && fp.Permission == createPermissionDto.Permission);
            if (existingPermission != null)
            {
                return ApiResponse<FormPermissionDto>.ErrorResponse("User already has this permission for this form.");
            }

            var formPermission = _mapper.Map<FormPermission>(createPermissionDto);
            formPermission.FormId = formId;

            _context.FormPermissions.Add(formPermission);
            await _context.SaveChangesAsync();

            // Reload with related data
            formPermission = await _context.FormPermissions
                .Include(fp => fp.Form)
                .Include(fp => fp.User)
                .FirstAsync(fp => fp.Id == formPermission.Id);

            var permissionDto = _mapper.Map<FormPermissionDto>(formPermission);
            return ApiResponse<FormPermissionDto>.SuccessResponse(permissionDto, "Form permission added successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormPermissionDto>.ErrorResponse($"An error occurred while adding form permission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> RemoveFormPermissionAsync(Guid formId, Guid userId, string permission)
    {
        try
        {
            var formPermission = await _context.FormPermissions
                .FirstOrDefaultAsync(fp => fp.FormId == formId && fp.UserId == userId && fp.Permission == permission);

            if (formPermission == null)
            {
                return ApiResponse<bool>.ErrorResponse("Form permission not found.");
            }

            _context.FormPermissions.Remove(formPermission);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Form permission removed successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while removing form permission: {ex.Message}");
        }
    }

    /// <summary>
    /// Generates new UUIDs for all form fields, pages, and options (overrides existing IDs)
    /// </summary>
    /// <param name="schema">The form schema containing pages and fields</param>
    private void GenerateFieldIds(List<FormPageDto> schema)
    {
        if (schema == null) return;

        foreach (var page in schema)
        {
            // Always generate new UUID for page (overrides existing ID)
            page.Id = Guid.NewGuid().ToString();

            // Generate new UUIDs for all fields (overrides existing IDs)
            if (page.Fields != null)
            {
                foreach (var field in page.Fields)
                {
                    // Always generate new UUID for field (overrides existing ID)
                    field.Id = Guid.NewGuid().ToString();

                    // Generate new UUIDs for all field options (overrides existing IDs)
                    if (field.Properties?.Options != null)
                    {
                        foreach (var option in field.Properties.Options)
                        {
                            // Always generate new UUID for option (overrides existing ID)
                            option.Id = Guid.NewGuid().ToString();
                        }
                    }
                }
            }
        }
    }

    /// <summary>
    /// Creates a new schema version for a form
    /// </summary>
    /// <param name="formId">The form ID</param>
    /// <param name="schemaData">The schema data as JSON string</param>
    /// <param name="createdBy">The user who created this version</param>
    /// <param name="versionNumber">The version number</param>
    private async Task CreateSchemaVersionAsync(Guid formId, string schemaData, Guid? createdBy, int versionNumber)
    {
        var schemaVersion = new FormSchemaVersion
        {
            FormId = formId,
            VersionNumber = versionNumber,
            SchemaData = schemaData,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.FormSchemaVersions.Add(schemaVersion);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Gets the next version number for a form's schema
    /// </summary>
    /// <param name="formId">The form ID</param>
    /// <returns>The next version number</returns>
    private async Task<int> GetNextSchemaVersionAsync(Guid formId)
    {
        var maxVersion = await _context.FormSchemaVersions
            .Where(fsv => fsv.FormId == formId)
            .MaxAsync(fsv => (int?)fsv.VersionNumber) ?? 0;

        return maxVersion + 1;
    }

    public async Task<ApiResponse<FormPreviewDto>> GetFormPreviewAsync(Guid id)
    {
        try
        {
            var form = await _context.Forms
                .Where(f => f.Id == id && f.Status == "Active") 
                .FirstOrDefaultAsync();

            if (form == null)
            {
                return ApiResponse<FormPreviewDto>.ErrorResponse("Form not found or not available for preview.");
            }

            var formPreviewDto = _mapper.Map<FormPreviewDto>(form);
            return ApiResponse<FormPreviewDto>.SuccessResponse(formPreviewDto, "Form preview retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving form preview for ID: {FormId}", id);
            return ApiResponse<FormPreviewDto>.ErrorResponse($"Error retrieving form preview: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormPreviewDto>> GetFormPreviewAsync(string idOrCode)
    {
        try
        {
            Form? form = null;

            // Try to parse as GUID first
            if (Guid.TryParse(idOrCode, out Guid id))
            {
                form = await _context.Forms
                    .Where(f => f.Id == id && f.Status == "Active")
                    .FirstOrDefaultAsync();
            }
            
            // If not found by ID or not a valid GUID, try by code
            if (form == null)
            {
                form = await _context.Forms
                    .Where(f => f.Code == idOrCode && f.Status == "Active")
                    .FirstOrDefaultAsync();
            }

            if (form == null)
            {
                // Log warning for debugging (server-side only)
                _logger.LogWarning("Form with ID/Code '{IdOrCode}' not found or not active", idOrCode);
                
                // Return generic error message without exposing sensitive information
                return ApiResponse<FormPreviewDto>.ErrorResponse("Form not found or not available for public access.");
            }

            var formPreviewDto = _mapper.Map<FormPreviewDto>(form);
            return ApiResponse<FormPreviewDto>.SuccessResponse(formPreviewDto, "Form preview retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving form preview for ID/Code: {IdOrCode}", idOrCode);
            return ApiResponse<FormPreviewDto>.ErrorResponse($"Error retrieving form preview: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormPreviewDto>> GetFormPreviewByCodeAsync(string code)
    {
        try
        {
            // First, check if any form exists with this code (regardless of status)
            var anyForm = await _context.Forms
                .Where(f => f.Code == code)
                .FirstOrDefaultAsync();

            if (anyForm == null)
            {
                // Log warning for debugging (server-side only)
                _logger.LogWarning("Form with code '{FormCode}' not found", code);
                
                // Return generic error message without exposing sensitive information
                return ApiResponse<FormPreviewDto>.ErrorResponse("Form not found or not available for public access.");
            }

            // Check if the form is active
            if (anyForm.Status != "Active")
            {
                _logger.LogWarning("Form with code '{FormCode}' exists but is not active. Status: {Status}", 
                    code, anyForm.Status);
                
                return ApiResponse<FormPreviewDto>.ErrorResponse($"Form with code '{code}' is not active (Status: {anyForm.Status}).");
            }

            var formPreviewDto = _mapper.Map<FormPreviewDto>(anyForm);
            return ApiResponse<FormPreviewDto>.SuccessResponse(formPreviewDto, "Form preview retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving form preview for code: {FormCode}", code);
            return ApiResponse<FormPreviewDto>.ErrorResponse($"Error retrieving form preview: {ex.Message}");
        }
    }

    /// <summary>
    /// Generates a unique form code based on the form name
    /// </summary>
    /// <param name="formName">The name of the form</param>
    /// <param name="preferredCode">Optional preferred code to try first</param>
    /// <returns>A unique form code</returns>
    private async Task<string> GenerateUniqueFormCodeAsync(string formName, string? preferredCode = null)
    {
        // If a preferred code is provided, try it first
        if (!string.IsNullOrWhiteSpace(preferredCode))
        {
            var preferredCodeExists = await _context.Forms.AnyAsync(f => f.Code == preferredCode);
            if (!preferredCodeExists)
            {
                return preferredCode;
            }
        }

        // Generate base code from form name
        var baseCode = GenerateCodeFromName(formName);
        
        // Check if base code is unique
        var codeExists = await _context.Forms.AnyAsync(f => f.Code == baseCode);
        if (!codeExists)
        {
            return baseCode;
        }

        // If base code exists, append numbers until we find a unique one
        var counter = 1;
        string uniqueCode;
        do
        {
            uniqueCode = $"{baseCode}_{counter}";
            codeExists = await _context.Forms.AnyAsync(f => f.Code == uniqueCode);
            counter++;
        } while (codeExists && counter <= 1000); // Prevent infinite loop

        return uniqueCode;
    }

    /// <summary>
    /// Generates a code from form name by removing special characters and converting to uppercase
    /// </summary>
    /// <param name="formName">The form name</param>
    /// <returns>A clean code string</returns>
    private static string GenerateCodeFromName(string formName)
    {
        if (string.IsNullOrWhiteSpace(formName))
        {
            return $"FORM_{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
        }

        // Remove special characters and replace spaces with underscores
        var code = System.Text.RegularExpressions.Regex.Replace(formName, @"[^a-zA-Z0-9\s]", "");
        code = System.Text.RegularExpressions.Regex.Replace(code, @"\s+", "_");
        code = code.ToUpper().Trim('_');

        // Ensure code is not empty and has reasonable length
        if (string.IsNullOrWhiteSpace(code))
        {
            code = $"FORM_{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
        }
        else if (code.Length > 50)
        {
            code = code[..50].TrimEnd('_');
        }
        else if (code.Length < 3)
        {
            code = $"{code}_FORM";
        }

        return code;
    }
}
