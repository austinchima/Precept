using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

/// <summary>
/// Service-level tests for StoryService.
/// Uses a real Postgres Testcontainer (not InMemory) for relational fidelity.
/// FakeTimeProvider is injected directly into the service for exact timestamp assertions.
/// </summary>
[Collection("Integration")]
public class StoryServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_story_{Guid.NewGuid():N}";
    private readonly FakeTimeProvider _fakeTime;
    private readonly DateTimeOffset _pinnedNow = new(2025, 6, 15, 12, 0, 0, TimeSpan.Zero);

    // Thin ICurrentUser stub — controls which user the DbContext's query filter sees.
    private sealed class TestCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId { get; } = userId;
    }

    private DbContextOptions<PreceptDbContext> DbOptions =>
        new DbContextOptionsBuilder<PreceptDbContext>()
            .UseNpgsql(_fixture.GetConnectionString(_databaseName))
            .Options;

    // Builds a DbContext scoped to the given user — all reads are filtered to that id.
    private PreceptDbContext MakeDb(string? userId) =>
        new(DbOptions, new TestCurrentUser(userId));

    // Default context + service for most tests — operates as "user-a".
    private PreceptDbContext _db = null!;
    private StoryService _svc = null!;

    private const string DefaultUserId = "user-a";

    public StoryServiceTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
        _fakeTime = new FakeTimeProvider();
        _fakeTime.SetUtcNow(_pinnedNow);
    }

    public async Task InitializeAsync()
    {
        // Create isolated database for this test class
        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_databaseName}\"";
        await cmd.ExecuteNonQueryAsync();

        // Run all EF migrations — same schema as production, no drift
        await using var migrateDb = MakeDb(null);
        await migrateDb.Database.MigrateAsync();

        // Seed test users so FK constraints (FK_Stories_AspNetUsers_UserId) are satisfied
        foreach (var uid in new[] { "user-a", "user-b" })
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
                LastName = uid
            });
        }
        await migrateDb.SaveChangesAsync();

        _db = MakeDb(DefaultUserId);
        _svc = new StoryService(_db, NullLogger<StoryService>.Instance, _fakeTime);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();

        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();

        // Two separate commands — Npgsql 8+ pipelines multi-statement CommandText,
        // and PostgreSQL forbids DROP DATABASE inside a pipeline (error 25001).
        await using (var terminate = conn.CreateCommand())
        {
            terminate.CommandText = $"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{_databaseName}' AND pid <> pg_backend_pid();
                """;
            await terminate.ExecuteNonQueryAsync();
        }

        await using (var drop = conn.CreateCommand())
        {
            drop.CommandText = $"DROP DATABASE IF EXISTS \"{_databaseName}\"";
            await drop.ExecuteNonQueryAsync();
        }
    }

    /// <summary>
    /// Seeds a story directly into the database, bypassing the service layer.
    /// Uses a context matched to the story's owner so the entity is visible
    /// through the global query filter on subsequent reads by that user.
    /// </summary>
    private async Task<Story> SeedStory(
        string userId = DefaultUserId,
        ConfidenceLevel confidence = ConfidenceLevel.Okay,
        DateTime? lastReviewedAt = null)
    {
        await using var seedDb = MakeDb(userId);

        var story = new Story
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = $"Story {Guid.NewGuid():N}",
            Explanation = new string('x', 50),
            CodeSnippet = "// code",
            Category = Category.Backend,
            ConfidenceLevel = confidence,
            CreatedAt = _pinnedNow.UtcDateTime,
            UpdatedAt = _pinnedNow.UtcDateTime,
            LastReviewedAt = lastReviewedAt
        };
        seedDb.Stories.Add(story);
        await seedDb.SaveChangesAsync();
        return story;
    }

    private CreateStoryRequest MakeRequest() => new()
    {
        Title = "My Auth Story",
        Explanation = new string('E', 50),
        CodeSnippet = "var x = 1;",
        SourceProject = "Precept",
        Category = Category.Auth,
        ConfidenceLevel = ConfidenceLevel.Solid
    };

    // ─────────────────────────────────────────────────────────────
    //  Create
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateStory_MapsAllFieldsCorrectly()
    {
        var request = MakeRequest();
        var response = await _svc.CreateStoryAsync(DefaultUserId, request);

        response.Id.Should().NotBeEmpty();
        response.Title.Should().Be(request.Title);
        response.Explanation.Should().Be(request.Explanation);
        response.CodeSnippet.Should().Be(request.CodeSnippet);
        response.Category.Should().Be(request.Category);
        response.ConfidenceLevel.Should().Be(request.ConfidenceLevel);
        response.UserId.Should().Be(DefaultUserId);
        response.CreatedAt.Should().Be(_pinnedNow.UtcDateTime);
        response.UpdatedAt.Should().Be(_pinnedNow.UtcDateTime);
    }

    // ─────────────────────────────────────────────────────────────
    //  Delete
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteStory_ReturnsFalse_ForMalformedGuid()
    {
        var result = await _svc.DeleteStoryAsync(DefaultUserId, "not-a-guid");
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteStory_ReturnsFalse_ForAnotherUsersStory()
    {
        // Seed user-b's story through a user-b context — entity lands in the real
        // Postgres database correctly owned by user-b.
        var story = await SeedStory(userId: "user-b");

        // _svc runs as user-a: global filter (UserId == "user-a") + service-layer
        // ownership check both reject the story.
        var result = await _svc.DeleteStoryAsync(DefaultUserId, story.Id.ToString());

        result.Should().BeFalse("user-a cannot delete user-b's story");
    }

    // ─────────────────────────────────────────────────────────────
    //  Confidence update — pinned timestamp
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStoryConfidenceLevel_StampsLastReviewedAt_ToPinnedNow()
    {
        var story = await SeedStory(lastReviewedAt: null);

        var response = await _svc.UpdateStoryConfidenceLevelAsync(
            DefaultUserId, story.Id.ToString(), ConfidenceLevel.CanTeach);

        response.LastReviewedAt.Should().Be(_pinnedNow.UtcDateTime);
        response.UpdatedAt.Should().Be(_pinnedNow.UtcDateTime);
        response.ConfidenceLevel.Should().Be(ConfidenceLevel.CanTeach);
    }

    // ─────────────────────────────────────────────────────────────
    //  Quiz priority
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetQuizStory_Priority1_Unreviewed_BeatsRecentlyReviewed()
    {
        await SeedStory(lastReviewedAt: _pinnedNow.UtcDateTime.AddMinutes(-5));
        var unreviewed = await SeedStory(lastReviewedAt: null);

        var result = await _svc.GetQuizStoryAsync(DefaultUserId);

        result.Id.Should().Be(unreviewed.Id.ToString(),
            "unreviewed stories take priority over reviewed ones");
    }

    [Fact]
    public async Task GetQuizStory_Priority2_Panic_BeatesSolid_WhenAllReviewed()
    {
        var past = _pinnedNow.UtcDateTime.AddHours(-1);
        await SeedStory(confidence: ConfidenceLevel.Solid, lastReviewedAt: past);
        var panicStory = await SeedStory(confidence: ConfidenceLevel.Panic, lastReviewedAt: past);

        var result = await _svc.GetQuizStoryAsync(DefaultUserId);

        result.Id.Should().Be(panicStory.Id.ToString(),
            "Panic/Shaky beats Solid when all stories have been reviewed");
    }

    [Fact]
    public async Task GetQuizStory_Priority3_ReturnsOldestReviewedDate_AsFallback()
    {
        await SeedStory(confidence: ConfidenceLevel.Solid,
            lastReviewedAt: _pinnedNow.UtcDateTime.AddHours(-1));
        var oldest = await SeedStory(confidence: ConfidenceLevel.Solid,
            lastReviewedAt: _pinnedNow.UtcDateTime.AddHours(-10));

        var result = await _svc.GetQuizStoryAsync(DefaultUserId);

        result.Id.Should().Be(oldest.Id.ToString(),
            "fallback returns the story reviewed longest ago");
    }

    [Fact]
    public async Task GetQuizStory_ReturnsEmptyDto_WhenNoStoriesExist()
    {
        var result = await _svc.GetQuizStoryAsync(DefaultUserId);
        result.Id.Should().BeEmpty();
    }
}
