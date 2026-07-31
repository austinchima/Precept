namespace Precept.Api.DTOs;

public class SessionDto
{
    public string Id { get; set; } = string.Empty;
    public string DeviceInfo { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsCurrent { get; set; }
}
