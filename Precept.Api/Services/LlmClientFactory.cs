using Microsoft.Extensions.Options;
using Precept.Api.DTOs;
using Precept.Api.Services.AiProviders;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Factory that resolves the configured or requested LLM provider dynamically.
/// </summary>
public class LlmClientFactory(
    IHttpClientFactory httpClientFactory,
    IOptions<AiSettings> aiOptions,
    ILogger<LlmClientFactory> logger) : ILlmClientFactory
{
    private readonly AiSettings _settings = aiOptions.Value;

    public ILlmClient GetClient() =>
        GetClient(_settings.Provider, _settings.ApiKey, _settings.Model, _settings.BaseUrl);

    public ILlmClient GetClient(string? providerOverride, string? apiKeyOverride = null, string? modelOverride = null, string? baseUrlOverride = null)
    {
        var provider = (providerOverride ?? _settings.Provider).ToLowerInvariant();
        logger.LogDebug("Resolving LLM client for provider: {Provider}", provider);
        var client = httpClientFactory.CreateClient("AiClient");

        // 1. Explicit Anthropic / Claude
        if (provider is "anthropic" or "claude")
        {
            var key = apiKeyOverride ?? _settings.AnthropicApiKey ?? _settings.ApiKey;
            var model = modelOverride ?? (string.IsNullOrWhiteSpace(_settings.Model) ? "claude-3-5-haiku-20241022" : _settings.Model);
            return new AnthropicLlmClient(client, key, model);
        }

        // 2. Explicit Gemini
        if (provider is "gemini" or "google")
        {
            var key = apiKeyOverride ?? _settings.GeminiApiKey ?? _settings.ApiKey;
            var model = modelOverride ?? (string.IsNullOrWhiteSpace(_settings.Model) ? "gemini-1.5-flash" : _settings.Model);
            return new GeminiLlmClient(client, key, model);
        }

        // 3. Explicit OpenAI or custom OpenAI-compatible endpoint (Groq, DeepSeek, Ollama, OpenRouter)
        if (provider is "openai" or "custom" or "groq" or "deepseek" or "ollama" or "together" or "openrouter" or "moonshot-ai" or "kimi")
        {
            var key = apiKeyOverride ?? _settings.OpenAiApiKey ?? _settings.ApiKey;
            var model = modelOverride ?? (string.IsNullOrWhiteSpace(_settings.Model) ? "gpt-4o-mini" : _settings.Model);
            var baseUrl = baseUrlOverride ?? _settings.BaseUrl;
            return new OpenAiLlmClient(client, key, model, baseUrl);
        }

        // 4. Auto-detect based on available API keys
        if (!string.IsNullOrWhiteSpace(_settings.OpenAiApiKey))
        {
            return new OpenAiLlmClient(client, _settings.OpenAiApiKey, _settings.Model, _settings.BaseUrl);
        }

        if (!string.IsNullOrWhiteSpace(_settings.AnthropicApiKey))
        {
            return new AnthropicLlmClient(client, _settings.AnthropicApiKey, string.IsNullOrWhiteSpace(_settings.Model) ? "claude-3-5-haiku-20241022" : _settings.Model);
        }

        if (!string.IsNullOrWhiteSpace(_settings.GeminiApiKey))
        {
            return new GeminiLlmClient(client, _settings.GeminiApiKey, string.IsNullOrWhiteSpace(_settings.Model) ? "gemini-1.5-flash" : _settings.Model);
        }

        // 5. Default generic fallback (uses standard OpenAI endpoint or custom base URL)
        return new OpenAiLlmClient(client, _settings.ApiKey, string.IsNullOrWhiteSpace(_settings.Model) ? "gpt-4o-mini" : _settings.Model, _settings.BaseUrl);
    }
}
