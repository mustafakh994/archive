using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

public interface IFormService
{
    Task<ApiResponse<PagedResult<FormDto>>> GetFormsAsync(PaginationDto pagination, Guid? departmentId = null, Guid? archivistUserId = null);

    /// <summary>Archivist may access a form if it is assigned via FormPermissions, or they created it and have individual CreateFormTemplate permission.</summary>
    Task<bool> CanArchivistAccessFormAsync(Guid userId, Guid formId);
    Task<ApiResponse<FormDto>> GetFormByIdAsync(Guid id);
    Task<ApiResponse<FormDto>> CreateFormAsync(CreateFormDto createFormDto, Guid departmentId, Guid? createdBy = null);
    Task<ApiResponse<FormDto>> CreateFormFromRequestAsync(CreateFormRequestDto createFormRequestDto, Guid? createdBy = null);
    Task<ApiResponse<FormDto>> UpdateFormAsync(Guid id, UpdateFormDto updateFormDto);
    Task<ApiResponse<bool>> DeleteFormAsync(Guid id);
    Task<ApiResponse<string>> ToggleFormStatusAsync(Guid id);
    Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsAsync(Guid formId, PaginationDto pagination);
    Task<ApiResponse<FormSubmissionDto>> GetFormSubmissionByIdAsync(Guid submissionId);
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null);
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithFilesAsync(Guid formId, CreateFormSubmissionWithFilesDto createSubmissionDto, Guid? userId = null);
    Task<ApiResponse<bool>> DeleteFormSubmissionAsync(Guid submissionId);
    Task<ApiResponse<List<FormPermissionDto>>> GetFormPermissionsAsync(Guid formId);
    /// <summary>All form permission rows for a user, optionally restricted to one department (forms in that department).</summary>
    Task<ApiResponse<List<FormPermissionDto>>> GetFormPermissionsForUserAsync(Guid userId, Guid? restrictToDepartmentId);
    Task<ApiResponse<FormPermissionDto>> AddFormPermissionAsync(Guid formId, CreateFormPermissionDto createPermissionDto);
    Task<ApiResponse<bool>> RemoveFormPermissionAsync(Guid formId, Guid userId, string permission);
    
    // Guest preview methods
    Task<ApiResponse<FormPreviewDto>> GetFormPreviewAsync(Guid id);
    Task<ApiResponse<FormPreviewDto>> GetFormPreviewAsync(string idOrCode);
    Task<ApiResponse<FormPreviewDto>> GetFormPreviewByCodeAsync(string code);
}