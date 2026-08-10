using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Precept.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixConfidenceLevelBackfill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE ""Stories"" SET ""ConfidenceLevel"" = 2 WHERE ""ConfidenceLevel"" = 0;");
            migrationBuilder.Sql(@"UPDATE ""BehavioralStories"" SET ""ConfidenceLevel"" = 2 WHERE ""ConfidenceLevel"" = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
