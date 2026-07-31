using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using NSubstitute;
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
    private IJobDescriptionService _jobDescriptionService = null!;
    private IJobPostingContentExtractor _contentExtractor = null!;
    private IHttpClientFactory _httpClientFactory = null!;

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

        _jobDescriptionService = Substitute.For<IJobDescriptionService>();
        _contentExtractor = Substitute.For<IJobPostingContentExtractor>();
        _httpClientFactory = Substitute.For<IHttpClientFactory>();

        _db = MakeDb("user-a");
        _svc = new ApplicationService(
            _db,
            _jobDescriptionService,
            _contentExtractor,
            _httpClientFactory,
            NullLogger<ApplicationService>.Instance,
            _fakeTime);
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

    [Fact]
    public async Task UpdateApplication_WhenStatusChanges_AppendsNewEvent()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        await _svc.UpdateApplicationAsync("user-a", created.Id, new UpdateApplicationRequest
        {
            CompanyName = created.CompanyName,
            RoleTitle = created.RoleTitle,
            Status = ApplicationStatus.Interviewing,
            DateApplied = created.DateApplied,
            FollowUpDate = created.FollowUpDate
        });

        var events = await _db.ApplicationEvents.ToListAsync();
        events.Should().HaveCount(2);
        events.Should().Contain(e => e.Status == ApplicationStatus.Interviewing);
    }

    [Fact]
    public async Task UpdateApplication_WhenStatusUnchanged_DoesNotAppendEvent()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        await _svc.UpdateApplicationAsync("user-a", created.Id, new UpdateApplicationRequest
        {
            CompanyName = "Acme Corp Updated",
            RoleTitle = created.RoleTitle,
            Status = ApplicationStatus.Applied,
            DateApplied = created.DateApplied,
            FollowUpDate = created.FollowUpDate
        });

        var events = await _db.ApplicationEvents.ToListAsync();
        events.Should().HaveCount(1, "editing fields without changing status should not create an event");
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
    public async Task GetApplication_ReturnsNull_ForAnotherUsersApplication()
    {
        // Seed as user-a
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        // Read through a context + service running as user-b.
        // Global filter: UserId == "user-b" — user-a's application is invisible.
        await using var dbAsB = MakeDb("user-b");
        var svcAsB = new ApplicationService(
            dbAsB,
            Substitute.For<IJobDescriptionService>(),
            Substitute.For<IJobPostingContentExtractor>(),
            Substitute.For<IHttpClientFactory>(),
            NullLogger<ApplicationService>.Instance,
            _fakeTime);

        var result = await svcAsB.GetApplicationAsync("user-b", created.Id);

        result.Should().BeNull("user-b's context cannot see user-a's application");
    }

    // ─────────────────────────────────────────────────────────────
    //  Delete (Soft Delete)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteApplication_ReturnsTrue_AndEntityIsSoftDeleted()
    {
        var created = await _svc.CreateApplicationAsync("user-a", MakeRequest());

        var success = await _svc.DeleteApplicationAsync("user-a", created.Id);

        success.Should().BeTrue();
        (await _db.Applications.ToListAsync()).Should().BeEmpty();

        var softDeleted = await _db.Applications.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == Guid.Parse(created.Id));
        softDeleted.Should().NotBeNull();
        softDeleted!.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteApplication_ReturnsFalse_ForInvalidGuid()
    {
        var result = await _svc.DeleteApplicationAsync("user-a", "not-a-guid");
        result.Should().BeFalse();
    }

    // ─────────────────────────────────────────────────────────────
    //  Capture
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CaptureApplicationAsync_FetchesPage_CreatesJobDescriptionAndApplication()
    {
        const string url = "https://example.com/jobs/software-engineer";
        const string html = "<html><head><title>Software Engineer at Acme</title></head><body>Remote. $120k - $150k. We are hiring.</body></html>";

        _httpClientFactory.CreateClient().Returns(_ => MakeFakeHttpClient(html));
        _contentExtractor.Extract(url, html, null).Returns(new ExtractedJobPosting
        {
            CompanyName = "Acme",
            RoleTitle = "Software Engineer",
            Description = "Remote. $120k - $150k. We are hiring.",
            Location = "Remote",
            SalaryRange = "$120k - $150k",
            IsRemote = true,
            Source = url
        });
        _jobDescriptionService.CreateJobDescriptionAsync("user-a", Arg.Any<CreateJobDescriptionRequest>())
            .Returns(new JobDescriptionResponse { Id = Guid.NewGuid().ToString() });

        var response = await _svc.CaptureApplicationAsync("user-a", new CaptureApplicationRequest { Url = url });

        response.CompanyName.Should().Be("Acme");
        response.RoleTitle.Should().Be("Software Engineer");
        response.Source.Should().Be(url);
        response.Status.Should().Be(ApplicationStatus.Applied);
    }

    [Theory]
    [InlineData("ftp://example.com/job")]
    [InlineData("not-a-url")]
    public async Task CaptureApplicationAsync_RejectsInvalidUrls(string url)
    {
        var act = async () => await _svc.CaptureApplicationAsync("user-a", new CaptureApplicationRequest { Url = url });
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Theory]
    [InlineData("http://localhost/job")]
    [InlineData("http://127.0.0.1/job")]
    [InlineData("http://192.168.1.1/job")]
    [InlineData("http://10.0.0.1/job")]
    public async Task CaptureApplicationAsync_RejectsPrivateHosts(string url)
    {
        var act = async () => await _svc.CaptureApplicationAsync("user-a", new CaptureApplicationRequest { Url = url });
        await act.Should().ThrowAsync<ArgumentException>();
    }

    private static System.Net.Http.HttpClient MakeFakeHttpClient(string responseBody)
    {
        var handler = new FakeHttpMessageHandler(responseBody);
        return new System.Net.Http.HttpClient(handler);
    }

    private sealed class FakeHttpMessageHandler(string responseBody) : System.Net.Http.HttpMessageHandler
    {
        protected override System.Threading.Tasks.Task<System.Net.Http.HttpResponseMessage> SendAsync(
            System.Net.Http.HttpRequestMessage request,
            System.Threading.CancellationToken cancellationToken)
        {
            return System.Threading.Tasks.Task.FromResult(new System.Net.Http.HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.OK,
                Content = new System.Net.Http.StringContent(responseBody)
            });
        }
    }
}
