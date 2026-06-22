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
/// Service-level tests for ApplicationService.
/// Uses a real Postgres Testcontainer (not InMemory) to catch EF translation issues,
/// FK violations, and filter behaviour that InMemory silently swallows.
/// FakeTimeProvider is still injected directly into the service for exact clock assertions.
/// </summary>
[Collection("Integration")]
public class ApplicationServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_app_{Guid.NewGuid():N}";
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
    private ApplicationService _svc = null!;

    public ApplicationServiceTests(PostgresContainerFixture fixture)
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

        // Run all EF migrations (same as production schema — no drift possible)
        await using var migrateDb = MakeDb(null);
        await migrateDb.Database.MigrateAsync();

        // Seed test users so FK constraints (FK_Applications_AspNetUsers_UserId) are satisfied
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

        _db = MakeDb("user-a");
        _svc = new ApplicationService(_db, NullLogger<ApplicationService>.Instance, _fakeTime);
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

    private static CreateApplicationRequest MakeRequest(
        ApplicationStatus status = ApplicationStatus.Applied) => new()
    {
        CompanyName = "Acme Corp",
        RoleTitle = "Senior Engineer",
        Status = status,
        FollowUpDate = DateTime.UtcNow.AddDays(7)
    };

    // ─────────────────────────────────────────────────────────────
    //  Create
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateApplication_PersistsEntity_AndCreatesGenesisEvent()
    {
        var response = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        response.Id.Should().NotBeEmpty();
        var events = await _db.ApplicationEvents.ToListAsync();
        events.Should().HaveCount(1);
        events[0].Status.Should().Be(ApplicationStatus.Applied);
        events[0].DateOccurred.Should().Be(_pinnedNow.UtcDateTime);
    }

    // ─────────────────────────────────────────────────────────────
    //  Status change
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateApplicationStatus_WhenStatusChanges_AppendsNewEvent()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        await _svc.UpdateApplicationStatusAsync("user-a", created.Id, ApplicationStatus.Interviewing);

        var events = await _db.ApplicationEvents.ToListAsync();
        events.Should().HaveCount(2);
        events.Should().Contain(e => e.Status == ApplicationStatus.Interviewing);
    }

    [Fact]
    public async Task UpdateApplicationStatus_WhenStatusUnchanged_DoesNotAppendEvent()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        await _svc.UpdateApplicationStatusAsync("user-a", created.Id, ApplicationStatus.Applied);

        var events = await _db.ApplicationEvents.ToListAsync();
        events.Should().HaveCount(1, "no duplicate event for an unchanged status");
    }

    // ─────────────────────────────────────────────────────────────
    //  Follow-up date — exact assertions via pinned clock
    // ─────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(ApplicationStatus.Applied, 7)]
    [InlineData(ApplicationStatus.PhoneScreen, 3)]
    [InlineData(ApplicationStatus.Interviewing, 5)]
    [InlineData(ApplicationStatus.Offer, 2)]
    [InlineData(ApplicationStatus.Ghosted, 14)]
    public async Task UpdateApplicationStatus_SetsCorrectFollowUpDate(
        ApplicationStatus status, int expectedDays)
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        var updated = await _svc.UpdateApplicationStatusAsync("user-a", created.Id, status);

        var expected = _pinnedNow.UtcDateTime.AddDays(expectedDays);
        updated.FollowUpDate.Should().Be(expected);
    }

    [Fact]
    public async Task UpdateApplicationStatus_Rejected_SetsFollowUpToExactPinnedNow()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        var updated = await _svc.UpdateApplicationStatusAsync("user-a", created.Id, ApplicationStatus.Rejected);

        updated.FollowUpDate.Should().Be(_pinnedNow.UtcDateTime);
    }

    // ─────────────────────────────────────────────────────────────
    //  User isolation — global filter + service-layer check
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetApplication_ReturnsEmpty_ForAnotherUsersApplication()
    {
        // Seed as user-a
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        // Read through a context + service running as user-b.
        // Global filter: UserId == "user-b" — user-a's application is invisible.
        await using var dbAsB = MakeDb("user-b");
        var svcAsB = new ApplicationService(dbAsB, NullLogger<ApplicationService>.Instance, _fakeTime);

        var result = await svcAsB.GetApplicationAsync("user-b", created.Id);

        result.Id.Should().BeEmpty("user-b's context cannot see user-a's application");
    }

    // ─────────────────────────────────────────────────────────────
    //  Delete
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteApplication_ReturnsTrue_AndEntityIsGone()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        var success = await _svc.DeleteApplicationAsync("user-a", created.Id);

        success.Should().BeTrue();
        (await _db.Applications.ToListAsync()).Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteApplication_ReturnsFalse_ForInvalidGuid()
    {
        var result = await _svc.DeleteApplicationAsync("user-a", "not-a-guid");
        result.Should().BeFalse();
    }
}
