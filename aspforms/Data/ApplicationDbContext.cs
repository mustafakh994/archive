using Microsoft.EntityFrameworkCore;
using FormsManagementApi.Models;

namespace FormsManagementApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }
    public DbSet<Form> Forms { get; set; }
    public DbSet<FormSchemaVersion> FormSchemaVersions { get; set; }
    public DbSet<FormSubmission> FormSubmissions { get; set; }
    public DbSet<UsageMetric> UsageMetrics { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<SuperAdminUser> SuperAdminUsers { get; set; }
    public DbSet<WebhookEndpoint> WebhookEndpoints { get; set; }
    public DbSet<Webhook> Webhooks { get; set; }
    public DbSet<WebhookDelivery> WebhookDeliveries { get; set; }
    public DbSet<FormPermission> FormPermissions { get; set; }
    public DbSet<Assignment> Assignments { get; set; }
    public DbSet<FileAttachment> FileAttachments { get; set; }
    public DbSet<FormSubmissionAttachment> FormSubmissionAttachments { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Department configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        });

        // Role configuration
        modelBuilder.Entity<Role>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.Roles)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Permission configuration
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.Permissions)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RolePermission configuration
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Role)
                .WithMany(e => e.RolePermissions)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Permission)
                .WithMany(e => e.RolePermissions)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.Users)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Role)
                .WithMany(e => e.Users)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // UserPermission configuration
        modelBuilder.Entity<UserPermission>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.PermissionId }).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.User)
                .WithMany(e => e.UserPermissions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Permission)
                .WithMany(e => e.UserPermissions)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Form configuration
        modelBuilder.Entity<Form>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.Forms)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Creator)
                .WithMany(e => e.CreatedForms)
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // FormSchemaVersion configuration
        modelBuilder.Entity<FormSchemaVersion>(entity =>
        {
            entity.HasIndex(e => new { e.FormId, e.VersionNumber }).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Form)
                .WithMany(e => e.FormSchemaVersions)
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Creator)
                .WithMany()
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // FormSubmission configuration
        modelBuilder.Entity<FormSubmission>(entity =>
        {
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Form)
                .WithMany(e => e.FormSubmissions)
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UsageMetric configuration
        modelBuilder.Entity<UsageMetric>(entity =>
        {
            entity.Property(e => e.RecordedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.UsageMetrics)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AuditLog configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany(e => e.AuditLogs)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // SuperAdminUser configuration
        modelBuilder.Entity<SuperAdminUser>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        });

        // WebhookEndpoint configuration (temporary compatibility)
        modelBuilder.Entity<WebhookEndpoint>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Webhook configuration
        modelBuilder.Entity<Webhook>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Creator)
                .WithMany()
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // WebhookDelivery configuration
        modelBuilder.Entity<WebhookDelivery>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Webhook)
                .WithMany(e => e.Deliveries)
                .HasForeignKey(e => e.WebhookId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FormPermission configuration
        modelBuilder.Entity<FormPermission>(entity =>
        {
            entity.HasIndex(e => new { e.FormId, e.UserId }).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Assignment configuration
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.DepartmentId, e.RoleId }).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Role)
                .WithMany()
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FileAttachment configuration
        modelBuilder.Entity<FileAttachment>(entity =>
        {
            entity.Property(e => e.UploadedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.Uploader)
                .WithMany()
                .HasForeignKey(e => e.UploadedBy)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // FormSubmissionAttachment configuration
        modelBuilder.Entity<FormSubmissionAttachment>(entity =>
        {
            entity.HasIndex(e => new { e.FormSubmissionId, e.FileAttachmentId }).IsUnique();
            entity.Property(e => e.AttachedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.FormSubmission)
                .WithMany()
                .HasForeignKey(e => e.FormSubmissionId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.FileAttachment)
                .WithMany(e => e.FormSubmissionAttachments)
                .HasForeignKey(e => e.FileAttachmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(e => e.Token).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
            
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed SuperAdmin user
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var now = DateTimeOffset.UtcNow;
        // Seed SuperAdmin user
        modelBuilder.Entity<SuperAdminUser>().HasData(
            new SuperAdminUser
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Name = "Super Administrator",
                Email = "superadmin@system.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("SuperAdmin123!"),
                IsActive = true,
                CreatedAt = now
            }
        );

        // Seed Departments
        var hrDeptId = Guid.Parse("10000000-0000-0000-0000-000000000001");
        var itDeptId = Guid.Parse("10000000-0000-0000-0000-000000000002");
        var financeDeptId = Guid.Parse("10000000-0000-0000-0000-000000000003");

        modelBuilder.Entity<Department>().HasData(
            new Department
            {
                Id = hrDeptId,
                Name = "Human Resources",
                Code = "HR",
                Description = "Human Resources Department",
                CreatedAt = now,
                UpdatedAt = now
            },
            new Department
            {
                Id = itDeptId,
                Name = "Information Technology",
                Code = "IT",
                Description = "Information Technology Department",
                CreatedAt = now,
                UpdatedAt = now
            },
            new Department
            {
                Id = financeDeptId,
                Name = "Finance",
                Code = "FIN",
                Description = "Finance Department",
                CreatedAt = now,
                UpdatedAt = now
            }
        );

        // Seed Permissions
        var createFormPermId = Guid.Parse("20000000-0000-0000-0000-000000000001");
        var editFormPermId = Guid.Parse("20000000-0000-0000-0000-000000000002");
        var viewFormPermId = Guid.Parse("20000000-0000-0000-0000-000000000003");
        var deleteFormPermId = Guid.Parse("20000000-0000-0000-0000-000000000004");
        var manageUsersPermId = Guid.Parse("20000000-0000-0000-0000-000000000005");
        var viewReportsPermId = Guid.Parse("20000000-0000-0000-0000-000000000006");

        modelBuilder.Entity<Permission>().HasData(
            new Permission
            {
                Id = createFormPermId,
                DepartmentId = hrDeptId,
                Name = "Create Forms",
                Resource = "Forms",
                Action = "Create",
                Description = "Permission to create new forms",
                IsActive = true,
                CreatedAt = now
            },
            new Permission
            {
                Id = editFormPermId,
                DepartmentId = hrDeptId,
                Name = "Edit Forms",
                Resource = "Forms",
                Action = "Edit",
                Description = "Permission to edit existing forms",
                IsActive = true,
                CreatedAt = now
            },
            new Permission
            {
                Id = viewFormPermId,
                DepartmentId = hrDeptId,
                Name = "View Forms",
                Resource = "Forms",
                Action = "View",
                Description = "Permission to view forms",
                IsActive = true,
                CreatedAt = now
            },
            new Permission
            {
                Id = deleteFormPermId,
                DepartmentId = hrDeptId,
                Name = "Delete Forms",
                Resource = "Forms",
                Action = "Delete",
                Description = "Permission to delete forms",
                IsActive = true,
                CreatedAt = now
            },
            new Permission
            {
                Id = manageUsersPermId,
                DepartmentId = itDeptId,
                Name = "Manage Users",
                Resource = "Users",
                Action = "Manage",
                Description = "Permission to manage users",
                IsActive = true,
                CreatedAt = now
            },
            new Permission
            {
                Id = viewReportsPermId,
                DepartmentId = financeDeptId,
                Name = "View Reports",
                Resource = "Reports",
                Action = "View",
                Description = "Permission to view reports",
                IsActive = true,
                CreatedAt = now
            }
        );

        // Seed Roles - Only two roles: Superadmin and Departmentadmin
        var superAdminRoleId = Guid.Parse("30000000-0000-0000-0000-000000000001");
        var departmentAdminRoleId = Guid.Parse("30000000-0000-0000-0000-000000000002");

        modelBuilder.Entity<Role>().HasData(
            new Role
            {
                Id = superAdminRoleId,
                DepartmentId = hrDeptId, // Can be assigned to any department
                Name = "Superadmin",
                DisplayName = "Super Administrator",
                Description = "System-wide administrative access with full permissions",
                IsSystemRole = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Role
            {
                Id = departmentAdminRoleId,
                DepartmentId = hrDeptId, // Can be assigned to any department
                Name = "Departmentadmin",
                DisplayName = "Department Administrator",
                Description = "Department-level administrative access",
                IsSystemRole = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        );

        // Seed Role Permissions - Superadmin gets all permissions, Departmentadmin gets limited permissions
        modelBuilder.Entity<RolePermission>().HasData(
            // Superadmin permissions (all permissions)
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                RoleId = superAdminRoleId,
                PermissionId = createFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000002"),
                RoleId = superAdminRoleId,
                PermissionId = editFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000003"),
                RoleId = superAdminRoleId,
                PermissionId = viewFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000004"),
                RoleId = superAdminRoleId,
                PermissionId = deleteFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000005"),
                RoleId = superAdminRoleId,
                PermissionId = manageUsersPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000006"),
                RoleId = superAdminRoleId,
                PermissionId = viewReportsPermId,
                CreatedAt = now
            },
            // Departmentadmin permissions (limited to forms)
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000007"),
                RoleId = departmentAdminRoleId,
                PermissionId = createFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000008"),
                RoleId = departmentAdminRoleId,
                PermissionId = editFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000009"),
                RoleId = departmentAdminRoleId,
                PermissionId = viewFormPermId,
                CreatedAt = now
            },
            new RolePermission
            {
                Id = Guid.Parse("40000000-0000-0000-0000-000000000010"),
                RoleId = departmentAdminRoleId,
                PermissionId = deleteFormPermId,
                CreatedAt = now
            }
        );

        // Seed Users
        var user1Id = Guid.Parse("50000000-0000-0000-0000-000000000001");
        var user2Id = Guid.Parse("50000000-0000-0000-0000-000000000002");
        var user3Id = Guid.Parse("50000000-0000-0000-0000-000000000003");

        // Note: Users will be seeded at runtime with proper password hashes
        // See Program.cs UpdateUserPasswords method

        // Seed Forms
        var form1Id = Guid.Parse("60000000-0000-0000-0000-000000000001");
        var form2Id = Guid.Parse("60000000-0000-0000-0000-000000000002");
        var form3Id = Guid.Parse("60000000-0000-0000-0000-000000000003");

        modelBuilder.Entity<Form>().HasData(
            new Form
            {
                Id = form1Id,
                DepartmentId = hrDeptId,
                Name = "Employee Onboarding Form",
                Code = "EMP_ONBOARD",
                Title = "New Employee Onboarding",
                Description = "Form for collecting new employee information",
                FormSchema = "{\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"title\":\"First Name\"},\"lastName\":{\"type\":\"string\",\"title\":\"Last Name\"},\"email\":{\"type\":\"string\",\"format\":\"email\",\"title\":\"Email\"},\"position\":{\"type\":\"string\",\"title\":\"Position\"},\"startDate\":{\"type\":\"string\",\"format\":\"date\",\"title\":\"Start Date\"}},\"required\":[\"firstName\",\"lastName\",\"email\",\"position\",\"startDate\"]}",
                Settings = "{\"allowMultipleSubmissions\":false,\"requireAuthentication\":true}",
                CreatedBy = user1Id,
                Version = 1,
                Status = "Active",
                CreatedAt = now,
                UpdatedAt = now
            },
            new Form
            {
                Id = form2Id,
                DepartmentId = itDeptId,
                Name = "IT Support Request",
                Code = "IT_SUPPORT",
                Title = "IT Support Request Form",
                Description = "Form for submitting IT support requests",
                FormSchema = "{\"type\":\"object\",\"properties\":{\"requestType\":{\"type\":\"string\",\"enum\":[\"Hardware\",\"Software\",\"Network\",\"Other\"],\"title\":\"Request Type\"},\"priority\":{\"type\":\"string\",\"enum\":[\"Low\",\"Medium\",\"High\",\"Critical\"],\"title\":\"Priority\"},\"description\":{\"type\":\"string\",\"title\":\"Description\"},\"contactInfo\":{\"type\":\"string\",\"title\":\"Contact Information\"}},\"required\":[\"requestType\",\"priority\",\"description\",\"contactInfo\"]}",
                Settings = "{\"allowMultipleSubmissions\":true,\"requireAuthentication\":true}",
                CreatedBy = user2Id,
                Version = 1,
                Status = "Active",
                CreatedAt = now,
                UpdatedAt = now
            },
            new Form
            {
                Id = form3Id,
                DepartmentId = financeDeptId,
                Name = "Expense Report",
                Code = "EXP_REPORT",
                Title = "Monthly Expense Report",
                Description = "Form for submitting monthly expense reports",
                FormSchema = "{\"type\":\"object\",\"properties\":{\"month\":{\"type\":\"string\",\"title\":\"Month\"},\"totalAmount\":{\"type\":\"number\",\"title\":\"Total Amount\"},\"category\":{\"type\":\"string\",\"enum\":[\"Travel\",\"Meals\",\"Office Supplies\",\"Other\"],\"title\":\"Category\"},\"receipts\":{\"type\":\"string\",\"title\":\"Receipt Numbers\"},\"notes\":{\"type\":\"string\",\"title\":\"Additional Notes\"}},\"required\":[\"month\",\"totalAmount\",\"category\"]}",
                Settings = "{\"allowMultipleSubmissions\":true,\"requireAuthentication\":true}",
                CreatedBy = user3Id,
                Version = 1,
                Status = "Active",
                CreatedAt = now,
                UpdatedAt = now
            }
        );

        // Seed Form Schema Versions
        modelBuilder.Entity<FormSchemaVersion>().HasData(
            new FormSchemaVersion
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000001"),
                FormId = form1Id,
                VersionNumber = 1,
                SchemaData = "{\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"title\":\"First Name\"},\"lastName\":{\"type\":\"string\",\"title\":\"Last Name\"},\"email\":{\"type\":\"string\",\"format\":\"email\",\"title\":\"Email\"},\"position\":{\"type\":\"string\",\"title\":\"Position\"},\"startDate\":{\"type\":\"string\",\"format\":\"date\",\"title\":\"Start Date\"}},\"required\":[\"firstName\",\"lastName\",\"email\",\"position\",\"startDate\"]}",
                CreatedBy = user1Id,
                CreatedAt = now
            },
            new FormSchemaVersion
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000002"),
                FormId = form2Id,
                VersionNumber = 1,
                SchemaData = "{\"type\":\"object\",\"properties\":{\"requestType\":{\"type\":\"string\",\"enum\":[\"Hardware\",\"Software\",\"Network\",\"Other\"],\"title\":\"Request Type\"},\"priority\":{\"type\":\"string\",\"enum\":[\"Low\",\"Medium\",\"High\",\"Critical\"],\"title\":\"Priority\"},\"description\":{\"type\":\"string\",\"title\":\"Description\"},\"contactInfo\":{\"type\":\"string\",\"title\":\"Contact Information\"}},\"required\":[\"requestType\",\"priority\",\"description\",\"contactInfo\"]}",
                CreatedBy = user2Id,
                CreatedAt = now
            },
            new FormSchemaVersion
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000003"),
                FormId = form3Id,
                VersionNumber = 1,
                SchemaData = "{\"type\":\"object\",\"properties\":{\"month\":{\"type\":\"string\",\"title\":\"Month\"},\"totalAmount\":{\"type\":\"number\",\"title\":\"Total Amount\"},\"category\":{\"type\":\"string\",\"enum\":[\"Travel\",\"Meals\",\"Office Supplies\",\"Other\"],\"title\":\"Category\"},\"receipts\":{\"type\":\"string\",\"title\":\"Receipt Numbers\"},\"notes\":{\"type\":\"string\",\"title\":\"Additional Notes\"}},\"required\":[\"month\",\"totalAmount\",\"category\"]}",
                CreatedBy = user3Id,
                CreatedAt = now
            }
        );

        // Seed Form Submissions
        modelBuilder.Entity<FormSubmission>().HasData(
            new FormSubmission
            {
                Id = Guid.Parse("80000000-0000-0000-0000-000000000001"),
                FormId = form1Id,
                ResponseData = "{\"firstName\":\"Alice\",\"lastName\":\"Wilson\",\"email\":\"alice.wilson@company.com\",\"position\":\"Software Developer\",\"startDate\":\"2024-01-15\"}",
                FormVersion = 1,
                SubmitterEmail = "alice.wilson@company.com",
                SubmittedAt = now.AddDays(-10)
            },
            new FormSubmission
            {
                Id = Guid.Parse("80000000-0000-0000-0000-000000000002"),
                FormId = form2Id,
                ResponseData = "{\"requestType\":\"Hardware\",\"priority\":\"High\",\"description\":\"Laptop screen is flickering\",\"contactInfo\":\"ext. 1234\"}",
                FormVersion = 1,
                SubmitterEmail = "john.smith@company.com",
                SubmittedAt = now.AddDays(-5)
            },
            new FormSubmission
            {
                Id = Guid.Parse("80000000-0000-0000-0000-000000000003"),
                FormId = form3Id,
                ResponseData = "{\"month\":\"December 2024\",\"totalAmount\":1250.50,\"category\":\"Travel\",\"receipts\":\"R001, R002, R003\",\"notes\":\"Business trip to client site\"}",
                FormVersion = 1,
                SubmitterEmail = "mike.davis@company.com",
                SubmittedAt = now.AddDays(-3)
            }
        );

        // Seed Usage Metrics
        modelBuilder.Entity<UsageMetric>().HasData(
            new UsageMetric
            {
                Id = Guid.Parse("90000000-0000-0000-0000-000000000001"),
                DepartmentId = hrDeptId,
                MetricType = "FormSubmissions",
                Value = 25,
                Details = "{\"period\":\"monthly\",\"forms\":[\"EMP_ONBOARD\"]}",
                RecordedAt = now.AddDays(-1)
            },
            new UsageMetric
            {
                Id = Guid.Parse("90000000-0000-0000-0000-000000000002"),
                DepartmentId = itDeptId,
                MetricType = "FormViews",
                Value = 150,
                Details = "{\"period\":\"monthly\",\"forms\":[\"IT_SUPPORT\"]}",
                RecordedAt = now.AddDays(-1)
            },
            new UsageMetric
            {
                Id = Guid.Parse("90000000-0000-0000-0000-000000000003"),
                DepartmentId = financeDeptId,
                MetricType = "ActiveUsers",
                Value = 12,
                Details = "{\"period\":\"monthly\",\"unique_users\":12}",
                RecordedAt = now.AddDays(-1)
            }
        );

        // Seed Audit Logs
        modelBuilder.Entity<AuditLog>().HasData(
            new AuditLog
            {
                Id = Guid.Parse("A0000000-0000-0000-0000-000000000001"),
                DepartmentId = hrDeptId,
                UserId = user1Id,
                Action = "CREATE_FORM",
                ResourceType = "Form",
                ResourceId = form1Id,
                Details = "{\"action\":\"create\",\"form_name\":\"Employee Onboarding Form\",\"form_code\":\"EMP_ONBOARD\"}",
                CreatedAt = now.AddDays(-15)
            },
            new AuditLog
            {
                Id = Guid.Parse("A0000000-0000-0000-0000-000000000002"),
                DepartmentId = itDeptId,
                UserId = user2Id,
                Action = "CREATE_FORM",
                ResourceType = "Form",
                ResourceId = form2Id,
                Details = "{\"action\":\"create\",\"form_name\":\"IT Support Request\",\"form_code\":\"IT_SUPPORT\"}",
                CreatedAt = now.AddDays(-12)
            },
            new AuditLog
            {
                Id = Guid.Parse("A0000000-0000-0000-0000-000000000003"),
                DepartmentId = financeDeptId,
                UserId = user3Id,
                Action = "SUBMIT_FORM",
                ResourceType = "FormSubmission",
                ResourceId = Guid.Parse("80000000-0000-0000-0000-000000000003"),
                Details = "{\"action\":\"submit\",\"form_name\":\"Expense Report\",\"amount\":1250.50}",
                CreatedAt = now.AddDays(-3)
            }
        );

        // Seed Form Permissions
        modelBuilder.Entity<FormPermission>().HasData(
            new FormPermission
            {
                Id = Guid.Parse("B0000000-0000-0000-0000-000000000001"),
                FormId = form1Id,
                UserId = user1Id,
                Permission = "admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new FormPermission
            {
                Id = Guid.Parse("B0000000-0000-0000-0000-000000000002"),
                FormId = form2Id,
                UserId = user2Id,
                Permission = "admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new FormPermission
            {
                Id = Guid.Parse("B0000000-0000-0000-0000-000000000003"),
                FormId = form3Id,
                UserId = user3Id,
                Permission = "admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
    }
}