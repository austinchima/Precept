using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class StoryEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public StoryEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    private static string UniqueEmail() => $"story-{Guid.NewGuid():N}@example.com";

    private static object ValidPayload(string? explanation = null) => new
    {
        Title = "My JWT Auth Story",
        Explanation = explanation ?? new string('E', 60),
        CodeSnippet = "var token = GenerateJwt();",
        SourceProject = "Precept",
        Category = "Auth",
        ConfidenceLevel = "Solid"
    };

    // ─────────────────────────────────────────────────────────────
    //  Auth enforcement
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStories_Returns401_WithNoAuth()
    {
        var response = await _factory.CreateAnonymousClient().GetAsync("/api/story");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────
    //  Create
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateStory_Returns201_AndPopulatesId()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/story", ValidPayload());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var story = await response.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);
        story!.Id.Should().NotBeEmpty();
        story.Category.Should().Be(Category.Auth);
    }

    [Fact]
    public async Task CreateStory_Returns400_WhenExplanationUnder50Chars()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/story",
            ValidPayload(explanation: "Too short."));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ─────────────────────────────────────────────────────────────
    //  Cross-user IDOR
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStory_Returns404_ForAnotherUsersStory()
    {
        var (clientA, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await clientA.PostAsJsonAsync("/api/story", ValidPayload());
        var storyA = await createResp.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);

        var (clientB, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var getResp = await clientB.GetAsync($"/api/story/{storyA!.Id}");

        getResp.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "user B cannot read user A's story");
    }

    [Fact]
    public async Task UpdateStory_Returns404_ForAnotherUsersStory()
    {
        var (clientA, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await clientA.PostAsJsonAsync("/api/story", ValidPayload());
        var storyA = await createResp.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);

        var (clientB, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var putResp = await clientB.PutAsJsonAsync($"/api/story/{storyA!.Id}", ValidPayload());

        putResp.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "user B cannot modify user A's story");
    }

    [Fact]
    public async Task DeleteStory_Returns404_ForAnotherUsersStory()
    {
        var (clientA, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await clientA.PostAsJsonAsync("/api/story", ValidPayload());
        var storyA = await createResp.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);

        var (clientB, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var deleteResp = await clientB.DeleteAsync($"/api/story/{storyA!.Id}");

        deleteResp.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "user B cannot delete user A's story");
    }

    // ─────────────────────────────────────────────────────────────
    //  Confidence update
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateConfidenceLevel_StampsLastReviewedAt()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        var createResp = await client.PostAsJsonAsync("/api/story", ValidPayload());
        var story = await createResp.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);

        var before = DateTime.UtcNow;
        var patchResp = await client.PatchAsJsonAsync(
            $"/api/story/{story!.Id}/confidence",
            new { ConfidenceLevel = "CanTeach" });
        var after = DateTime.UtcNow;

        patchResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await patchResp.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);
        updated!.LastReviewedAt.Should().NotBeNull()
            .And.BeOnOrAfter(before)
            .And.BeOnOrBefore(after.AddSeconds(1));
        updated.ConfidenceLevel.Should().Be(ConfidenceLevel.CanTeach);
    }

    // ─────────────────────────────────────────────────────────────
    //  Random story — validates EF.Functions.Random() on real Postgres
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetRandomStory_Returns200_AndBelongsToCurrentUser()
    {
        var (client, auth) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());
        for (int i = 0; i < 5; i++)
            await client.PostAsJsonAsync("/api/story", ValidPayload());

        var response = await client.GetAsync("/api/story/random");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "EF.Functions.Random() must translate against real Postgres");
        var story = await response.Content.ReadFromJsonAsync<StoryResponse>(JsonOptions);
        story!.UserId.Should().Be(auth.UserId,
            "random story must belong to the requesting user");
    }
}
