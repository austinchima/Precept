using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// Google Gemini API client.
/// </summary>
public class GeminiLlmClient(HttpClient httpClient, string apiKey, string model, int maxOutputTokens) : ILlmProviderClient
{
    public string ProviderName => "Gemini";
    public string Model { get; } = string.IsNullOrWhiteSpace(model) ? "gemini-1.5-flash" : model;

    public async Task<LlmCompletion> CompleteAsync(string prompt, string? systemPrompt, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent";
        var contents = new List<object>();

        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            contents.Add(new { role = "user", parts = new[] { new { text = $"[SYSTEM INSTRUCTIONS]: {systemPrompt}" } } });
            contents.Add(new { role = "model", parts = new[] { new { text = "Understood. I will follow these instructions." } } });
        }
        contents.Add(new { role = "user", parts = new[] { new { text = prompt } } });

        var body = new { contents, generationConfig = new { maxOutputTokens } };
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        // The key goes in a header, not the query string, so it stays out of URL logs.
        // Header name checked against the official @google/genai 2.27.0 SDK ("Gemini API key sent as x-goog-api-key").
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Add("x-goog-api-key", apiKey);
        }

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var text = root
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;

        int? input = null, output = null;
        if (root.TryGetProperty("usageMetadata", out var usage))
        {
            input = LlmUsageJson.ReadInt(usage, "promptTokenCount");
            output = LlmUsageJson.ReadInt(usage, "candidatesTokenCount");
        }

        return new LlmCompletion(text, input, output);
    }
}
