using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.DTOs;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class MockInterviewEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public MockInterviewEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    private static string UniqueEmail() => $"mock-{Guid.NewGuid():N}@example.com";

    // ─────────────────────────────────────────────────────────────
    //  Question Generation
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GenerateQuestion_Returns401_WhenUnauthenticated()
    {
        var response = await _factory.CreateAnonymousClient()
            .PostAsJsonAsync("/api/mockinterview/generate-question", new GenerateMockQuestionRequest());

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GenerateQuestion_Returns200_WithGeneratedQuestion()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/mockinterview/generate-question", new GenerateMockQuestionRequest
        {
            RoleTitle = "Staff Systems Engineer",
            JobDescription = "Designing distributed systems, high availability, and Kafka streaming architectures.",
            Category = "System Design & Distributed Systems"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<MockQuestionResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.Question.Should().NotBeNullOrWhiteSpace();
        result.Category.Should().NotBeNullOrWhiteSpace();
        result.FocusArea.Should().NotBeNullOrWhiteSpace();
        result.ContextTips.Should().NotBeNullOrWhiteSpace();
    }

    // ─────────────────────────────────────────────────────────────
    //  Answer Evaluation
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task EvaluateAnswer_Returns401_WhenUnauthenticated()
    {
        var response = await _factory.CreateAnonymousClient()
            .PostAsJsonAsync("/api/mockinterview/evaluate", new EvaluateMockAnswerRequest
            {
                Question = "Tell me about a time you optimized a slow query.",
                AnswerTranscript = "I optimized Postgres indexes and cut latency by 80%."
            });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task EvaluateAnswer_Returns200_WithSTARFeedbackAndModelAnswer()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/mockinterview/evaluate", new EvaluateMockAnswerRequest
        {
            Question = "Tell me about a complex project that was falling behind schedule. What steps did you take?",
            Category = "Behavioral",
            AnswerTranscript = "At my previous company, our payment processing integration was two weeks behind schedule due to unexpected third-party API rate limits (Situation). I was tasked with getting the release back on track without compromising compliance (Task). I conducted an audit of our API calls, designed a distributed batch queuing mechanism with exponential backoff, and re-allocated two engineers to critical path modules (Action). As a result, we shipped the integration on the revised date with zero downtime and improved transaction throughput by 45% (Result)."
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<MockInterviewEvaluationResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.Score.Should().BeGreaterThan(60);
        result.StarBreakdown.Should().NotBeNull();
        result.StarBreakdown.Situation.Should().NotBeNullOrWhiteSpace();
        result.StarBreakdown.Task.Should().NotBeNullOrWhiteSpace();
        result.StarBreakdown.Action.Should().NotBeNullOrWhiteSpace();
        result.StarBreakdown.Result.Should().NotBeNullOrWhiteSpace();
        result.Strengths.Should().NotBeEmpty();
        result.AreasForImprovement.Should().NotBeEmpty();
        result.ModelAnswer.Should().NotBeNullOrWhiteSpace();
        result.DeliveryFeedback.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task EvaluateAnswer_ReturnsZeroScore_WithEmptyAnswer()
    {
        var (client, _) = await _factory.CreateAuthenticatedClientAsync(email: UniqueEmail());

        var response = await client.PostAsJsonAsync("/api/mockinterview/evaluate", new EvaluateMockAnswerRequest
        {
            Question = "Tell me about a conflict with a teammate.",
            AnswerTranscript = ""
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<MockInterviewEvaluationResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.Score.Should().Be(0);
        result.DeliveryFeedback.Should().Contain("No response");
    }
}
