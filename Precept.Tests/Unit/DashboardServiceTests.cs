using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class DashboardServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_dashboard_{Guid.NewGuid():N}";

    private sealed class TestCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId { get; } = userId;
    }

    private DbContextOptions<PreceptDbContext> DbOptions =>
        new DbContextOptionsBuilder<PreceptDbContext>()
            .UseNpgsql(_fixture.GetConnectionString(_databaseName))
            .Options;

    private PreceptDbContext MakeDb(string? userId) =>
        new(DbOptions, new TestCurrentUser(userId));

    private PreceptDbContext _db = null!;
    private DashboardService _svc = null!;
    private const string UserId = "dash-user-1";

    public DashboardServiceTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        await using var conn = new Npgsql.NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_databaseName}\";";
        await cmd.ExecuteNonQueryAsync();

        await using var db = MakeDb(null);
        await db.Database.MigrateAsync();

        // Seed the user row so FK constraints on Stories/Applications/JobDescriptions.UserId are satisfied
        await using var conn2 = new Npgsql.NpgsqlConnection(_fixture.GetConnectionString(_databaseName));
        await conn2.OpenAsync();
        await using var seedCmd = conn2.CreateCommand();
        seedCmd.CommandText = $"""
            INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
                "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
                "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount",
                "FirstName", "LastName")
            VALUES ('{UserId}', 'dash@test.com', 'DASH@TEST.COM', 'dash@test.com', 'DASH@TEST.COM',
                true, '', gen_random_uuid()::text, gen_random_uuid()::text,
                false, false, false, 0,
                'Dash', 'User')
            ON CONFLICT DO NOTHING;
            """;
        await seedCmd.ExecuteNonQueryAsync();

        _db = MakeDb(UserId);
        _svc = new DashboardService(_db, Microsoft.Extensions.Logging.Abstractions.NullLogger<DashboardService>.Instance);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await using var conn = new Npgsql.NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE);";
        await cmd.ExecuteNonQueryAsync();
    }

    [Fact]
    public async Task GetDashboardStatsAsync_ReturnsCorrectAggregations()
    {
        // Seed stories
        _db.Stories.AddRange(
            new Story { UserId = UserId, Title = "S1", Explanation = "Exp 1 1234567890 1234567890 1234567890 1234567890", Category = Category.Auth, ConfidenceLevel = ConfidenceLevel.Panic },
            new Story { UserId = UserId, Title = "S2", Explanation = "Exp 2 1234567890 1234567890 1234567890 1234567890", Category = Category.Database, ConfidenceLevel = ConfidenceLevel.Solid, LastReviewedAt = DateTime.UtcNow }
        );

        // Seed applications
        _db.Applications.AddRange(
            new Application { UserId = UserId, CompanyName = "Acme", RoleTitle = "Dev", Status = ApplicationStatus.Interviewing, FollowUpDate = DateTime.UtcNow },
            new Application { UserId = UserId, CompanyName = "Beta", RoleTitle = "Lead", Status = ApplicationStatus.Offer, FollowUpDate = DateTime.UtcNow }
        );

        // Seed job descriptions
        _db.JobDescriptions.Add(
            new JobDescription { UserId = UserId, CompanyName = "Acme", RoleTitle = "Dev", Description = "Test", YourMatchScore = 85 }
        );

        await _db.SaveChangesAsync();

        var result = await _svc.GetDashboardStatsAsync(UserId);

        result.Should().NotBeNull();
        result.StoryStats.TotalStories.Should().Be(2);
        result.StoryStats.TotalReviewed.Should().Be(1);
        result.StoryStats.NeedsReview.Should().Be(1);

        result.ApplicationStats.TotalApplications.Should().Be(2);
        result.ApplicationStats.InterviewingCount.Should().Be(1);
        result.ApplicationStats.OffersCount.Should().Be(1);

        result.JobDescriptionStats.TotalJobDescriptions.Should().Be(1);
        result.JobDescriptionStats.AverageMatchScore.Should().Be(85);
    }
}
