using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Precept.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSpacedRepetition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stories_UserId",
                table: "Stories");

            migrationBuilder.DropIndex(
                name: "IX_BehavioralStories_UserId",
                table: "BehavioralStories");

            migrationBuilder.AddColumn<DateTime>(
                name: "NextReviewAt",
                table: "Stories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ConfidenceLevel",
                table: "BehavioralStories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReviewedAt",
                table: "BehavioralStories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextReviewAt",
                table: "BehavioralStories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""Stories""
                SET ""NextReviewAt"" = ""LastReviewedAt"" + CASE ""ConfidenceLevel""
                    WHEN 0 THEN INTERVAL '1 day'
                    WHEN 1 THEN INTERVAL '2 days'
                    WHEN 2 THEN INTERVAL '4 days'
                    WHEN 3 THEN INTERVAL '9 days'
                    WHEN 4 THEN INTERVAL '21 days'
                    ELSE INTERVAL '1 day'
                END
                WHERE ""LastReviewedAt"" IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""BehavioralStories""
                SET ""NextReviewAt"" = ""LastReviewedAt"" + CASE ""ConfidenceLevel""
                    WHEN 0 THEN INTERVAL '1 day'
                    WHEN 1 THEN INTERVAL '2 days'
                    WHEN 2 THEN INTERVAL '4 days'
                    WHEN 3 THEN INTERVAL '9 days'
                    WHEN 4 THEN INTERVAL '21 days'
                    ELSE INTERVAL '1 day'
                END
                WHERE ""LastReviewedAt"" IS NOT NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Stories_UserId_NextReviewAt",
                table: "Stories",
                columns: new[] { "UserId", "NextReviewAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralStories_UserId_NextReviewAt",
                table: "BehavioralStories",
                columns: new[] { "UserId", "NextReviewAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stories_UserId_NextReviewAt",
                table: "Stories");

            migrationBuilder.DropIndex(
                name: "IX_BehavioralStories_UserId_NextReviewAt",
                table: "BehavioralStories");

            migrationBuilder.DropColumn(
                name: "NextReviewAt",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "ConfidenceLevel",
                table: "BehavioralStories");

            migrationBuilder.DropColumn(
                name: "LastReviewedAt",
                table: "BehavioralStories");

            migrationBuilder.DropColumn(
                name: "NextReviewAt",
                table: "BehavioralStories");

            migrationBuilder.CreateIndex(
                name: "IX_Stories_UserId",
                table: "Stories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralStories_UserId",
                table: "BehavioralStories",
                column: "UserId");
        }
    }
}
