using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class SkillEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public SkillEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    [Fact]
    public async Task GetSkills_ReturnsPagedResponse()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync($"skill-{Guid.NewGuid():N}@example.com");

        var createResp = await client.PostAsJsonAsync("/api/skill", new CreateSkillRequest
        {
            Name = "TypeScript",
            Category = "Language",
            ProficiencyLevel = SkillProficiency.Expert
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);

        var response = await client.GetAsync("/api/skill");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResponse<SkillResponse>>(JsonOptions);
        paged.Should().NotBeNull();
        paged!.Items.Should().Contain(s => s.Name == "TypeScript");
    }
}
