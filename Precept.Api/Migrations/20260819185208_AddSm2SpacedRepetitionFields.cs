using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Precept.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSm2SpacedRepetitionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "EaseFactor",
                table: "Stories",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "IntervalDays",
                table: "Stories",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Repetitions",
                table: "Stories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "EaseFactor",
                table: "BehavioralStories",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "IntervalDays",
                table: "BehavioralStories",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Repetitions",
                table: "BehavioralStories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE ""Stories""
                SET ""EaseFactor"" = 2.5,
                    ""IntervalDays"" = CASE ""ConfidenceLevel""
                        WHEN 0 THEN 1.0
                        WHEN 1 THEN 2.0
                        WHEN 2 THEN 4.0
                        WHEN 3 THEN 9.0
                        WHEN 4 THEN 21.0
                        ELSE 1.0
                    END,
                    ""Repetitions"" = CASE ""ConfidenceLevel""
                        WHEN 0 THEN 0
                        WHEN 1 THEN 1
                        WHEN 2 THEN 2
                        WHEN 3 THEN 3
                        WHEN 4 THEN 4
                        ELSE 0
                    END;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""BehavioralStories""
                SET ""EaseFactor"" = 2.5,
                    ""IntervalDays"" = CASE ""ConfidenceLevel""
                        WHEN 0 THEN 1.0
                        WHEN 1 THEN 2.0
                        WHEN 2 THEN 4.0
                        WHEN 3 THEN 9.0
                        WHEN 4 THEN 21.0
                        ELSE 1.0
                    END,
                    ""Repetitions"" = CASE ""ConfidenceLevel""
                        WHEN 0 THEN 0
                        WHEN 1 THEN 1
                        WHEN 2 THEN 2
                        WHEN 3 THEN 3
                        WHEN 4 THEN 4
                        ELSE 0
                    END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EaseFactor",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "IntervalDays",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "Repetitions",
                table: "Stories");

            migrationBuilder.DropColumn(
                name: "EaseFactor",
                table: "BehavioralStories");

            migrationBuilder.DropColumn(
                name: "IntervalDays",
                table: "BehavioralStories");

            migrationBuilder.DropColumn(
                name: "Repetitions",
                table: "BehavioralStories");
        }
    }
}
