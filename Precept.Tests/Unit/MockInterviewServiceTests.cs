using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Unit;

[Collection("Integration")]
public class MockInterviewServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;
    private readonly string _databaseName = $"precept_unit_mockinterview_{Guid.NewGuid():N}";

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

    public MockInterviewServiceTests(PostgresContainerFixture fixture)
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

        await using var db = MakeDb(null);
        await db.Database.MigrateAsync();
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
    public async Task GenerateQuestionAsync_WithLlmJson_ParsesSuccessfully()
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmClient = Substitute.For<ILlmClient>();
        llmClient.ProviderName.Returns("OpenAI-Compatible");
        llmClient.GenerateCompletionAsync(Arg.Any<LlmUsageContext>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("```json\n{\n  \"question\": \"Tell me about how you handled a zero-day vulnerability.\",\n  \"category\": \"Security & Reliability\",\n  \"focusArea\": \"Threat response\",\n  \"contextTips\": \"Emphasize containment and patching SLA.\"\n}\n```");

        var llmFactory = Substitute.For<ILlmClientFactory>();
        llmFactory.GetClient().Returns(llmClient);

        var service = new MockInterviewService(llmFactory, Substitute.For<IDemoAccountService>(), db, NullLogger<MockInterviewService>.Instance);
        var result = await service.GenerateQuestionAsync(new GenerateMockQuestionRequest
        {
            RoleTitle = "Staff Security Engineer"
        }, userId);

        result.Should().NotBeNull();
        result.Question.Should().Be("Tell me about how you handled a zero-day vulnerability.");
        result.Category.Should().Be("Security & Reliability");
        result.FocusArea.Should().Be("Threat response");
        result.ContextTips.Should().Be("Emphasize containment and patching SLA.");
    }

    [Fact]
    public async Task GenerateQuestionAsync_WhenLlmThrows_FallsBackToBuiltinQuestions()
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmClient = Substitute.For<ILlmClient>();
        llmClient.ProviderName.Returns("Anthropic");
        llmClient.GenerateCompletionAsync(Arg.Any<LlmUsageContext>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Throws(new HttpRequestException("API Key Invalid"));

        var llmFactory = Substitute.For<ILlmClientFactory>();
        llmFactory.GetClient().Returns(llmClient);

        var service = new MockInterviewService(llmFactory, Substitute.For<IDemoAccountService>(), db, NullLogger<MockInterviewService>.Instance);
        var result = await service.GenerateQuestionAsync(new GenerateMockQuestionRequest
        {
            RoleTitle = "Principal Architect"
        }, userId);

        result.Should().NotBeNull();
        result.Question.Should().NotBeNullOrWhiteSpace();
        result.Question.Should().Contain("Principal Architect");
        result.Category.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task EvaluateAnswerAsync_WithLlmResponse_ParsesEvaluation()
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmClient = Substitute.For<ILlmClient>();
        llmClient.ProviderName.Returns("Gemini");
        llmClient.GenerateCompletionAsync(Arg.Any<LlmUsageContext>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("{\n  \"score\": 88,\n  \"starBreakdown\": {\n    \"situation\": \"Clear microservice context.\",\n    \"task\": \"Defined SLA requirement.\",\n    \"action\": \"Implemented circuit breaker.\",\n    \"result\": \"Reduced failure rate by 90%.\"\n  },\n  \"strengths\": [\"Action-oriented\", \"Metrics included\"],\n  \"areasForImprovement\": [\"Elaborate on edge cases\"],\n  \"modelAnswer\": \"In my role, I...\",\n  \"deliveryFeedback\": \"Crisp delivery.\"\n}");

        var llmFactory = Substitute.For<ILlmClientFactory>();
        llmFactory.GetClient().Returns(llmClient);

        var service = new MockInterviewService(llmFactory, Substitute.For<IDemoAccountService>(), db, NullLogger<MockInterviewService>.Instance);
        var result = await service.EvaluateAnswerAsync(new EvaluateMockAnswerRequest
        {
            Question = "Tell me about resolving service outages.",
            AnswerTranscript = "I identified the cascading timeout, added circuit breakers, and restored 99.99% uptime."
        }, userId);

        result.Should().NotBeNull();
        result.Score.Should().Be(88);
        result.StarBreakdown.Action.Should().Be("Implemented circuit breaker.");
        result.Strengths.Should().Contain("Action-oriented");
    }

    [Fact]
    public async Task EvaluateAnswerAsync_WhenEmptyAnswer_ReturnsZeroScoreWithoutCallingLlm()
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmFactory = Substitute.For<ILlmClientFactory>();
        var service = new MockInterviewService(llmFactory, Substitute.For<IDemoAccountService>(), db, NullLogger<MockInterviewService>.Instance);

        var result = await service.EvaluateAnswerAsync(new EvaluateMockAnswerRequest
        {
            Question = "Tell me about a time you led a migration.",
            AnswerTranscript = "   "
        }, userId);

        result.Should().NotBeNull();
        result.Score.Should().Be(0);
        result.DeliveryFeedback.Should().Contain("No response transcript");
        llmFactory.DidNotReceive().GetClient();
    }

    [Fact]
    public async Task DemoUser_GetsLabelledSamples_AndNeverReachesLlmFactory()
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmFactory = Substitute.For<ILlmClientFactory>();
        var demoAccounts = Substitute.For<IDemoAccountService>();
        demoAccounts.IsDemoUserAsync(userId).Returns(true);
        var service = new MockInterviewService(llmFactory, demoAccounts, db, NullLogger<MockInterviewService>.Instance);

        var question = await service.GenerateQuestionAsync(new GenerateMockQuestionRequest { RoleTitle = "Backend Engineer" }, userId);
        var evaluation = await service.EvaluateAnswerAsync(new EvaluateMockAnswerRequest
        {
            Question = question.Question,
            AnswerTranscript = "I rolled back the deploy and added an alert."
        }, userId);

        question.IsDemoSample.Should().BeTrue();
        evaluation.IsDemoSample.Should().BeTrue();
        evaluation.Score.Should().Be(0);
        llmFactory.ReceivedCalls().Should().BeEmpty();
    }

    [Theory]
    [InlineData("I led the migration and we cut p99 latency from 900 ms to 300 ms across 12 services, which improved checkout reliability for every region we served.")]
    [InlineData("we fixed it")]
    public async Task EvaluateAnswerAsync_WhenLlmFails_ReturnsLabelledHeuristic_WithNoInventedNumbers(string transcript)
    {
        var userId = Guid.NewGuid().ToString();
        await using var db = MakeDb(userId);

        var llmClient = Substitute.For<ILlmClient>();
        llmClient.ProviderName.Returns("OpenAI-Compatible");
        llmClient.GenerateCompletionAsync(Arg.Any<LlmUsageContext>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Throws(new HttpRequestException("provider down"));
        var llmFactory = Substitute.For<ILlmClientFactory>();
        llmFactory.GetClient().Returns(llmClient);

        var service = new MockInterviewService(llmFactory, Substitute.For<IDemoAccountService>(), db, NullLogger<MockInterviewService>.Instance);
        var result = await service.EvaluateAnswerAsync(new EvaluateMockAnswerRequest
        {
            Question = "Tell me about a time you improved a slow system.",
            AnswerTranscript = transcript
        }, userId);

        result.IsHeuristic.Should().BeTrue();
        result.ModelAnswer.Should().BeEmpty("the offline check cannot write an answer without inventing details");

        var outputText = string.Join(" ", new[]
        {
            result.DeliveryFeedback, result.StarBreakdown.Situation, result.StarBreakdown.Task,
            result.StarBreakdown.Action, result.StarBreakdown.Result,
        }.Concat(result.Strengths).Concat(result.AreasForImprovement));
        var transcriptNumbers = System.Text.RegularExpressions.Regex.Matches(transcript, @"\d+").Select(m => m.Value).ToHashSet();
        var wordCount = transcript.Split((char[])[' ', '\n', '\t'], StringSplitOptions.RemoveEmptyEntries).Length.ToString();
        foreach (System.Text.RegularExpressions.Match number in System.Text.RegularExpressions.Regex.Matches(outputText, @"\d+"))
        {
            // Allowed: numbers from the transcript, the measured word count, and the fixed guidance range for answer length.
            var allowed = transcriptNumbers.Contains(number.Value) || number.Value == wordCount || number.Value is "80" or "90" or "120";
            allowed.Should().BeTrue($"'{number.Value}' in the heuristic output must come from the transcript or a stated rule");
        }
    }
}
