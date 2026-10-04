using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.Usage;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

/// <summary>
/// Usage limits and the global daily caps, computed from real ledger rows in PostgreSQL.
/// </summary>
[Collection("Integration")]
public class UsageGuardTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_usage_{Guid.NewGuid():N}";
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 15, 12, 0, 0, TimeSpan.Zero));

    private const string Feature = UsageFeatures.MockQuestion;

    public UsageGuardTests(PostgresContainerFixture fixture) => _fixture = fixture;

    private sealed class TestCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId { get; } = userId;
    }

    private PreceptDbContext MakeDb() =>
        new(new DbContextOptionsBuilder<PreceptDbContext>().UseNpgsql(_fixture.GetConnectionString(_databaseName)).Options,
            new TestCurrentUser(null));

    private UsageGuard MakeGuard(PreceptDbContext db, UsageSettings settings) =>
        new(db, Options.Create(settings), _time, NullLogger<UsageGuard>.Instance);

    private static UsageSettings Settings(int perDay = 3, int perMonth = 10, int globalCalls = 1000, decimal budget = 100m) => new()
    {
        Features = new Dictionary<string, FeatureLimit>(StringComparer.OrdinalIgnoreCase)
        {
            [Feature] = new FeatureLimit { PerDay = perDay, PerMonth = perMonth },
        },
        GlobalDailyCallLimit = globalCalls,
        GlobalDailyBudgetUsd = budget,
        ModelPrices = new Dictionary<string, ModelPrice>(StringComparer.OrdinalIgnoreCase)
        {
            ["priced-model"] = new ModelPrice { InputPerMillionUsd = 2m, OutputPerMillionUsd = 10m },
        },
    };

    private static UsageRecord Call(string userId, string feature = Feature, string model = "priced-model", int input = 1000, int output = 500) =>
        new(userId, feature, "Fake", model, "test.v1", input, output, TokensEstimated: false, Succeeded: true);

    public async Task InitializeAsync()
    {
        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_databaseName}\"";
        await cmd.ExecuteNonQueryAsync();

        await using var db = MakeDb();
        await db.Database.MigrateAsync();
        foreach (var uid in new[] { "user-a", "user-b" })
        {
            db.Users.Add(new ApplicationUser
            {
                Id = uid,
                UserName = $"{uid}@test.com",
                NormalizedUserName = $"{uid}@TEST.COM",
                Email = $"{uid}@test.com",
                NormalizedEmail = $"{uid}@TEST.COM",
                SecurityStamp = Guid.NewGuid().ToString(),
                FirstName = "Test",
                LastName = uid,
            });
        }
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await using var conn = new NpgsqlConnection(_fixture.RootConnectionString);
        await conn.OpenAsync();
        await using var term = conn.CreateCommand();
        term.CommandText = $"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{_databaseName}' AND pid <> pg_backend_pid();";
        await term.ExecuteNonQueryAsync();
        await using var drop = conn.CreateCommand();
        drop.CommandText = $"DROP DATABASE \"{_databaseName}\"";
        await drop.ExecuteNonQueryAsync();
    }

    [Fact]
    public async Task DailyLimit_IsPerUserAndPerFeature_AndResetsNextDay()
    {
        await using var db = MakeDb();
        var guard = MakeGuard(db, Settings(perDay: 2));

        (await guard.CheckAsync("user-a", Feature)).Remaining.Should().Be(2);
        await guard.RecordAsync(Call("user-a"));
        await guard.RecordAsync(Call("user-a"));

        var denied = await guard.CheckAsync("user-a", Feature);
        denied.Denial.Should().Be(UsageDenial.UserLimit);
        denied.ResetsAt.Should().Be(new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc));

        (await guard.CheckAsync("user-b", Feature)).Allowed.Should().BeTrue("limits are per user");
        (await guard.CheckAsync("user-a", UsageFeatures.MockEvaluate)).Allowed.Should().BeTrue("limits are per feature");

        _time.Advance(TimeSpan.FromDays(1));
        (await guard.CheckAsync("user-a", Feature)).Allowed.Should().BeTrue("the daily allowance resets at UTC midnight");
    }

    [Fact]
    public async Task MonthlyLimit_ResetsAtStartOfNextMonth()
    {
        await using var db = MakeDb();
        var guard = MakeGuard(db, Settings(perDay: 10, perMonth: 3));

        for (var day = 0; day < 3; day++)
        {
            await guard.RecordAsync(Call("user-a"));
            _time.Advance(TimeSpan.FromDays(1));
        }

        var denied = await guard.CheckAsync("user-a", Feature);
        denied.Denial.Should().Be(UsageDenial.UserLimit);
        denied.ResetsAt.Should().Be(new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task FailedCalls_CountTowardTheLimit()
    {
        await using var db = MakeDb();
        var guard = MakeGuard(db, Settings(perDay: 1));

        await guard.RecordAsync(Call("user-a") with { Succeeded = false });

        (await guard.CheckAsync("user-a", Feature)).Allowed.Should().BeFalse();
    }

    [Fact]
    public async Task GlobalDailyCallCap_StopsEveryUser()
    {
        await using var db = MakeDb();
        var guard = MakeGuard(db, Settings(perDay: 100, perMonth: 100, globalCalls: 2));

        await guard.RecordAsync(Call("user-a", model: "unpriced-model"));
        await guard.RecordAsync(Call("user-a", model: "unpriced-model"));

        var result = await guard.CheckAsync("user-b", Feature);
        result.Denial.Should().Be(UsageDenial.GlobalBudget);
    }

    [Fact]
    public async Task GlobalUsdBudget_CountsPricedCalls()
    {
        await using var db = MakeDb();
        // Each priced call: 1,000 in x $2/M + 500 out x $10/M = $0.007.
        var guard = MakeGuard(db, Settings(perDay: 100, perMonth: 100, budget: 0.014m));

        await guard.RecordAsync(Call("user-a"));
        (await guard.CheckAsync("user-b", Feature)).Allowed.Should().BeTrue();

        await guard.RecordAsync(Call("user-a"));
        (await guard.CheckAsync("user-b", Feature)).Denial.Should().Be(UsageDenial.GlobalBudget);
    }

    [Fact]
    public async Task Record_PricesKnownModels_AndLeavesUnknownCostNull()
    {
        await using var db = MakeDb();
        var guard = MakeGuard(db, Settings());

        await guard.RecordAsync(Call("user-a", model: "priced-model", input: 1_000_000, output: 100_000));
        await guard.RecordAsync(Call("user-a", model: "unpriced-model"));

        var rows = await db.UsageLedger.IgnoreQueryFilters().Where(r => r.UserId == "user-a").OrderBy(r => r.Model).ToListAsync();
        rows.Should().HaveCount(2);
        rows[0].Model.Should().Be("priced-model");
        rows[0].EstimatedCostUsd.Should().Be(3.0m);
        rows[0].InputTokens.Should().Be(1_000_000);
        rows[1].EstimatedCostUsd.Should().BeNull();
        rows.Should().OnlyContain(r => r.Units == 1 && r.PromptVersion == "test.v1" && r.CreatedAt == _time.GetUtcNow().UtcDateTime);
    }
}
