using FormsManagementApi.Data;
using FormsManagementApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FormsManagementApi.Services;

/// <summary>
/// Ensures each department has standard roles (SuperAdmin, DepartmentAdmin, Archivist) and
/// the CreateFormTemplate permission used for archivist exceptions. Run at startup for all
/// departments and immediately after creating a new department.
/// </summary>
public static class DepartmentInfrastructureInitializer
{
    public static async Task EnsureDepartmentAsync(ApplicationDbContext context, Guid departmentId, ILogger logger)
    {
        var exists = await context.Departments.AnyAsync(d => d.Id == departmentId);
        if (!exists)
        {
            logger.LogWarning("DepartmentInfrastructureInitializer: department {DepartmentId} not found.", departmentId);
            return;
        }

        var utcNow = DateTimeOffset.UtcNow;
        var rolesAdded = 0;
        var permsAdded = 0;

        // Use plain equality — EF Core cannot translate string.Equals(..., StringComparison).
        if (!await context.Roles.AnyAsync(r =>
                r.DepartmentId == departmentId &&
                r.Name == "SuperAdmin"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                DepartmentId = departmentId,
                Name = "SuperAdmin",
                DisplayName = "Super Administrator",
                Description = "System-wide administrative access with full permissions",
                IsSystemRole = true,
                IsActive = true,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            });
            rolesAdded++;
        }

        if (!await context.Roles.AnyAsync(r =>
                r.DepartmentId == departmentId &&
                r.Name == "DepartmentAdmin"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                DepartmentId = departmentId,
                Name = "DepartmentAdmin",
                DisplayName = "Department Administrator",
                Description = "Department-level administrative access",
                IsSystemRole = true,
                IsActive = true,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            });
            rolesAdded++;
        }

        if (!await context.Roles.AnyAsync(r =>
                r.DepartmentId == departmentId &&
                r.Name == "Archivist"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                DepartmentId = departmentId,
                Name = "Archivist",
                DisplayName = "مؤرشف",
                Description =
                    "أرشفة الوثائق للقوالب المسندة من مدير القسم أو الإدارة فقط. إنشاء قوالب جديدة يتطلب صلاحية فردية CreateFormTemplate.",
                IsSystemRole = true,
                IsActive = true,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            });
            rolesAdded++;
        }

        if (!await context.Permissions.AnyAsync(p =>
                p.DepartmentId == departmentId && p.Name == "CreateFormTemplate"))
        {
            context.Permissions.Add(new Permission
            {
                Id = Guid.NewGuid(),
                DepartmentId = departmentId,
                Name = "CreateFormTemplate",
                DisplayName = "إنشاء قالب جديد (صلاحية فردية)",
                Description =
                    "استثناء فردي: يسمح لمستخدم بدور مؤرشف بإنشاء قوالب جديدة في القسم دون منح ذلك لجميع المؤرشفين.",
                Resource = "Forms",
                Action = "CreateTemplate",
                IsActive = true,
                CreatedAt = utcNow
            });
            permsAdded++;
        }

        if (rolesAdded > 0 || permsAdded > 0)
        {
            await context.SaveChangesAsync();
            logger.LogInformation(
                "Department infrastructure for {DepartmentId}: +{Roles} role(s), +{Perms} permission(s).",
                departmentId,
                rolesAdded,
                permsAdded);
        }
    }

    public static async Task EnsureAllDepartmentsAsync(ApplicationDbContext context, ILogger logger)
    {
        var departments = await context.Departments.ToListAsync();
        if (departments.Count == 0)
        {
            return;
        }

        foreach (var dept in departments)
        {
            await EnsureDepartmentAsync(context, dept.Id, logger);
        }
    }
}
