using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Precept.Api.Migrations
{
    /// <inheritdoc />
    public partial class M1F2_DemoIsolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DemoExpiresAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDemo",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Retire the old shared demo account (its password was committed to source):
            // mark it as an expired demo, drop its password, and rotate its security stamp so
            // existing shared sessions end immediately. DemoCleanupService then deletes it.
            migrationBuilder.Sql(
                """
                UPDATE "AspNetUsers"
                SET "IsDemo" = TRUE,
                    "DemoExpiresAt" = NOW(),
                    "PasswordHash" = NULL,
                    "SecurityStamp" = md5(random()::text || clock_timestamp()::text)
                WHERE "NormalizedEmail" = 'DEMO@PRECEPT.APP';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DemoExpiresAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsDemo",
                table: "AspNetUsers");
        }
    }
}
