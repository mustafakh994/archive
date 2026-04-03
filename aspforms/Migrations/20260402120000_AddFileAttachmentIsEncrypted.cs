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
            migrationBuilder.AddColumn<bool>(
                name: "IsEncrypted",
                table: "FileAttachments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
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
