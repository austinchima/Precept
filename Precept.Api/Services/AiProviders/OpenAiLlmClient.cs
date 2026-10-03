using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// OpenAI and OpenAI-compatible client (Groq, DeepSeek, Ollama, OpenRouter, Mistral, Together).
/// </summary>
public class OpenAiLlmClient(HttpClient httpClient, string apiKey, string model, int maxOutputTokens, string? baseUrl = null) : ILlmProviderClient
{
    public const string OpenAiBaseUrl = "https://api.openai.com/v1";

    public string ProviderName => "OpenAI-Compatible";
    public string Model { get; } = string.IsNullOrWhiteSpace(model) ? "gpt-4o-mini" : model;
    private readonly string _baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? OpenAiBaseUrl : baseUrl.TrimEnd('/');

    /// <summary>
    /// OpenAI deprecated <c>max_tokens</c> in favour of <c>max_completion_tokens</c> (checked against the
    /// official openai 7.27.0 SDK type definitions). Compatible providers were built against the older
    /// parameter, so it is still sent to any other base URL.
    /// </summary>
    public string MaxTokensParameter =>
        _baseUrl.Equals(OpenAiBaseUrl, StringComparison.OrdinalIgnoreCase) ? "max_completion_tokens" : "max_tokens";

    public async Task<LlmCompletion> CompleteAsync(string prompt, string? systemPrompt, CancellationToken ct)
    {
        var messages = new List<object>();
        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            messages.Add(new { role = "system", content = systemPrompt });
        }
        messages.Add(new { role = "user", content = prompt });

        var requestBody = new Dictionary<string, object>
        {
            ["model"] = Model,
            ["messages"] = messages,
            ["temperature"] = 0.4,
            [MaxTokensParameter] = maxOutputTokens,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var text = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        int? input = null, output = null;
        if (root.TryGetProperty("usage", out var usage))
        {
            input = LlmUsageJson.ReadInt(usage, "prompt_tokens");
            output = LlmUsageJson.ReadInt(usage, "completion_tokens");
        }

        return new LlmCompletion(text, input, output);
    }
}
