using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(HttpClient httpClient, IConfiguration configuration, ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Resend:ApiKey"] ?? "";
        _fromEmail = configuration["Resend:FromEmail"] ?? "onboarding@resend.dev";
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string textBody, string htmlBody)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Resend API key is not configured. Email will not be sent.");
            return;
        }

        var requestBody = new
        {
            from = _fromEmail,
            to = new[] { to },
            subject = subject,
            text = textBody,
            html = htmlBody
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to send email via Resend. Status code: {StatusCode}. Error: {Error}", response.StatusCode, errorContent);
        }
    }
}
