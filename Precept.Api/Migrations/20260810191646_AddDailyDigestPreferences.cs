using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Precept.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyDigestPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EmailNotificationsEnabled",
                table: "AspNetUsers",
                newName: "EmailDigestEnabled");

            migrationBuilder.AddColumn<int>(
                name: "DigestHourUtc",
                table: "AspNetUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "DigestIncludeFollowUps",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "DigestIncludeReviews",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDigestSentAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DigestHourUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DigestIncludeFollowUps",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DigestIncludeReviews",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "LastDigestSentAt",
                table: "AspNetUsers");

            migrationBuilder.RenameColumn(
                name: "EmailDigestEnabled",
                table: "AspNetUsers",
                newName: "EmailNotificationsEnabled");
        }
    }
}
