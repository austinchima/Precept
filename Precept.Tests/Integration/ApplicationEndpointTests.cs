using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class ApplicationEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public ApplicationEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    private static string UniqueEmail() => $"app-{Guid.NewGuid():N}@example.com";

    private static object ValidPayload(ApplicationStatus status = ApplicationStatus.Applied) => new
    {
        CompanyName = "Acme Corp",
        RoleTitle = "Senior Engineer",
        Location = "Remote",
        Status = status.ToString(),
        FollowUpDate = DateTime.UtcNow.AddDays(7)
    };

    // ─────────────────────────────────────────────────────────────
    //  Create
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateApplication_Returns200_WithGenesisEvent()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/application", ValidPayload());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var app = await response.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);
        app!.Events.Should().HaveCount(1, "every new application must have one genesis event");
        app.Events[0].Status.Should().Be(ApplicationStatus.Applied);
    }

    // ─────────────────────────────────────────────────────────────
    //  Status filter
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetApplications_WithStatusFilter_ReturnsOnlyMatchingRows()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        await client.PostAsJsonAsync("/api/application", ValidPayload());
        await client.PostAsJsonAsync("/api/application", ValidPayload(ApplicationStatus.Interviewing));

        var response = await client.GetAsync("/api/application?status=Applied");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var apps = await response.Content.ReadFromJsonAsync<List<ApplicationResponse>>(JsonOptions);
        apps!.Should().HaveCount(1);
        apps![0].Status.Should().Be(ApplicationStatus.Applied);
    }

    // ─────────────────────────────────────────────────────────────
    //  Status update — follow-up date within server-clock window
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_ToInterviewing_SetsFollowUpDate_ToFiveDaysFromNow()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await client.PostAsJsonAsync("/api/application", ValidPayload());
        var app = await createResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);

        var before = DateTime.UtcNow;
        var statusResp = await client.PatchAsJsonAsync(
            $"/api/application/{app!.Id}/status",
            new { Status = "Interviewing" });
        var after = DateTime.UtcNow;

        statusResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await statusResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);
        updated!.FollowUpDate.Should()
            .BeOnOrAfter(before.AddDays(5))
            .And.BeOnOrBefore(after.AddDays(5).AddSeconds(1));
    }

    [Fact]
    public async Task UpdateStatus_ToRejected_SetsFollowUpDate_ToApproximatelyNow()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await client.PostAsJsonAsync("/api/application", ValidPayload());
        var app = await createResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);

        var before = DateTime.UtcNow;
        var statusResp = await client.PatchAsJsonAsync(
            $"/api/application/{app!.Id}/status",
            new { Status = "Rejected" });
        var after = DateTime.UtcNow;

        statusResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await statusResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);
        updated!.FollowUpDate.Should()
            .BeOnOrAfter(before)
            .And.BeOnOrBefore(after.AddSeconds(1));
    }

    // ─────────────────────────────────────────────────────────────
    //  Cross-user IDOR
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateApplication_IsBlocked_ForAnotherUsersApplication()
    {
        var (clientA, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await clientA.PostAsJsonAsync("/api/application", ValidPayload());
        var appA = await createResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);

        var (clientB, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var updateResp = await clientB.PutAsJsonAsync(
            $"/api/application/{appA!.Id}", ValidPayload());

        updateResp.StatusCode.Should().NotBe(HttpStatusCode.OK,
            "user B cannot update user A's application");
    }

    [Fact]
    public async Task DeleteApplication_IsBlocked_ForAnotherUsersApplication()
    {
        var (clientA, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await clientA.PostAsJsonAsync("/api/application", ValidPayload());
        var appA = await createResp.Content.ReadFromJsonAsync<ApplicationResponse>(JsonOptions);

        var (clientB, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var deleteResp = await clientB.DeleteAsync($"/api/application/{appA!.Id}");

        deleteResp.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
            "user B cannot delete user A's application");
    }
}
