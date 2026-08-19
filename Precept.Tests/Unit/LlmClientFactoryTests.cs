using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Precept.Api.DTOs;
using Precept.Api.Services;
using Precept.Api.Services.AiProviders;

namespace Precept.Tests.Unit;

public class LlmClientFactoryTests
{
    private readonly IHttpClientFactory _httpClientFactory;

    public LlmClientFactoryTests()
    {
        _httpClientFactory = Substitute.For<IHttpClientFactory>();
        _httpClientFactory.CreateClient(Arg.Any<string>()).Returns(new HttpClient());
    }

    [Fact]
    public void GetClient_WithProviderOpenAi_ReturnsOpenAiClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "OpenAI",
            Model = "gpt-4o-mini",
            OpenAiApiKey = "sk-test-openai"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<OpenAiLlmClient>();
        client.ProviderName.Should().Be("OpenAI-Compatible");
    }

    [Fact]
    public void GetClient_WithProviderClaude_ReturnsAnthropicClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "Claude",
            AnthropicApiKey = "sk-ant-test"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<AnthropicLlmClient>();
        client.ProviderName.Should().Be("Anthropic");
    }

    [Fact]
    public void GetClient_WithProviderGemini_ReturnsGeminiClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "Gemini",
            GeminiApiKey = "AIzaSyTest"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<GeminiLlmClient>();
        client.ProviderName.Should().Be("Gemini");
    }

    [Fact]
    public void GetClient_WithCustomBaseUrl_ReturnsOpenAiCompatibleClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "Custom",
            BaseUrl = "https://api.groq.com/openai/v1",
            ApiKey = "gsk-test",
            Model = "llama-3.3-70b-versatile"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<OpenAiLlmClient>();
    }

    [Fact]
    public void GetClient_WithAutoProvider_AndAnthropicKey_ResolvesAnthropicClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "Auto",
            AnthropicApiKey = "sk-ant-123"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<AnthropicLlmClient>();
    }

    [Fact]
    public void GetClient_WithAutoProvider_AndGeminiKey_ResolvesGeminiClient()
    {
        var settings = Options.Create(new AiSettings
        {
            Provider = "Auto",
            GeminiApiKey = "AIzaSy-123"
        });

        var factory = new LlmClientFactory(_httpClientFactory, settings, NullLogger<LlmClientFactory>.Instance);
        var client = factory.GetClient();

        client.Should().BeOfType<GeminiLlmClient>();
    }
}
