using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class JobDescriptionServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_jd_{Guid.NewGuid():N}";
    private readonly JobDescriptionKeywordExtractor _extractor = new();

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
    private JobDescriptionService _svc = null!;

    public JobDescriptionServiceTests(PostgresContainerFixture fixture)
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

        migrateDb.Users.Add(new ApplicationUser
        {
            Id = "user-jd",
            UserName = "user-jd@test.com",
            NormalizedUserName = "USER-JD@TEST.COM",
            Email = "user-jd@test.com",
            NormalizedEmail = "USER-JD@TEST.COM",
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            FirstName = "Test",
            LastName = "User"
        });

        migrateDb.Skills.AddRange(
            new Skill { Id = Guid.NewGuid(), UserId = "user-jd", Name = "React", ProficiencyLevel = SkillProficiency.Advanced },
            new Skill { Id = Guid.NewGuid(), UserId = "user-jd", Name = "TypeScript", ProficiencyLevel = SkillProficiency.Advanced },
            new Skill { Id = Guid.NewGuid(), UserId = "user-jd", Name = "Docker", ProficiencyLevel = SkillProficiency.Intermediate });

        await migrateDb.SaveChangesAsync();

        _db = MakeDb("user-jd");
        _svc = new JobDescriptionService(_db, _extractor, NullLogger<JobDescriptionService>.Instance);
    }

    public Task DisposeAsync()
    {
        return _db.DisposeAsync().AsTask();
    }

    [Fact]
    public async Task CreateJobDescriptionAsync_WithoutKeywords_ExtractsAndScores()
    {
        var request = new CreateJobDescriptionRequest
        {
            CompanyName = "Stripe",
            RoleTitle = "Frontend Engineer",
            Description = "Looking for React, TypeScript, GraphQL, and Kubernetes skills.",
            Location = "Remote",
            IsRemote = true,
            Source = "test"
        };

        var response = await _svc.CreateJobDescriptionAsync("user-jd", request);

        response.ExtractedKeyWords.Should().Contain("React", "TypeScript", "GraphQL", "Kubernetes");
        response.MissingKeyWords.Should().Contain("GraphQL", "Kubernetes");
        response.MissingKeyWords.Should().NotContain("React").And.NotContain("TypeScript");
        response.YourMatchScore.Should().Be(50);
    }

    [Fact]
    public async Task CreateJobDescriptionAsync_WithKeywordOverride_UsesOverride()
    {
        var request = new CreateJobDescriptionRequest
        {
            CompanyName = "Stripe",
            RoleTitle = "Frontend Engineer",
            Description = "Looking for React and TypeScript.",
            ExtractedKeyWords = ["Go", "Rust"],
            Location = "Remote",
            IsRemote = true,
            Source = "test"
        };

        var response = await _svc.CreateJobDescriptionAsync("user-jd", request);

        response.ExtractedKeyWords.Should().BeEquivalentTo(["Go", "Rust"]);
        response.YourMatchScore.Should().Be(0);
        response.MissingKeyWords.Should().BeEquivalentTo(["Go", "Rust"]);
    }

    [Fact]
    public async Task UpdateJobDescriptionAsync_RecomputesKeywordsAndScore()
    {
        var createRequest = new CreateJobDescriptionRequest
        {
            CompanyName = "Stripe",
            RoleTitle = "Frontend Engineer",
            Description = "Looking for React skills.",
            Location = "Remote",
            IsRemote = true,
            Source = "test"
        };
        var created = await _svc.CreateJobDescriptionAsync("user-jd", createRequest);

        var updateRequest = new UpdateJobDescriptionRequest
        {
            CompanyName = created.CompanyName,
            RoleTitle = created.RoleTitle,
            Description = "Now looking for React, TypeScript, Docker, and AWS.",
            Location = created.Location,
            IsRemote = created.IsRemote,
            Source = created.Source,
            DatePosted = created.DatePosted
        };

        var updated = await _svc.UpdateJobDescriptionAsync("user-jd", created.Id, updateRequest);

        updated.ExtractedKeyWords.Should().Contain("React", "TypeScript", "Docker", "AWS");
        updated.YourMatchScore.Should().Be(75);
        updated.MissingKeyWords.Should().ContainSingle("AWS");
    }

    [Fact]
    public async Task UpdateJobDescriptionAsync_NotFound_ReturnsNull()
    {
        var request = new UpdateJobDescriptionRequest
        {
            CompanyName = "X",
            RoleTitle = "Y",
            Description = "Z",
            Location = "Remote",
            IsRemote = true,
            Source = "test",
            DatePosted = DateTime.UtcNow
        };

        var response = await _svc.UpdateJobDescriptionAsync("user-jd", Guid.NewGuid().ToString(), request);

        response.Should().BeNull();
    }
}
