using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class DashboardEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public DashboardEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    [Fact]
    public async Task GetDashboard_Returns401_WhenUnauthenticated()
    {
        var client = _factory.CreateAnonymousClient();
        var resp = await client.GetAsync("/api/dashboard");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDashboard_ReturnsStats_WhenAuthenticated()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync($"dash-{Guid.NewGuid():N}@example.com");

        var resp = await client.GetAsync("/api/dashboard");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var stats = await resp.Content.ReadFromJsonAsync<DashboardStatsResponse>(JsonOptions);
        stats.Should().NotBeNull();
        stats!.StoryStats.Should().NotBeNull();
        stats.ApplicationStats.Should().NotBeNull();
        stats.JobDescriptionStats.Should().NotBeNull();
    }

    [Fact]
    public async Task ReviewQueue_AndDashboardCount_CoverMoreThanOnePage_AndAgree()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync($"queue-{Guid.NewGuid():N}@example.com");

        // New accounts are seeded with example stories; add enough that the total exceeds one page (25).
        for (var i = 0; i < 30; i++)
        {
            var created = await client.PostAsJsonAsync("/api/story", new
            {
                Title = $"Story {i}",
                Explanation = new string('E', 60),
                CodeSnippet = "var x = 1;",
                SourceProject = "Precept",
                Category = "Backend",
                ConfidenceLevel = "Okay"
            });
            created.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        var stats = await client.GetFromJsonAsync<DashboardStatsResponse>("/api/dashboard", JsonOptions);
        var queue = await client.GetFromJsonAsync<ReviewQueueResponse>("/api/dashboard/review-queue?limit=5", JsonOptions);

        queue!.Items.Should().HaveCount(5);
        queue.Total.Should().BeGreaterThan(25, "new stories have no review scheduled yet, so all 30 are due");
        stats!.StoryStats.NeedsReview.Should().Be(queue.Total, "the dashboard count and the queue use the same rule");
        stats.StoryStats.TotalStories.Should().BeGreaterThanOrEqualTo(30);
    }

    [Fact]
    public async Task ReviewQueue_DoesNotIncludeAnotherUsersStories()
    {
        var (owner, _) = await _factory.CreateAuthenticatedClientAsync($"owner-{Guid.NewGuid():N}@example.com");
        var (other, _) = await _factory.CreateAuthenticatedClientAsync($"other-{Guid.NewGuid():N}@example.com");
        var created = await owner.PostAsJsonAsync("/api/story", new
        {
            Title = "Owner only story",
            Explanation = new string('E', 60),
            CodeSnippet = "var x = 1;",
            SourceProject = "Precept",
            Category = "Backend",
            ConfidenceLevel = "Panic"
        });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var ownerQueue = await owner.GetFromJsonAsync<ReviewQueueResponse>("/api/dashboard/review-queue?limit=50", JsonOptions);
        ownerQueue!.Items.Should().Contain(i => i.Title == "Owner only story", "the owner sees their own due story");

        var queue = await other.GetFromJsonAsync<ReviewQueueResponse>("/api/dashboard/review-queue?limit=50", JsonOptions);

        queue!.Items.Should().NotContain(i => i.Title == "Owner only story");
    }
}
