using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormsManagementApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExportOptimizationIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add composite index on FormId and SubmittedAt for efficient date filtering
            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_FormId_SubmittedAt",
                table: "FormSubmissions",
                columns: new[] { "FormId", "SubmittedAt" });

            // Add GIN index on ResponseData JSONB column for search optimization
            migrationBuilder.Sql(
                "CREATE INDEX IX_FormSubmissions_ResponseData_GIN ON \"FormSubmissions\" USING gin(\"ResponseData\");");

            // Add index on SubmitterEmail for email-based filtering
            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_SubmitterEmail",
                table: "FormSubmissions",
                column: "SubmitterEmail");

            // Add trigram extension for better text search performance (if not already exists)
            migrationBuilder.Sql(
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // Add GIN index on SubmitterEmail using trigram for partial text search
            migrationBuilder.Sql(
                "CREATE INDEX IX_FormSubmissions_SubmitterEmail_GIN ON \"FormSubmissions\" USING gin(\"SubmitterEmail\" gin_trgm_ops);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop the indexes in reverse order
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS IX_FormSubmissions_SubmitterEmail_GIN;");

            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_SubmitterEmail",
                table: "FormSubmissions");

            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS IX_FormSubmissions_ResponseData_GIN;");

            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_FormId_SubmittedAt",
                table: "FormSubmissions");
        }
    }
}