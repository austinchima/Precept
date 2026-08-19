namespace Precept.Api.DTOs;

/// <summary>
/// Vendor-agnostic AI / LLM configuration settings.
/// </summary>
public class AiSettings
{
    public const string SectionName = "AiSettings";

    /// <summary>
    /// Active provider: "Auto", "OpenAI", "Gemini", "Claude" / "Anthropic", "Groq", "DeepSeek", "Ollama", or "Custom".
    /// </summary>
    public string Provider { get; set; } = "Auto";

    /// <summary>
    /// Model name, e.g. "gpt-4o-mini", "gemini-1.5-flash", "claude-3-5-haiku-20241022", "llama-3.3-70b-versatile", "deepseek-chat".
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Primary API Key or fallback.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Custom Base URL for OpenAI-compatible proxies, Groq, Ollama, DeepSeek, or local vLLM.
    /// </summary>
    public string? BaseUrl { get; set; }

    // Provider-specific API keys
    public string? OpenAiApiKey { get; set; }
    public string? GeminiApiKey { get; set; }
    public string? AnthropicApiKey { get; set; }
}
