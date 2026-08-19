using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// OpenAI and OpenAI-compatible client (Groq, DeepSeek, Ollama, OpenRouter, Mistral, Together).
/// </summary>
public class OpenAiLlmClient(HttpClient httpClient, string apiKey, string model, string? baseUrl = null) : ILlmClient
{
    public string ProviderName => "OpenAI-Compatible";
    private readonly string _baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? "https://api.openai.com/v1" : baseUrl.TrimEnd('/');
    private readonly string _model = string.IsNullOrWhiteSpace(model) ? "gpt-4o-mini" : model;

    public async Task<string> GenerateCompletionAsync(string prompt, string? systemPrompt = null, CancellationToken ct = default)
    {
        var messages = new List<object>();
        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            messages.Add(new { role = "system", content = systemPrompt });
        }
        messages.Add(new { role = "user", content = prompt });

        var requestBody = new
        {
            model = _model,
            messages,
            temperature = 0.4
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
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;
    }
}
