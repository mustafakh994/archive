using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services;

/// <summary>
/// Interface for managing form submissions with support for multiple form schema versions.
/// This interface defines operations for CRUD operations on form submissions, version-specific submissions,
/// schema validation, and analytics related to form submissions across different schema versions.
/// </summary>
public interface IFormSubmissionService
{
    // Form submission CRUD operations
    /// <summary>Retrieves all form submissions across all forms with optional department and form filtering.</summary>
    Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetAllSubmissionsAsync(PaginationDto pagination, Guid? departmentId = null, Guid? formId = null);
    
    /// <summary>Performs an advanced search on form submissions with multiple filters.</summary>
    Task<ApiResponse<PagedResult<FormSubmissionDto>>> AdvancedSearchAsync(AdvancedSearchDto searchDto, Guid? departmentId = null);
    
    /// <summary>Retrieves a paginated list of form submissions for a specific form with search and sorting capabilities.</summary>
    Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsAsync(Guid formId, PaginationDto pagination);
    
    /// <summary>Retrieves a specific form submission by its unique identifier.</summary>
    Task<ApiResponse<FormSubmissionDto>> GetFormSubmissionByIdAsync(Guid submissionId);
    
    /// <summary>Creates a new form submission using specified or default version.</summary>
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null);
    
    /// <summary>Creates a new form submission with file attachments.</summary>
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithFilesAsync(Guid formId, CreateFormSubmissionWithFilesDto createSubmissionDto, Guid? userId = null);
    
    /// <summary>Deletes a form submission by its unique identifier.</summary>
    Task<ApiResponse<bool>> DeleteFormSubmissionAsync(Guid submissionId);
    
    // Version-specific operations
    /// <summary>Retrieves form submissions filtered by a specific schema version.</summary>
    Task<ApiResponse<PagedResult<FormSubmissionDto>>> GetFormSubmissionsByVersionAsync(Guid formId, int versionNumber, PaginationDto pagination);
    
    /// <summary>Creates a form submission using a specific schema version.</summary>
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithVersionAsync(Guid formId, int versionNumber, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null);
    
    /// <summary>Creates a form submission using the latest available schema version.</summary>
    Task<ApiResponse<FormSubmissionDto>> CreateFormSubmissionWithLatestVersionAsync(Guid formId, CreateFormSubmissionDto createSubmissionDto, Guid? userId = null);
    
    // Schema version operations
    /// <summary>Retrieves all schema versions for a specific form.</summary>
    Task<ApiResponse<List<FormSchemaVersionDto>>> GetFormSchemaVersionsAsync(Guid formId);
    
    /// <summary>Retrieves a specific schema version for a form.</summary>
    Task<ApiResponse<FormSchemaVersionDto>> GetFormSchemaVersionAsync(Guid formId, int versionNumber);
    
    /// <summary>Retrieves the latest schema version for a form.</summary>
    Task<ApiResponse<FormSchemaVersionDto>> GetLatestFormSchemaVersionAsync(Guid formId);
    
    // Validation operations
    /// <summary>Validates submission data against a specific schema version.</summary>
    Task<ApiResponse<bool>> ValidateSubmissionAgainstSchemaAsync(Guid formId, int versionNumber, object responseData);
    
    /// <summary>Validates submission data against the latest schema version.</summary>
    Task<ApiResponse<bool>> ValidateSubmissionAgainstLatestSchemaAsync(Guid formId, object responseData);
    
    // Analytics and reporting
    /// <summary>Retrieves submission counts grouped by schema version.</summary>
    Task<ApiResponse<Dictionary<int, int>>> GetSubmissionCountByVersionAsync(Guid formId);
    
    /// <summary>Retrieves the most recent form submissions for a form.</summary>
    Task<ApiResponse<List<FormSubmissionDto>>> GetRecentSubmissionsAsync(Guid formId, int count = 10);
    
    // Export operations
    /// <summary>Retrieves form submissions for export with filtering and transformation.</summary>
    Task<ApiResponse<ExportDataDto>> GetFormSubmissionsForExportAsync(Guid formId, ExportFilterDto filters, List<string> selectedFields, ExportMetadataDto metadata);
    
    /// <summary>Retrieves form field definitions for export configuration.</summary>
    Task<ApiResponse<FormFieldDefinitionDto[]>> GetFormFieldDefinitionsAsync(Guid formId);
}
