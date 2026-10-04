using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Microsoft.Extensions.Time.Testing;
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
    private static readonly DateTime Now = new(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(Now));

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
        _svc = new DashboardService(_db, _time, Microsoft.Extensions.Logging.Abstractions.NullLogger<DashboardService>.Instance);
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
            new Story { UserId = UserId, Title = "S2", Explanation = "Exp 2 1234567890 1234567890 1234567890 1234567890", Category = Category.Database, ConfidenceLevel = ConfidenceLevel.Solid, LastReviewedAt = Now.AddDays(-1), NextReviewAt = Now.AddDays(3) }
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

    private static Story Tech(string title, DateTime? next, ConfidenceLevel level = ConfidenceLevel.Okay, bool deleted = false) => new()
    {
        UserId = UserId,
        Title = title,
        Explanation = "Explanation long enough to satisfy the fifty character minimum rule.",
        Category = Category.Backend,
        ConfidenceLevel = level,
        NextReviewAt = next,
        // A scheduled story has been reviewed before; this makes the test fail under the old
        // "never reviewed or Panic/Shaky" rule, which ignored NextReviewAt.
        LastReviewedAt = next?.AddDays(-3),
        IsDeleted = deleted,
    };

    private static BehavioralStory Star(string title, DateTime? next, ConfidenceLevel level = ConfidenceLevel.Okay) => new()
    {
        UserId = UserId,
        Title = title,
        Situation = "s",
        Task = "t",
        Action = "a",
        Result = "r",
        ConfidenceLevel = level,
        NextReviewAt = next,
    };

    [Fact]
    public async Task NeedsReview_CountsBothStoryKinds_DueByNextReviewAt()
    {
        _db.Stories.AddRange(
            Tech("never scheduled", null),
            Tech("overdue", Now.AddDays(-2)),
            Tech("due exactly now", Now),
            Tech("not due, even though shaky", Now.AddDays(5), ConfidenceLevel.Panic),
            Tech("deleted and overdue", Now.AddDays(-1), deleted: true));
        _db.BehavioralStories.AddRange(
            Star("star never scheduled", null),
            Star("star not due", Now.AddDays(1)));
        await _db.SaveChangesAsync();

        var result = await _svc.GetDashboardStatsAsync(UserId);

        result.StoryStats.NeedsReview.Should().Be(4, "three technical and one STAR story are due; deleted and future ones are not");
        result.StoryStats.TotalStories.Should().Be(4, "deleted stories are not counted");
        result.StoryStats.TotalBehavioralStories.Should().Be(2);
    }

    [Fact]
    public async Task ActiveApplications_CountsAppliedPhoneScreenAndInterviewing()
    {
        foreach (var status in Enum.GetValues<ApplicationStatus>())
        {
            _db.Applications.Add(new Application { UserId = UserId, CompanyName = status.ToString(), RoleTitle = "Dev", Status = status, FollowUpDate = Now });
        }
        await _db.SaveChangesAsync();

        var result = await _svc.GetDashboardStatsAsync(UserId);

        result.ApplicationStats.ActiveApplications.Should().Be(3);
    }

    [Fact]
    public async Task ReviewQueue_ReturnsTotalBeyondOnePage_WeakestFirst_AndRespectsLimit()
    {
        for (var i = 0; i < 28; i++) _db.Stories.Add(Tech($"tech {i}", Now.AddDays(-1), ConfidenceLevel.Solid));
        _db.Stories.Add(Tech("panic tech", null, ConfidenceLevel.Panic));
        _db.Stories.Add(Tech("future", Now.AddDays(2), ConfidenceLevel.Panic));
        _db.BehavioralStories.Add(Star("shaky star", Now.AddHours(-1), ConfidenceLevel.Shaky));
        await _db.SaveChangesAsync();

        var queue = await _svc.GetReviewQueueAsync(UserId, limit: 5);

        queue.Total.Should().Be(30, "29 technical and 1 STAR story are due");
        queue.Items.Should().HaveCount(5);
        queue.Items[0].Title.Should().Be("panic tech");
        queue.Items[0].Kind.Should().Be("Technical");
        queue.Items[1].Title.Should().Be("shaky star");
        queue.Items[1].Kind.Should().Be("Behavioral");
        queue.Items.Should().NotContain(i => i.Title == "future");
    }

    [Fact]
    public async Task ReviewQueue_LimitIsClamped()
    {
        _db.Stories.Add(Tech("one", null));
        await _db.SaveChangesAsync();

        (await _svc.GetReviewQueueAsync(UserId, limit: 0)).Items.Should().HaveCount(1, "a limit below 1 is raised to 1");
        (await _svc.GetReviewQueueAsync(UserId, limit: 10_000)).Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task ReviewQueue_BreaksTiesByOldestStoryFirst()
    {
        // Five equally weak, never-scheduled stories inserted newest first; only the CreatedAt
        // tie-break orders them oldest first (a random order passes by chance 1 time in 120).
        for (var age = 1; age <= 5; age++)
        {
            var story = Tech($"age {age}", null);
            story.CreatedAt = Now.AddDays(-age);
            _db.Stories.Add(story);
        }
        await _db.SaveChangesAsync();

        var queue = await _svc.GetReviewQueueAsync(UserId, limit: 10);

        queue.Items.Select(i => i.Title).Should().Equal("age 5", "age 4", "age 3", "age 2", "age 1");
    }
}
