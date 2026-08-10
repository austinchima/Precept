namespace Precept.Api.Services.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string textBody, string htmlBody);
}
