using AutoMapper;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using System.Text.Json;

namespace FormsManagementApi.Configuration;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        // User mappings
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department != null ? src.Department.Name : null))
            .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role != null ? src.Role.Name : null))
            .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role != null ? new RoleInfoDto { Id = src.Role.Id, Name = src.Role.Name } : null))
            .ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.UserPermissions.Select(p => p.Permission).ToList()));

        CreateMap<CreateUserDto, User>()
            .ForMember(dest => dest.PasswordHash, opt => opt.MapFrom(src => HashPassword(src.Password)))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.UserPermissions, opt => opt.Ignore());

        CreateMap<UpdateUserDto, User>()
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.UserPermissions, opt => opt.Ignore())
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

        // Department mappings
        CreateMap<Department, DepartmentDto>()
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => DeserializeJson(src.Settings ?? string.Empty)))
            .ForMember(dest => dest.UserCount, opt => opt.MapFrom(src => src.Users.Count))
            .ForMember(dest => dest.FormCount, opt => opt.MapFrom(src => src.Forms.Count));

        CreateMap<CreateDepartmentDto, Department>()
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => SerializeJson(src.Settings)))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.Id, opt => opt.Ignore());

        CreateMap<UpdateDepartmentDto, Department>()
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => SerializeJson(src.Settings)))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Id, opt => opt.Ignore());

        // Role mappings
        CreateMap<Role, RoleDto>()
            .ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.RolePermissions.Select(rp => rp.Permission).ToList()));

        CreateMap<CreateRoleDto, Role>()
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.RolePermissions, opt => opt.Ignore());

        CreateMap<UpdateRoleDto, Role>()
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.DepartmentId, opt => opt.Ignore())
            .ForMember(dest => dest.RolePermissions, opt => opt.Ignore());

        // Permission mappings
        CreateMap<Permission, PermissionDto>();

        CreateMap<CreatePermissionDto, Permission>()
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.Id, opt => opt.Ignore());

        CreateMap<UpdatePermissionDto, Permission>()
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.DepartmentId, opt => opt.Ignore());

        // Assignment mappings
        CreateMap<Assignment, AssignmentDto>()
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User != null ? src.User.Name : null))
            .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : null))
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department != null ? src.Department.Name : null))
            .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role != null ? src.Role.Name : null));

        CreateMap<CreateAssignmentDto, Assignment>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.Department, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore());

        CreateMap<UpdateAssignmentDto, Assignment>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.Department, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore());

        // Form mappings
        CreateMap<Form, FormDto>()
            .ForMember(dest => dest.FormSchema, opt => opt.MapFrom(src => DeserializeJson(src.FormSchema ?? string.Empty)))
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => DeserializeJson(src.Settings ?? string.Empty)))
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department.Name))
            .ForMember(dest => dest.CreatorName, opt => opt.MapFrom(src => src.Creator != null ? src.Creator.Name : null))
            .ForMember(dest => dest.SubmissionCount, opt => opt.MapFrom(src => src.FormSubmissions.Count));

        CreateMap<CreateFormDto, Form>()
            .ForMember(dest => dest.FormSchema, opt => opt.MapFrom(src => SerializeJson(src.FormSchema ?? string.Empty)))
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => SerializeJson(src.Settings ?? string.Empty)))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => !string.IsNullOrWhiteSpace(src.Status) ? src.Status : "Active"));

        // Only overwrite JSON columns when the client sends them. Mapping null/omitted FormSchema
        // used to become SerializeJson(null) -> empty string and wiped the database schema on any partial PUT.
        CreateMap<UpdateFormDto, Form>()
            .ForMember(dest => dest.FormSchema, opt =>
            {
                opt.Condition(src => src.FormSchema != null);
                opt.MapFrom(src => SerializeJson(src.FormSchema));
            })
            .ForMember(dest => dest.Settings, opt =>
            {
                opt.Condition(src => src.Settings != null);
                opt.MapFrom(src => SerializeJson(src.Settings));
            })
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.DepartmentId, opt => opt.Ignore());

        // FormSubmission mappings
        CreateMap<FormSubmission, FormSubmissionDto>()
            .ForMember(dest => dest.ResponseData, opt => opt.MapFrom(src => DeserializeJson(src.ResponseData)))
            .ForMember(dest => dest.FormName, opt => opt.MapFrom(src => src.Form.Name))
            .ForMember(dest => dest.SubmitterIp, opt => opt.MapFrom(src => src.SubmitterIp != null ? src.SubmitterIp.ToString() : null));

        CreateMap<CreateFormSubmissionDto, FormSubmission>()
            .ForMember(dest => dest.ResponseData, opt => opt.MapFrom(src => SerializeJson(src.ResponseData)))
            .ForMember(dest => dest.SubmittedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.SubmitterIp, opt => opt.MapFrom(src => ParseIpAddress(src.SubmitterIp)))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.FormId, opt => opt.Ignore())
            .ForMember(dest => dest.Form, opt => opt.Ignore());

        // UserPermission mappings
        CreateMap<UserPermission, UserPermissionDto>();

        // FormPermission mappings
        CreateMap<FormPermission, FormPermissionDto>()
            .ForMember(dest => dest.FormTitle, opt => opt.MapFrom(src => src.Form.Title))
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User.Name));

        CreateMap<CreateFormPermissionDto, FormPermission>()
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow));

        // WebhookEndpoint mappings
        CreateMap<WebhookEndpoint, WebhookEndpointDto>()
            .ForMember(dest => dest.Headers, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.Headers) ? DeserializeJson(src.Headers) : null))
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department.Name));

        CreateMap<CreateWebhookEndpointDto, WebhookEndpoint>()
            .ForMember(dest => dest.Headers, opt => opt.MapFrom(src => src.Headers != null ? SerializeJson(src.Headers) : null))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow));

        CreateMap<UpdateWebhookEndpointDto, WebhookEndpoint>()
            .ForMember(dest => dest.Headers, opt => opt.MapFrom(src => src.Headers != null ? SerializeJson(src.Headers) : null))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.DepartmentId, opt => opt.Ignore());

        // FormSchemaVersion mappings
        CreateMap<FormSchemaVersion, FormSchemaVersionDto>()
            .ForMember(dest => dest.SchemaData, opt => opt.MapFrom(src => DeserializeJson(src.SchemaData)))
            .ForMember(dest => dest.CreatorName, opt => opt.MapFrom(src => src.Creator != null ? src.Creator.Name : null));

        // FormPreview mappings (for guest access)
        CreateMap<Form, FormPreviewDto>()
            .ForMember(dest => dest.FormSchema, opt => opt.MapFrom(src => DeserializeJson(src.FormSchema ?? string.Empty)))
            .ForMember(dest => dest.Settings, opt => opt.MapFrom(src => DeserializeJson(src.Settings ?? string.Empty)))
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.Status == "Active"))
            .ForMember(dest => dest.AllowAnonymousSubmissions, opt => opt.MapFrom(src => 
                src.Settings != null && src.Settings.Contains("\"allowAnonymousSubmissions\":true")));

        // FileAttachment mappings
        CreateMap<FileAttachment, FileInfoDto>()
            .ForMember(dest => dest.UploaderName, opt => opt.MapFrom(src => src.Uploader != null ? src.Uploader.Name : null))
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department != null ? src.Department.Name : null))
            .ForMember(dest => dest.DownloadUrl, opt => opt.Ignore()); // Set manually in service

        CreateMap<CreateFileDto, FileAttachment>()
            .ForMember(dest => dest.UploadedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
            .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(src => false));

        // Export-related mappings (Note: Most export DTOs are constructed programmatically in services)
        // These mappings are primarily for completeness and potential future use
        CreateMap<FormSubmission, Dictionary<string, object>>()
            .ConvertUsing((src, dest, context) => 
            {
                // This is handled programmatically in ExportTransformationService
                // but included for AutoMapper completeness
                var result = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(src.ResponseData))
                {
                    try
                    {
                        var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(src.ResponseData);
                        if (responseData != null)
                        {
                            foreach (var kvp in responseData)
                            {
                                result[kvp.Key] = kvp.Value;
                            }
                        }
                    }
                    catch
                    {
                        // If deserialization fails, skip response data
                    }
                }
                return result;
            });
    }

    private static object? DeserializeJson(string json)
    {
        if (string.IsNullOrEmpty(json))
            return null;
        
        try
        {
            return JsonSerializer.Deserialize<object>(json);
        }
        catch
        {
            return json; // Return as string if deserialization fails
        }
    }

    private static string SerializeJson(object? obj)
    {
        if (obj == null)
            return string.Empty;
        
        // If it's already a string, return it as is (it might already be JSON)
        if (obj is string str)
        {
            // If it's already valid JSON, return it
            if (IsValidJson(str))
                return str;
            
            // If it's not valid JSON, try to serialize it
            try
            {
                return JsonSerializer.Serialize(str);
            }
            catch
            {
                return str;
            }
        }
        
        try
        {
            return JsonSerializer.Serialize(obj);
        }
        catch
        {
            return obj.ToString() ?? string.Empty;
        }
    }

    private static bool IsValidJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return false;
        
        try
        {
            JsonSerializer.Deserialize<object>(json);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, 12);
    }

    private static System.Net.IPAddress? ParseIpAddress(string? ipString)
    {
        if (string.IsNullOrWhiteSpace(ipString))
            return null;
        
        if (System.Net.IPAddress.TryParse(ipString, out var ipAddress))
            return ipAddress;
        
        return null;
    }
}