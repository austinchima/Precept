using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class DigestQueryServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_digest_{Guid.NewGuid():N}";

    private DbContextOptions<PreceptDbContext> DbOptions =>
        new DbContextOptionsBuilder<PreceptDbContext>()
            .UseNpgsql(_fixture.GetConnectionString(_databaseName))
            .Options;

    private sealed class TestCurrentUser(string? userId) : Precept.Api.Services.Interfaces.ICurrentUser
    {
        public string? UserId { get; } = userId;
    }

    private PreceptDbContext MakeDb(string? userId) =>
        new(DbOptions, new TestCurrentUser(userId));

    public DigestQueryServiceTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_databaseName}\"";
        await cmd.ExecuteNonQueryAsync();

        await using var migrateDb = MakeDb(null);
        await migrateDb.Database.MigrateAsync();

        foreach (var uid in new[] { "user-empty", "user-mixed" })
        {
            migrateDb.Users.Add(new ApplicationUser
            {
                Id = uid,
                UserName = $"{uid}@test.com",
                NormalizedUserName = $"{uid}@TEST.COM",
                Email = $"{uid}@test.com",
                NormalizedEmail = $"{uid}@TEST.COM",
                EmailConfirmed = true,
                SecurityStamp = Guid.NewGuid().ToString(),
                FirstName = "Test",
                LastName = uid,
                EmailDigestEnabled = true,
                DigestIncludeFollowUps = true,
                DigestIncludeReviews = true
            });
        }
        await migrateDb.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        
        await using var termCmd = conn.CreateCommand();
        termCmd.CommandText = $"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{_databaseName}' AND pid <> pg_backend_pid();";
        await termCmd.ExecuteNonQueryAsync();

        await using var dropCmd = conn.CreateCommand();
        dropCmd.CommandText = $"DROP DATABASE \"{_databaseName}\"";
        await dropCmd.ExecuteNonQueryAsync();
    }

    [Fact]
    public async Task GetDigestAsync_NothingDue_ReturnsNull()
    {
        await using var db = MakeDb("user-empty");
        var svc = new DigestQueryService(db);
        
        var result = await svc.GetDigestAsync("user-empty", DateTime.UtcNow);
        
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetDigestAsync_BothFollowUpsAndReviewsDue_AggregatesCorrectly()
    {
        await using var db = MakeDb(null); 
        var now = DateTime.UtcNow;

        db.Applications.Add(new Application
        {
            Id = Guid.NewGuid(),
            UserId = "user-mixed",
            CompanyName = "TestCorp",
            RoleTitle = "Dev",
            Status = ApplicationStatus.Applied,
            FollowUpDate = now.AddDays(-1)
        });

        db.Stories.Add(new Story
        {
            Id = Guid.NewGuid(),
            UserId = "user-mixed",
            Title = "Story 1",
            Explanation = "This is a sufficiently long explanation for the test to pass validation even though it is unit test.",
            ConfidenceLevel = default,
            Category = default,
            NextReviewAt = now.AddDays(-1),
            CreatedAt = now,
            UpdatedAt = now
        });
        
        await db.SaveChangesAsync();

        await using var userDb = MakeDb("user-mixed");
        var svc = new DigestQueryService(userDb);

        var result = await svc.GetDigestAsync("user-mixed", now);

        result.Should().NotBeNull();
        result!.FollowUpsDue.Should().HaveCount(1);
        result.FollowUpsDue[0].CompanyName.Should().Be("TestCorp");
        result.TechnicalReviewsDue.Should().Be(1);
        result.BehavioralReviewsDue.Should().Be(0);
        result.WeakestCategoryName.Should().Be(default(Category).ToString());
    }
}
