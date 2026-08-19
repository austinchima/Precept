using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _resendApiKey;
    private readonly string _fromEmail;
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUser;
    private readonly string _smtpPass;
    private readonly bool _smtpEnableSsl;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(HttpClient httpClient, IConfiguration configuration, ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _resendApiKey = configuration["Resend:ApiKey"] ?? configuration["RESEND_API_KEY"] ?? "";
        _fromEmail = configuration["Resend:FromEmail"] ?? configuration["RESEND_FROM_EMAIL"] 
            ?? configuration["Smtp:FromEmail"] ?? "coach@precept.app";

        _smtpHost = configuration["Smtp:Host"] ?? configuration["SMTP_HOST"] ?? "";
        _smtpPort = int.TryParse(configuration["Smtp:Port"] ?? configuration["SMTP_PORT"], out var port) ? port : 587;
        _smtpUser = configuration["Smtp:Username"] ?? configuration["SMTP_USERNAME"] ?? "";
        _smtpPass = configuration["Smtp:Password"] ?? configuration["SMTP_PASSWORD"] ?? "";
        _smtpEnableSsl = bool.TryParse(configuration["Smtp:EnableSsl"], out var ssl) ? ssl : true;
    }

    public async Task SendEmailAsync(string to, string subject, string textBody, string htmlBody)
    {
        // 1. Try Resend API if API key is present
        if (!string.IsNullOrWhiteSpace(_resendApiKey))
        {
            try
            {
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
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _resendApiKey);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Email sent successfully via Resend to {To} with subject '{Subject}'", to, subject);
                    return;
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send email via Resend to {To}. Status: {StatusCode}, Error: {Error}", response.StatusCode, errorContent, to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception when sending email via Resend to {To}", to);
            }
        }

        // 2. Fallback to SMTP if configured
        if (!string.IsNullOrWhiteSpace(_smtpHost))
        {
            try
            {
                using var client = new SmtpClient(_smtpHost, _smtpPort)
                {
                    EnableSsl = _smtpEnableSsl,
                };

                if (!string.IsNullOrWhiteSpace(_smtpUser))
                {
                    client.Credentials = new NetworkCredential(_smtpUser, _smtpPass);
                }

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(_fromEmail, "Precept Coach"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(to);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Email sent successfully via SMTP to {To} with subject '{Subject}'", to, subject);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email via SMTP to {To}", to);
            }
        }

        // 3. Fallback: Log simulation in dev mode
        _logger.LogWarning("[EMAIL SIMULATION] No active Resend API key or SMTP host configured.\nTo: {To}\nSubject: {Subject}\nText Preview:\n{TextBody}", to, subject, textBody);
    }
}
