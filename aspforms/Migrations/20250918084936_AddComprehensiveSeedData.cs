using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FormsManagementApi.Migrations
{
    /// <inheritdoc />
    public partial class AddComprehensiveSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Departments",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"));

            migrationBuilder.InsertData(
                table: "Departments",
                columns: new[] { "Id", "Code", "CreatedAt", "Description", "Name", "Settings", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), "HR", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "Human Resources Department", "Human Resources", null, new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("10000000-0000-0000-0000-000000000002"), "IT", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "Information Technology Department", "Information Technology", null, new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("10000000-0000-0000-0000-000000000003"), "FIN", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "Finance Department", "Finance", null, new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) }
                });

            migrationBuilder.UpdateData(
                table: "SuperAdminUsers",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "$2a$11$3gkHZKIy05AgYwCDulMMVeloDpoYJs8LHBdlrWGaG3uXpvTR6xMdm" });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Id", "Action", "CreatedAt", "DepartmentId", "Description", "DisplayName", "IsActive", "Name", "Resource", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), "Create", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "Permission to create new forms", null, true, "Create Forms", "Forms", null },
                    { new Guid("20000000-0000-0000-0000-000000000002"), "Edit", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "Permission to edit existing forms", null, true, "Edit Forms", "Forms", null },
                    { new Guid("20000000-0000-0000-0000-000000000003"), "View", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "Permission to view forms", null, true, "View Forms", "Forms", null },
                    { new Guid("20000000-0000-0000-0000-000000000004"), "Delete", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "Permission to delete forms", null, true, "Delete Forms", "Forms", null },
                    { new Guid("20000000-0000-0000-0000-000000000005"), "Manage", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000002"), "Permission to manage users", null, true, "Manage Users", "Users", null },
                    { new Guid("20000000-0000-0000-0000-000000000006"), "View", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000003"), "Permission to view reports", null, true, "View Reports", "Reports", null }
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAt", "DepartmentId", "Description", "DisplayName", "IsActive", "IsSystemRole", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "HR Administrator role", "HR Administrator", true, false, "HR Admin", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("30000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000002"), "IT Manager role", "IT Manager", true, false, "IT Manager", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("30000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000003"), "Finance Employee role", "Finance Employee", true, false, "Finance Employee", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) }
                });

            migrationBuilder.InsertData(
                table: "UsageMetrics",
                columns: new[] { "Id", "DepartmentId", "Details", "MetricType", "RecordedAt", "Value" },
                values: new object[,]
                {
                    { new Guid("90000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "{\"period\":\"monthly\",\"forms\":[\"EMP_ONBOARD\"]}", "FormSubmissions", new DateTimeOffset(new DateTime(2025, 9, 17, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 25 },
                    { new Guid("90000000-0000-0000-0000-000000000002"), new Guid("10000000-0000-0000-0000-000000000002"), "{\"period\":\"monthly\",\"forms\":[\"IT_SUPPORT\"]}", "FormViews", new DateTimeOffset(new DateTime(2025, 9, 17, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 150 },
                    { new Guid("90000000-0000-0000-0000-000000000003"), new Guid("10000000-0000-0000-0000-000000000003"), "{\"period\":\"monthly\",\"unique_users\":12}", "ActiveUsers", new DateTimeOffset(new DateTime(2025, 9, 17, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 12 }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "Id", "CreatedAt", "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { new Guid("40000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("20000000-0000-0000-0000-000000000001"), new Guid("30000000-0000-0000-0000-000000000001") },
                    { new Guid("40000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("20000000-0000-0000-0000-000000000002"), new Guid("30000000-0000-0000-0000-000000000001") },
                    { new Guid("40000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("20000000-0000-0000-0000-000000000003"), new Guid("30000000-0000-0000-0000-000000000001") },
                    { new Guid("40000000-0000-0000-0000-000000000004"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("20000000-0000-0000-0000-000000000005"), new Guid("30000000-0000-0000-0000-000000000002") },
                    { new Guid("40000000-0000-0000-0000-000000000005"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("20000000-0000-0000-0000-000000000006"), new Guid("30000000-0000-0000-0000-000000000003") }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "CustomPermissions", "DepartmentId", "Email", "EmailVerifiedAt", "IsActive", "LastLoginAt", "Name", "PasswordHash", "Profile", "RoleId", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("50000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), null, new Guid("10000000-0000-0000-0000-000000000001"), "john.smith@company.com", null, true, null, "John Smith", "$2a$11$eIaXVoVRGVWEaldQRqfajuUvS4BBy7XIUpMutvXXaNSZhMUodzJmm", null, new Guid("30000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("50000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), null, new Guid("10000000-0000-0000-0000-000000000002"), "sarah.johnson@company.com", null, true, null, "Sarah Johnson", "$2a$11$J9lmo7VCdSDYasaiEVs1/upDYp3ffdhmNweZdZlextCUfRI5.kPni", null, new Guid("30000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("50000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), null, new Guid("10000000-0000-0000-0000-000000000003"), "mike.davis@company.com", null, true, null, "Mike Davis", "$2a$11$I4AuH1lDebsEfnzMl6stjehQ4IamtBWpy5F/o0HYGR45gLYsPwSXK", null, new Guid("30000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)) }
                });

            migrationBuilder.InsertData(
                table: "AuditLogs",
                columns: new[] { "Id", "Action", "CreatedAt", "DepartmentId", "Details", "IpAddress", "ResourceId", "ResourceType", "UserAgent", "UserId" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), "CREATE_FORM", new DateTimeOffset(new DateTime(2025, 9, 3, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000001"), "{\"action\":\"create\",\"form_name\":\"Employee Onboarding Form\",\"form_code\":\"EMP_ONBOARD\"}", null, new Guid("60000000-0000-0000-0000-000000000001"), "Form", null, new Guid("50000000-0000-0000-0000-000000000001") },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), "CREATE_FORM", new DateTimeOffset(new DateTime(2025, 9, 6, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000002"), "{\"action\":\"create\",\"form_name\":\"IT Support Request\",\"form_code\":\"IT_SUPPORT\"}", null, new Guid("60000000-0000-0000-0000-000000000002"), "Form", null, new Guid("50000000-0000-0000-0000-000000000002") },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), "SUBMIT_FORM", new DateTimeOffset(new DateTime(2025, 9, 15, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("10000000-0000-0000-0000-000000000003"), "{\"action\":\"submit\",\"form_name\":\"Expense Report\",\"amount\":1250.50}", null, new Guid("80000000-0000-0000-0000-000000000003"), "FormSubmission", null, new Guid("50000000-0000-0000-0000-000000000003") }
                });

            migrationBuilder.InsertData(
                table: "Forms",
                columns: new[] { "Id", "Code", "CreatedAt", "CreatedBy", "DepartmentId", "Description", "FormSchema", "Name", "Settings", "Status", "Title", "UpdatedAt", "Version" },
                values: new object[,]
                {
                    { new Guid("60000000-0000-0000-0000-000000000001"), "EMP_ONBOARD", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "Form for collecting new employee information", "{\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"title\":\"First Name\"},\"lastName\":{\"type\":\"string\",\"title\":\"Last Name\"},\"email\":{\"type\":\"string\",\"format\":\"email\",\"title\":\"Email\"},\"position\":{\"type\":\"string\",\"title\":\"Position\"},\"startDate\":{\"type\":\"string\",\"format\":\"date\",\"title\":\"Start Date\"}},\"required\":[\"firstName\",\"lastName\",\"email\",\"position\",\"startDate\"]}", "Employee Onboarding Form", "{\"allowMultipleSubmissions\":false,\"requireAuthentication\":true}", "Active", "New Employee Onboarding", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 1 },
                    { new Guid("60000000-0000-0000-0000-000000000002"), "IT_SUPPORT", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000002"), new Guid("10000000-0000-0000-0000-000000000002"), "Form for submitting IT support requests", "{\"type\":\"object\",\"properties\":{\"requestType\":{\"type\":\"string\",\"enum\":[\"Hardware\",\"Software\",\"Network\",\"Other\"],\"title\":\"Request Type\"},\"priority\":{\"type\":\"string\",\"enum\":[\"Low\",\"Medium\",\"High\",\"Critical\"],\"title\":\"Priority\"},\"description\":{\"type\":\"string\",\"title\":\"Description\"},\"contactInfo\":{\"type\":\"string\",\"title\":\"Contact Information\"}},\"required\":[\"requestType\",\"priority\",\"description\",\"contactInfo\"]}", "IT Support Request", "{\"allowMultipleSubmissions\":true,\"requireAuthentication\":true}", "Active", "IT Support Request Form", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 1 },
                    { new Guid("60000000-0000-0000-0000-000000000003"), "EXP_REPORT", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000003"), new Guid("10000000-0000-0000-0000-000000000003"), "Form for submitting monthly expense reports", "{\"type\":\"object\",\"properties\":{\"month\":{\"type\":\"string\",\"title\":\"Month\"},\"totalAmount\":{\"type\":\"number\",\"title\":\"Total Amount\"},\"category\":{\"type\":\"string\",\"enum\":[\"Travel\",\"Meals\",\"Office Supplies\",\"Other\"],\"title\":\"Category\"},\"receipts\":{\"type\":\"string\",\"title\":\"Receipt Numbers\"},\"notes\":{\"type\":\"string\",\"title\":\"Additional Notes\"}},\"required\":[\"month\",\"totalAmount\",\"category\"]}", "Expense Report", "{\"allowMultipleSubmissions\":true,\"requireAuthentication\":true}", "Active", "Monthly Expense Report", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), 1 }
                });

            migrationBuilder.InsertData(
                table: "FormPermissions",
                columns: new[] { "Id", "CreatedAt", "FormId", "Permission", "UpdatedAt", "UserId" },
                values: new object[,]
                {
                    { new Guid("b0000000-0000-0000-0000-000000000001"), new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9805), new Guid("60000000-0000-0000-0000-000000000001"), "admin", new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9806), new Guid("50000000-0000-0000-0000-000000000001") },
                    { new Guid("b0000000-0000-0000-0000-000000000002"), new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9814), new Guid("60000000-0000-0000-0000-000000000002"), "admin", new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9815), new Guid("50000000-0000-0000-0000-000000000002") },
                    { new Guid("b0000000-0000-0000-0000-000000000003"), new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9819), new Guid("60000000-0000-0000-0000-000000000003"), "admin", new DateTime(2025, 9, 18, 8, 49, 35, 338, DateTimeKind.Utc).AddTicks(9820), new Guid("50000000-0000-0000-0000-000000000003") }
                });

            migrationBuilder.InsertData(
                table: "FormSchemaVersions",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "FormId", "SchemaData", "VersionNumber" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000001"), new Guid("60000000-0000-0000-0000-000000000001"), "{\"type\":\"object\",\"properties\":{\"firstName\":{\"type\":\"string\",\"title\":\"First Name\"},\"lastName\":{\"type\":\"string\",\"title\":\"Last Name\"},\"email\":{\"type\":\"string\",\"format\":\"email\",\"title\":\"Email\"},\"position\":{\"type\":\"string\",\"title\":\"Position\"},\"startDate\":{\"type\":\"string\",\"format\":\"date\",\"title\":\"Start Date\"}},\"required\":[\"firstName\",\"lastName\",\"email\",\"position\",\"startDate\"]}", 1 },
                    { new Guid("70000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000002"), new Guid("60000000-0000-0000-0000-000000000002"), "{\"type\":\"object\",\"properties\":{\"requestType\":{\"type\":\"string\",\"enum\":[\"Hardware\",\"Software\",\"Network\",\"Other\"],\"title\":\"Request Type\"},\"priority\":{\"type\":\"string\",\"enum\":[\"Low\",\"Medium\",\"High\",\"Critical\"],\"title\":\"Priority\"},\"description\":{\"type\":\"string\",\"title\":\"Description\"},\"contactInfo\":{\"type\":\"string\",\"title\":\"Contact Information\"}},\"required\":[\"requestType\",\"priority\",\"description\",\"contactInfo\"]}", 1 },
                    { new Guid("70000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2025, 9, 18, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), new Guid("50000000-0000-0000-0000-000000000003"), new Guid("60000000-0000-0000-0000-000000000003"), "{\"type\":\"object\",\"properties\":{\"month\":{\"type\":\"string\",\"title\":\"Month\"},\"totalAmount\":{\"type\":\"number\",\"title\":\"Total Amount\"},\"category\":{\"type\":\"string\",\"enum\":[\"Travel\",\"Meals\",\"Office Supplies\",\"Other\"],\"title\":\"Category\"},\"receipts\":{\"type\":\"string\",\"title\":\"Receipt Numbers\"},\"notes\":{\"type\":\"string\",\"title\":\"Additional Notes\"}},\"required\":[\"month\",\"totalAmount\",\"category\"]}", 1 }
                });

            migrationBuilder.InsertData(
                table: "FormSubmissions",
                columns: new[] { "Id", "FormId", "FormVersion", "ResponseData", "SubmittedAt", "SubmitterEmail", "SubmitterIp", "UserId" },
                values: new object[,]
                {
                    { new Guid("80000000-0000-0000-0000-000000000001"), new Guid("60000000-0000-0000-0000-000000000001"), 1, "{\"firstName\":\"Alice\",\"lastName\":\"Wilson\",\"email\":\"alice.wilson@company.com\",\"position\":\"Software Developer\",\"startDate\":\"2024-01-15\"}", new DateTimeOffset(new DateTime(2025, 9, 8, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "alice.wilson@company.com", null, null },
                    { new Guid("80000000-0000-0000-0000-000000000002"), new Guid("60000000-0000-0000-0000-000000000002"), 1, "{\"requestType\":\"Hardware\",\"priority\":\"High\",\"description\":\"Laptop screen is flickering\",\"contactInfo\":\"ext. 1234\"}", new DateTimeOffset(new DateTime(2025, 9, 13, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "john.smith@company.com", null, null },
                    { new Guid("80000000-0000-0000-0000-000000000003"), new Guid("60000000-0000-0000-0000-000000000003"), 1, "{\"month\":\"December 2024\",\"totalAmount\":1250.50,\"category\":\"Travel\",\"receipts\":\"R001, R002, R003\",\"notes\":\"Business trip to client site\"}", new DateTimeOffset(new DateTime(2025, 9, 15, 8, 49, 34, 574, DateTimeKind.Unspecified).AddTicks(6149), new TimeSpan(0, 0, 0, 0, 0)), "mike.davis@company.com", null, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AuditLogs",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "AuditLogs",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "AuditLogs",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "FormPermissions",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "FormPermissions",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "FormPermissions",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "FormSchemaVersions",
                keyColumn: "Id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "FormSchemaVersions",
                keyColumn: "Id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "FormSchemaVersions",
                keyColumn: "Id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "FormSubmissions",
                keyColumn: "Id",
                keyValue: new Guid("80000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "FormSubmissions",
                keyColumn: "Id",
                keyValue: new Guid("80000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "FormSubmissions",
                keyColumn: "Id",
                keyValue: new Guid("80000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "Id",
                keyValue: new Guid("40000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "Id",
                keyValue: new Guid("40000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "Id",
                keyValue: new Guid("40000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "Id",
                keyValue: new Guid("40000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "Id",
                keyValue: new Guid("40000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "UsageMetrics",
                keyColumn: "Id",
                keyValue: new Guid("90000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "UsageMetrics",
                keyColumn: "Id",
                keyValue: new Guid("90000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "UsageMetrics",
                keyColumn: "Id",
                keyValue: new Guid("90000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Forms",
                keyColumn: "Id",
                keyValue: new Guid("60000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Forms",
                keyColumn: "Id",
                keyValue: new Guid("60000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Forms",
                keyColumn: "Id",
                keyValue: new Guid("60000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000006"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("50000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("50000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("50000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Departments",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Departments",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Departments",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000003"));

            migrationBuilder.InsertData(
                table: "Departments",
                columns: new[] { "Id", "Code", "CreatedAt", "Description", "Name", "Settings", "UpdatedAt" },
                values: new object[] { new Guid("00000000-0000-0000-0000-000000000002"), "TEST", new DateTimeOffset(new DateTime(2025, 9, 18, 8, 33, 11, 707, DateTimeKind.Unspecified).AddTicks(725), new TimeSpan(0, 0, 0, 0, 0)), "Test department for development", "Test Department", null, new DateTimeOffset(new DateTime(2025, 9, 18, 8, 33, 11, 707, DateTimeKind.Unspecified).AddTicks(727), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                table: "SuperAdminUsers",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTimeOffset(new DateTime(2025, 9, 18, 8, 33, 11, 706, DateTimeKind.Unspecified).AddTicks(8607), new TimeSpan(0, 0, 0, 0, 0)), "$2a$11$ltqaQWbRbkAdrYgHIDfHh.l3694fl3WceYEL0TbF3r9J8AAI8jBtm" });
        }
    }
}
