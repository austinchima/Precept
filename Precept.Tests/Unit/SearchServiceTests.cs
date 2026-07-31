using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class SearchServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_search_{Guid.NewGuid():N}";

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
    private SearchService _svc = null!;
    private const string UserId = "search-user-1";

    public SearchServiceTests(PostgresContainerFixture fixture)
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

        // Seed the user row so FK constraints on Applications/Stories/Skills.UserId are satisfied
        await using var conn2 = new Npgsql.NpgsqlConnection(_fixture.GetConnectionString(_databaseName));
        await conn2.OpenAsync();
        await using var seedCmd = conn2.CreateCommand();
        seedCmd.CommandText = $"""
            INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
                "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
                "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount",
                "FirstName", "LastName")
            VALUES ('{UserId}', 'search@test.com', 'SEARCH@TEST.COM', 'search@test.com', 'SEARCH@TEST.COM',
                true, '', gen_random_uuid()::text, gen_random_uuid()::text,
                false, false, false, 0,
                'Search', 'User')
            ON CONFLICT DO NOTHING;
            """;
        await seedCmd.ExecuteNonQueryAsync();

        _db = MakeDb(UserId);
        _svc = new SearchService(_db);
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
    public async Task SearchAsync_FindsMatchingEntitiesCaseInsensitively()
    {
        _db.Applications.Add(new Application { UserId = UserId, CompanyName = "Stripe", RoleTitle = "Backend Engineer", FollowUpDate = DateTime.UtcNow });
        _db.Stories.Add(new Story { UserId = UserId, Title = "Stripe Webhooks", Explanation = "Handling idempotent webhooks from stripe 1234567890", Category = Category.Backend });
        _db.Skills.Add(new Skill { UserId = UserId, Name = "Stripe API", ProficiencyLevel = SkillProficiency.Advanced });

        await _db.SaveChangesAsync();

        var results = (await _svc.SearchAsync(UserId, "stripe")).ToList();

        results.Should().HaveCount(3);
        results.Should().Contain(r => r.Type == "Application" && r.Title == "Stripe");
        results.Should().Contain(r => r.Type == "Story" && r.Title == "Stripe Webhooks");
        results.Should().Contain(r => r.Type == "Skill" && r.Title == "Stripe API");
    }
}
