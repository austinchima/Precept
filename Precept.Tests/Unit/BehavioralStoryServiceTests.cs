using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class BehavioralStoryServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_beh_{Guid.NewGuid():N}";

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
    private BehavioralStoryService _svc = null!;
    private const string UserId = "beh-user-1";

    public BehavioralStoryServiceTests(PostgresContainerFixture fixture)
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

        // Seed the user row so FK constraints on Stories.UserId are satisfied
        await using var conn2 = new Npgsql.NpgsqlConnection(_fixture.GetConnectionString(_databaseName));
        await conn2.OpenAsync();
        await using var seedCmd = conn2.CreateCommand();
        seedCmd.CommandText = $"""
            INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
                "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
                "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount",
                "FirstName", "LastName")
            VALUES ('{UserId}', 'beh@test.com', 'BEH@TEST.COM', 'beh@test.com', 'BEH@TEST.COM',
                true, '', gen_random_uuid()::text, gen_random_uuid()::text,
                false, false, false, 0,
                'Beh', 'User')
            ON CONFLICT DO NOTHING;
            """;
        await seedCmd.ExecuteNonQueryAsync();

        _db = MakeDb(UserId);
        _svc = new BehavioralStoryService(_db);
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
    public async Task CreateStoryAsync_SavesAndReturnsBehavioralStory()
    {
        var req = new CreateBehavioralStoryRequest
        {
            Title = "Outage Incident",
            Situation = "DB CPU spiked to 100%",
            Task = "Restore API latency",
            Action = "Added missing index on UserId",
            Result = "Latency dropped from 2s to 15ms"
        };

        var result = await _svc.CreateStoryAsync(UserId, req);

        result.Should().NotBeNull();
        result.Title.Should().Be("Outage Incident");

        var stories = await _svc.GetStoriesAsync(UserId);
        stories.Items.Should().HaveCount(1);
    }
}
