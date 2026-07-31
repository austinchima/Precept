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
}
