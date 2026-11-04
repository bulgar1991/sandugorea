using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sandugorea.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GoogleDrive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriveFolderId",
                table: "Projects",
                type: "TEXT",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveFileId",
                table: "Photos",
                type: "TEXT",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DriveAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false),
                    ProtectedRefreshToken = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    RootFolderId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    ConnectedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriveAccounts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Photos_DriveFileId",
                table: "Photos",
                column: "DriveFileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriveAccounts");

            migrationBuilder.DropIndex(
                name: "IX_Photos_DriveFileId",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "DriveFolderId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "DriveFileId",
                table: "Photos");
        }
    }
}
