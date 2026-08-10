using System.Reflection;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using NSubstitute;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class DailyDigestServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_dailydigest_{Guid.NewGuid():N}";

    private DbContextOptions<PreceptDbContext> DbOptions =>
        new DbContextOptionsBuilder<PreceptDbContext>()
            .UseNpgsql(_fixture.GetConnectionString(_databaseName))
            .Options;

    private sealed class TestCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId { get; } = userId;
    }

    private PreceptDbContext MakeDb(string? userId) =>
        new(DbOptions, new TestCurrentUser(userId));

    public DailyDigestServiceTests(PostgresContainerFixture fixture)
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
    public async Task ProcessDigestsAsync_SetsLastDigestSentAt_ToPreventDoubleSend()
    {
        var utcNow = DateTime.UtcNow;
        var today = utcNow.Date;
        var currentHour = utcNow.Hour;

        await using var db = MakeDb(null);
        var user = new ApplicationUser
        {
            Id = "user-idempotency",
            UserName = "user@test.com",
            NormalizedUserName = "USER@TEST.COM",
            Email = "user@test.com",
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            FirstName = "Test",
            LastName = "User",
            EmailDigestEnabled = true,
            DigestHourUtc = currentHour,
            LastDigestSentAt = null
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var emailServiceMock = Substitute.For<IEmailService>();
        
        var queryServiceMock = Substitute.For<IDigestQueryService>();
        queryServiceMock.GetDigestAsync(user.Id, Arg.Any<DateTime>())
            .Returns(Task.FromResult<DigestContent?>(new DigestContent(new List<FollowUpItem>(), 1, 0, null, null)));

        var configMock = Substitute.For<IConfiguration>();

        var services = new ServiceCollection();
        services.AddScoped(sp => MakeDb(null)); 
        services.AddSingleton(emailServiceMock);
        services.AddSingleton(queryServiceMock);
        services.AddSingleton(configMock);
        var serviceProvider = services.BuildServiceProvider();

        var service = new DailyDigestService(serviceProvider, NullLogger<DailyDigestService>.Instance);
        var method = typeof(DailyDigestService).GetMethod("ProcessDigestsAsync", BindingFlags.NonPublic | BindingFlags.Instance);
        
        // First run
        await (Task)method!.Invoke(service, new object[] { CancellationToken.None })!;

        // Verify email sent
        await emailServiceMock.Received(1).SendEmailAsync(user.Email, Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
        
        // Verify user was updated
        var updatedUser = await db.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);
        updatedUser.LastDigestSentAt.Should().Be(today);

        // Run again
        await (Task)method!.Invoke(service, new object[] { CancellationToken.None })!;

        // Should not have sent a second email
        await emailServiceMock.Received(1).SendEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }
}
