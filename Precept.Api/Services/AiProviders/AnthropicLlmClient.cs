using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// Anthropic Claude API client.
/// </summary>
public class AnthropicLlmClient(HttpClient httpClient, string apiKey, string model, int maxOutputTokens) : ILlmProviderClient
{
    public string ProviderName => "Anthropic";
    public string Model { get; } = string.IsNullOrWhiteSpace(model) ? "claude-3-5-haiku-20241022" : model;

    public async Task<LlmCompletion> CompleteAsync(string prompt, string? systemPrompt, CancellationToken ct)
    {
        var requestBody = new
        {
            model = Model,
            max_tokens = maxOutputTokens,
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
        var root = doc.RootElement;
        var text = root.GetProperty("content")[0].GetProperty("text").GetString() ?? string.Empty;

        // Usage field names checked against the official @anthropic-ai/sdk 0.131.0 type definitions.
        int? input = null, output = null;
        if (root.TryGetProperty("usage", out var usage))
        {
            input = LlmUsageJson.ReadInt(usage, "input_tokens");
            output = LlmUsageJson.ReadInt(usage, "output_tokens");
        }

        return new LlmCompletion(text, input, output);
    }
}
