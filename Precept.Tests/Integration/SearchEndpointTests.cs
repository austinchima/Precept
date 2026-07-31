using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class SearchEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public SearchEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    [Fact]
    public async Task Search_ReturnsResults_ForQuery()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync($"search-{Guid.NewGuid():N}@example.com");

        await client.PostAsJsonAsync("/api/skill", new CreateSkillRequest { Name = "Kubernetes Cluster", Category = "DevOps" });

        var response = await client.GetAsync("/api/search?q=kubernetes");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var results = await response.Content.ReadFromJsonAsync<List<SearchResultDto>>(JsonOptions);
        results.Should().NotBeNull();
        results.Should().Contain(r => r.Title.Contains("Kubernetes"));
    }
}
