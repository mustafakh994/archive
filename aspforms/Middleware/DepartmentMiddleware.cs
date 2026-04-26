using System;
using System.Security.Claims;

namespace FormsManagementApi.Middleware;

public class DepartmentMiddleware
{
    private readonly RequestDelegate _next;

    public DepartmentMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract department information from JWT token
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var departmentIdClaim = context.User.FindFirst("DepartmentId");
            var roleClaim = context.User.FindFirst(ClaimTypes.Role);

            if (departmentIdClaim != null && Guid.TryParse(departmentIdClaim.Value, out Guid departmentId))
            {
                context.Items["DepartmentId"] = departmentId;
            }

            if (roleClaim != null)
            {
                context.Items["UserRole"] = roleClaim.Value;
            }

            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out Guid userId))
            {
                context.Items["UserId"] = userId;
            }
        }

        await _next(context);
    }
}

public static class DepartmentMiddlewareExtensions
{
    public static IApplicationBuilder UseDepartmentMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<DepartmentMiddleware>();
    }
}

public static class HttpContextExtensions
{
    private static readonly Guid LegacySuperAdminUserId = Guid.Parse("50000000-0000-0000-0000-000000000001");

    public static Guid? GetDepartmentId(this HttpContext context)
    {
        return context.Items.TryGetValue("DepartmentId", out var departmentId) ? (Guid?)departmentId : null;
    }

    // Backward compatibility - maps to GetDepartmentId
    public static Guid? GetTenantId(this HttpContext context)
    {
        return context.GetDepartmentId();
    }

    public static string? GetUserRole(this HttpContext context)
    {
        return context.Items.TryGetValue("UserRole", out var role) ? role?.ToString() : null;
    }

    public static Guid? GetUserId(this HttpContext context)
    {
        return context.Items.TryGetValue("UserId", out var userId) ? (Guid?)userId : null;
    }

    public static bool IsSuperAdmin(this HttpContext context)
    {
        var role = context.GetUserRole();
        if (!string.IsNullOrEmpty(role) && string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var userId = context.GetUserId();
        return userId.HasValue && userId.Value == LegacySuperAdminUserId;
    }

    public static bool IsDepartmentAdmin(this HttpContext context)
    {
        var role = context.GetUserRole();
        if (string.IsNullOrEmpty(role))
        {
            return false;
        }

        return string.Equals(role, "DepartmentAdmin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "DepartmentManager", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "Department Manager", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>مؤرشف — department archivist; uses only forms assigned via FormPermissions unless granted individual CreateFormTemplate.</summary>
    public static bool IsArchivist(this HttpContext context)
    {
        var role = context.GetUserRole();
        return !string.IsNullOrEmpty(role) && string.Equals(role, "Archivist", StringComparison.OrdinalIgnoreCase);
    }

    // Backward compatibility - maps to IsDepartmentAdmin
    public static bool IsTenantAdmin(this HttpContext context)
    {
        return context.IsDepartmentAdmin();
    }
}
