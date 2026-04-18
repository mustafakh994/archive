using FormsManagementApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormsManagementApi.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260411120000_FormSubmissionSubmittedByAndFormPermissionIndex")]
    public class FormSubmissionSubmittedByAndFormPermissionIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $EF$
                BEGIN
                  -- FormSubmissions: align column name with SubmittedByUserId + FK SET NULL
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'FormSubmissions' AND column_name = 'UserId')
                     AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'FormSubmissions' AND column_name = 'SubmittedByUserId') THEN
                    ALTER TABLE public."FormSubmissions" DROP CONSTRAINT IF EXISTS "FK_FormSubmissions_Users_UserId";
                    ALTER TABLE public."FormSubmissions" RENAME COLUMN "UserId" TO "SubmittedByUserId";
                    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                               WHERE n.nspname = 'public' AND c.relname = 'IX_FormSubmissions_UserId') THEN
                      ALTER INDEX public."IX_FormSubmissions_UserId" RENAME TO "IX_FormSubmissions_SubmittedByUserId";
                    END IF;
                    ALTER TABLE public."FormSubmissions"
                      ADD CONSTRAINT "FK_FormSubmissions_Users_SubmittedByUserId"
                      FOREIGN KEY ("SubmittedByUserId") REFERENCES public."Users"("Id") ON DELETE SET NULL;
                  ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'FormSubmissions' AND column_name = 'SubmittedByUserId') THEN
                    ALTER TABLE public."FormSubmissions" ADD COLUMN "SubmittedByUserId" uuid NULL;
                    CREATE INDEX IF NOT EXISTS "IX_FormSubmissions_SubmittedByUserId" ON public."FormSubmissions" ("SubmittedByUserId");
                    ALTER TABLE public."FormSubmissions"
                      ADD CONSTRAINT "FK_FormSubmissions_Users_SubmittedByUserId"
                      FOREIGN KEY ("SubmittedByUserId") REFERENCES public."Users"("Id") ON DELETE SET NULL;
                  ELSE
                    -- Column exists: ensure FK name and ON DELETE SET NULL
                    ALTER TABLE public."FormSubmissions" DROP CONSTRAINT IF EXISTS "FK_FormSubmissions_Users_UserId";
                    ALTER TABLE public."FormSubmissions" DROP CONSTRAINT IF EXISTS "FK_FormSubmissions_Users_SubmittedByUserId";
                    ALTER TABLE public."FormSubmissions"
                      ADD CONSTRAINT "FK_FormSubmissions_Users_SubmittedByUserId"
                      FOREIGN KEY ("SubmittedByUserId") REFERENCES public."Users"("Id") ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS "IX_FormSubmissions_SubmittedByUserId" ON public."FormSubmissions" ("SubmittedByUserId");
                  END IF;

                  -- FormPermissions: allow multiple permission rows per user per form
                  IF EXISTS (
                    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = 'IX_FormPermissions_FormId_UserId') THEN
                    DROP INDEX IF EXISTS public."IX_FormPermissions_FormId_UserId";
                  END IF;
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = 'IX_FormPermissions_FormId_UserId_Permission') THEN
                    CREATE UNIQUE INDEX "IX_FormPermissions_FormId_UserId_Permission"
                      ON public."FormPermissions" ("FormId", "UserId", "Permission");
                  END IF;
                END
                $EF$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $EF$
                BEGIN
                  DROP INDEX IF EXISTS public."IX_FormPermissions_FormId_UserId_Permission";
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = 'IX_FormPermissions_FormId_UserId') THEN
                    CREATE UNIQUE INDEX "IX_FormPermissions_FormId_UserId"
                      ON public."FormPermissions" ("FormId", "UserId");
                  END IF;
                END
                $EF$;
                """);
        }
    }
}
