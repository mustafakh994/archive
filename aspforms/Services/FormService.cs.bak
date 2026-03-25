using Microsoft.EntityFrameworkCore;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;

namespace FormsManagementApi.Services;

public class FormService : IFormService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public FormService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedResult<FormDto>>> GetFormsAsync(PaginationDto pagination, int? tenantId = null)
    {
        try
        {
            var query = _context.Forms
                .Include(f => f.Tenant)
                .Include(f => f.FormSubmissions)
                .AsQueryable();

            // Filter by tenant if specified
            if (tenantId.HasValue)
            {
                query = query.Where(f => f.TenantId == tenantId.Value);
            }

            if (!string.IsNullOrEmpty(pagination.Search))
            {
                query = query.Where(f => f.Name.Contains(pagination.Search) || 
                                       (f.Description != null && f.Description.Contains(pagination.Search)));
            }

            // Apply sorting
            if (!string.IsNullOrEmpty(pagination.SortBy))
            {
                switch (pagination.SortBy.ToLower())
                {
                    case "name":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.Name) : query.OrderBy(f => f.Name);
                        break;
                    case "createdat":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.CreatedAt) : query.OrderBy(f => f.CreatedAt);
                        break;
                    case "isactive":
                        query = pagination.SortDescending ? query.OrderByDescending(f => f.IsActive) : query.OrderBy(f => f.IsActive);
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

    public async Task<ApiResponse<FormDto>> GetFormByIdAsync(int id)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.Tenant)
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

    public async Task<ApiResponse<FormDto>> CreateFormAsync(CreateFormDto createFormDto, int tenantId)
    {
        try
        {
            // Validate tenant
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null || !tenant.IsActive)
            {
                return ApiResponse<FormDto>.ErrorResponse("Invalid or inactive tenant.");
            }

            var form = _mapper.Map<Form>(createFormDto);
            form.TenantId = tenantId;

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            // Reload form with tenant information
            form = await _context.Forms
                .Include(f => f.Tenant)
                .Include(f => f.FormSubmissions)
                .FirstAsync(f => f.Id == form.Id);

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while creating form: {ex.Message}");
        }
    }

    public async Task<ApiResponse<FormDto>> UpdateFormAsync(int id, UpdateFormDto updateFormDto)
    {
        try
        {
            var form = await _context.Forms
                .Include(f => f.Tenant)
                .Include(f => f.FormSubmissions)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return ApiResponse<FormDto>.ErrorResponse("Form not found.");
            }

            _mapper.Map(updateFormDto, form);
            await _context.SaveChangesAsync();

            var formDto = _mapper.Map<FormDto>(form);
            return ApiResponse<FormDto>.SuccessResponse(formDto, "Form updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormDto>.ErrorResponse($"An error occurred while updating form: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteFormAsync(int id)
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

    public async Task<ApiResponse<bool>> ToggleFormStatusAsync(int id)
    {
        try
        {
            var form = await _context.Forms.FindAsync(id);
            if (form == null)
            {
                return ApiResponse<bool>.ErrorResponse("Form not found.");
            }

            form.IsActive = !form.IsActive;
            form.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var status = form.IsActive ? "activated" : "deactivated";
            return ApiResponse<bool>.SuccessResponse(true, $"Form {status} successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.ErrorResponse($"An error occurred while toggling form status: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsAsync(int formId, PaginationDto pagination)
    {
        try
        {
            var query = _context.FormSubmissions
                .Include(fs => fs.Form)
                .Include(fs => fs.User)
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
                    case "username":
                        query = pagination.SortDescending ? query.OrderByDescending(fs => fs.User!.Name) : query.OrderBy(fs => fs.User!.Name);
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

    public async Task<ApiResponse<FormSubmissionDto>> GetFormSubmissionByIdAsync(int submissionId)
    {
        try
        {
            var submission = await _context.FormSubmissions
                .Include(fs => fs.Form)
                .Include(fs => fs.User)
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

    public async Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionAsync(int formId, CreateFormSubmissionDto createSubmissionDto, int? userId = null)
    {
        try
        {
            var form = await _context.Forms.FindAsync(formId);
            if (form == null)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form not found.");
            }

            if (!form.IsActive)
            {
                return ApiResponse<FormSubmissionDto>.ErrorResponse("Form is not active and cannot accept submissions.");
            }

            var submission = _mapper.Map<FormSubmission>(createSubmissionDto);
            submission.FormId = formId;
            submission.UserId = userId;

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Reload submission with related data
            submission = await _context.FormSubmissions
                .Include(fs => fs.Form)
                .Include(fs => fs.User)
                .FirstAsync(fs => fs.Id == submission.Id);

            var submissionDto = _mapper.Map<FormSubmissionDto>(submission);
            return ApiResponse<FormSubmissionDto>.SuccessResponse(submissionDto, "Form submission created successfully.");
        }
        catch (Exception ex)
        {
            return ApiResponse<FormSubmissionDto>.ErrorResponse($"An error occurred while creating form submission: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteFormSubmissionAsync(int submissionId)
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

    public async Task<ApiResponse<List<FormPermissionDto>>> GetFormPermissionsAsync(int formId)
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

    public async Task<ApiResponse<FormPermissionDto>> AddFormPermissionAsync(int formId, CreateFormPermissionDto createPermissionDto)
    {
        try
        {
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

    public async Task<ApiResponse<bool>> RemoveFormPermissionAsync(int formId, int userId, string permission)
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
}