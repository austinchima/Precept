using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.AiProviders;

/// <summary>
/// Google Gemini API client.
/// </summary>
public class GeminiLlmClient(HttpClient httpClient, string apiKey, string model) : ILlmClient
{
    public string ProviderName => "Gemini";
    private readonly string _model = string.IsNullOrWhiteSpace(model) ? "gemini-1.5-flash" : model;

    public async Task<string> GenerateCompletionAsync(string prompt, string? systemPrompt = null, CancellationToken ct = default)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={apiKey}";
        var contents = new List<object>();

        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            contents.Add(new { role = "user", parts = new[] { new { text = $"[SYSTEM INSTRUCTIONS]: {systemPrompt}" } } });
            contents.Add(new { role = "model", parts = new[] { new { text = "Understood. I will follow these instructions." } } });
        }
        contents.Add(new { role = "user", parts = new[] { new { text = prompt } } });

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(new { contents }), Encoding.UTF8, "application/json")
        };

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;
    }
}
