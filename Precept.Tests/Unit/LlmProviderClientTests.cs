using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Precept.Api.Services.AiProviders;

namespace Precept.Tests.Unit;

/// <summary>
/// Request shape and usage parsing for each provider client, against a captured HTTP exchange.
/// </summary>
public class LlmProviderClientTests
{
    private sealed class CaptureHandler(string responseJson) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public JsonDocument? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            Body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        }
    }

    [Fact]
    public async Task Anthropic_SendsConfiguredMaxTokens_AndParsesUsage()
    {
        var handler = new CaptureHandler("""{"content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":12,"output_tokens":5}}""");
        var client = new AnthropicLlmClient(new HttpClient(handler), "sk-ant-test", "claude-test", maxOutputTokens: 321);

        var result = await client.CompleteAsync("prompt", "system", CancellationToken.None);

        handler.Body!.RootElement.GetProperty("max_tokens").GetInt32().Should().Be(321);
        result.Text.Should().Be("hi");
        result.InputTokens.Should().Be(12);
        result.OutputTokens.Should().Be(5);
    }

    [Fact]
    public async Task Gemini_SendsKeyInHeaderNotUrl_SendsMaxOutputTokens_AndParsesUsage()
    {
        var handler = new CaptureHandler("""{"candidates":[{"content":{"parts":[{"text":"hi"}]}}],"usageMetadata":{"promptTokenCount":40,"candidatesTokenCount":9}}""");
        var client = new GeminiLlmClient(new HttpClient(handler), "AIza-secret", "gemini-test", maxOutputTokens: 222);

        var result = await client.CompleteAsync("prompt", null, CancellationToken.None);

        handler.Request!.RequestUri!.ToString().Should().NotContain("AIza-secret").And.NotContain("key=");
        handler.Request.Headers.GetValues("x-goog-api-key").Should().ContainSingle().Which.Should().Be("AIza-secret");
        handler.Body!.RootElement.GetProperty("generationConfig").GetProperty("maxOutputTokens").GetInt32().Should().Be(222);
        result.InputTokens.Should().Be(40);
        result.OutputTokens.Should().Be(9);
    }

    [Fact]
    public async Task OpenAi_DefaultEndpoint_SendsMaxCompletionTokens_AndParsesUsage()
    {
        var handler = new CaptureHandler("""{"choices":[{"message":{"content":"hi"}}],"usage":{"prompt_tokens":30,"completion_tokens":7}}""");
        var client = new OpenAiLlmClient(new HttpClient(handler), "sk-test", "gpt-test", maxOutputTokens: 111);

        var result = await client.CompleteAsync("prompt", "system", CancellationToken.None);

        handler.Request!.RequestUri!.ToString().Should().StartWith(OpenAiLlmClient.OpenAiBaseUrl);
        handler.Body!.RootElement.GetProperty("max_completion_tokens").GetInt32().Should().Be(111);
        handler.Body.RootElement.TryGetProperty("max_tokens", out _).Should().BeFalse();
        result.InputTokens.Should().Be(30);
        result.OutputTokens.Should().Be(7);
    }

    [Fact]
    public async Task OpenAiCompatible_CustomEndpoint_SendsMaxTokens()
    {
        var handler = new CaptureHandler("""{"choices":[{"message":{"content":"hi"}}]}""");
        var client = new OpenAiLlmClient(new HttpClient(handler), "gsk-test", "llama-test", maxOutputTokens: 99, baseUrl: "https://api.groq.com/openai/v1");

        var result = await client.CompleteAsync("prompt", null, CancellationToken.None);

        handler.Body!.RootElement.GetProperty("max_tokens").GetInt32().Should().Be(99);
        result.InputTokens.Should().BeNull("the response carried no usage block");
        result.OutputTokens.Should().BeNull();
    }
}
