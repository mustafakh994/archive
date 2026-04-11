using FormsManagementApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormsManagementApi.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260402120000_AddFileAttachmentIsEncrypted")]
    public class AddFileAttachmentIsEncrypted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some databases record 20251016163230_UpdateRolesAndUsers as applied but never created
            // FileAttachments / FormSubmissionAttachments (e.g. partial SQL restores). Recreate the
            // missing schema here, then add IsEncrypted when the table existed without it.
            migrationBuilder.Sql("""
                DO $EF$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'FileAttachments') THEN
                    CREATE TABLE public."FileAttachments" (
                      "Id" uuid NOT NULL,
                      "OriginalFileName" character varying(255) NOT NULL,
                      "FileName" character varying(255) NOT NULL,
                      "FilePath" character varying(500) NOT NULL,
                      "ContentType" character varying(100) NOT NULL,
                      "FileSize" bigint NOT NULL,
                      "Description" character varying(1000),
                      "UploadedBy" uuid NOT NULL,
                      "DepartmentId" uuid,
                      "UploadedAt" timestamp with time zone NOT NULL DEFAULT (now()),
                      "IsDeleted" boolean NOT NULL,
                      "DeletedAt" timestamp with time zone,
                      "IsEncrypted" boolean NOT NULL DEFAULT FALSE,
                      CONSTRAINT "PK_FileAttachments" PRIMARY KEY ("Id"),
                      CONSTRAINT "FK_FileAttachments_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES public."Departments"("Id") ON DELETE SET NULL,
                      CONSTRAINT "FK_FileAttachments_Users_UploadedBy" FOREIGN KEY ("UploadedBy") REFERENCES public."Users"("Id") ON DELETE CASCADE
                    );
                    CREATE INDEX "IX_FileAttachments_DepartmentId" ON public."FileAttachments" ("DepartmentId");
                    CREATE INDEX "IX_FileAttachments_UploadedBy" ON public."FileAttachments" ("UploadedBy");
                  END IF;

                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'FormSubmissionAttachments') THEN
                    CREATE TABLE public."FormSubmissionAttachments" (
                      "Id" uuid NOT NULL,
                      "FormSubmissionId" uuid NOT NULL,
                      "FileAttachmentId" uuid NOT NULL,
                      "AttachedAt" timestamp with time zone NOT NULL DEFAULT (now()),
                      CONSTRAINT "PK_FormSubmissionAttachments" PRIMARY KEY ("Id"),
                      CONSTRAINT "FK_FormSubmissionAttachments_FileAttachments_FileAttachmentId" FOREIGN KEY ("FileAttachmentId") REFERENCES public."FileAttachments"("Id") ON DELETE CASCADE,
                      CONSTRAINT "FK_FormSubmissionAttachments_FormSubmissions_FormSubmissionId" FOREIGN KEY ("FormSubmissionId") REFERENCES public."FormSubmissions"("Id") ON DELETE CASCADE
                    );
                    CREATE INDEX "IX_FormSubmissionAttachments_FileAttachmentId" ON public."FormSubmissionAttachments" ("FileAttachmentId");
                    CREATE UNIQUE INDEX "IX_FormSubmissionAttachments_FormSubmissionId_FileAttachmentId" ON public."FormSubmissionAttachments" ("FormSubmissionId", "FileAttachmentId");
                  END IF;

                  IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'FileAttachments')
                     AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'FileAttachments' AND column_name = 'IsEncrypted') THEN
                    ALTER TABLE public."FileAttachments" ADD COLUMN "IsEncrypted" boolean NOT NULL DEFAULT FALSE;
                  END IF;
                END $EF$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEncrypted",
                table: "FileAttachments");
        }
    }
}
