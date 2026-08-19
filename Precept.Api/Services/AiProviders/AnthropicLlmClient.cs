using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// Anthropic Claude API client.
/// </summary>
public class AnthropicLlmClient(HttpClient httpClient, string apiKey, string model) : ILlmClient
{
    public string ProviderName => "Anthropic";
    private readonly string _model = string.IsNullOrWhiteSpace(model) ? "claude-3-5-haiku-20241022" : model;

    public async Task<string> GenerateCompletionAsync(string prompt, string? systemPrompt = null, CancellationToken ct = default)
    {
        var requestBody = new
        {
            model = _model,
            max_tokens = 2048,
            system = systemPrompt ?? "You are an elite engineering interviewer.",
            messages = new[] { new { role = "user", content = prompt } }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Add("x-api-key", apiKey);
        }
        request.Headers.Add("anthropic-version", "2023-06-01");

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;
    }
}
