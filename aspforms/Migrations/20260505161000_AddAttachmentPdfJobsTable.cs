using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using FormsManagementApi.Data;

#nullable disable

namespace FormsManagementApi.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260505161000_AddAttachmentPdfJobsTable")]
    public partial class AddAttachmentPdfJobsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'AttachmentPdfJobs'
                  ) THEN
                    CREATE TABLE public."AttachmentPdfJobs" (
                      "Id" uuid NOT NULL,
                      "OwnerKey" character varying(100) NOT NULL,
                      "SubmissionId" uuid NOT NULL,
                      "Title" character varying(300) NOT NULL,
                      "AttachmentUrlsJson" text NOT NULL,
                      "Status" character varying(30) NOT NULL,
                      "Progress" integer NOT NULL DEFAULT 0,
                      "ErrorMessage" character varying(1000),
                      "FilePath" character varying(1000),
                      "FileName" character varying(300),
                      "FileSizeBytes" bigint,
                      "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                      "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                      "CompletedAt" timestamp with time zone,
                      CONSTRAINT "PK_AttachmentPdfJobs" PRIMARY KEY ("Id")
                    );
                    CREATE INDEX "IX_AttachmentPdfJobs_OwnerKey_CreatedAt" ON public."AttachmentPdfJobs" ("OwnerKey", "CreatedAt");
                    CREATE INDEX "IX_AttachmentPdfJobs_Status_CreatedAt" ON public."AttachmentPdfJobs" ("Status", "CreatedAt");
                  END IF;
                END $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'AttachmentPdfJobs'
                  ) THEN
                    DROP TABLE public."AttachmentPdfJobs";
                  END IF;
                END $$;
                """);
        }
    }
}
