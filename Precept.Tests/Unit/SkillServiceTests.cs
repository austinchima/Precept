using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class SkillServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_skill_{Guid.NewGuid():N}";

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
    private SkillService _svc = null!;
    private const string UserId = "skill-user-1";

    public SkillServiceTests(PostgresContainerFixture fixture)
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

        // Seed the user row so FK constraints on Skills.UserId are satisfied
        await using var conn2 = new Npgsql.NpgsqlConnection(_fixture.GetConnectionString(_databaseName));
        await conn2.OpenAsync();
        await using var seedCmd = conn2.CreateCommand();
        seedCmd.CommandText = $"""
            INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
                "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
                "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount",
                "FirstName", "LastName")
            VALUES ('{UserId}', 'test@test.com', 'TEST@TEST.COM', 'test@test.com', 'TEST@TEST.COM',
                true, '', gen_random_uuid()::text, gen_random_uuid()::text,
                false, false, false, 0,
                'Test', 'User')
            ON CONFLICT DO NOTHING;
            """;
        await seedCmd.ExecuteNonQueryAsync();

        _db = MakeDb(UserId);
        _svc = new SkillService(_db, NullLogger<SkillService>.Instance);
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
    public async Task CreateSkillAsync_SavesAndReturnsSkill()
    {
        var req = new CreateSkillRequest { Name = "C#", Category = "Language", ProficiencyLevel = SkillProficiency.Expert };

        var result = await _svc.CreateSkillAsync(UserId, req);

        result.Should().NotBeNull();
        result.Name.Should().Be("C#");
        result.ProficiencyLevel.Should().Be(SkillProficiency.Expert);

        var list = await _svc.GetSkillsAsync(UserId);
        list.Items.Should().HaveCount(1);
    }
}
