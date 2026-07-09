namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Extracts structured job-posting fields from raw HTML or plain text.
/// Implementations should be dependency-free and defensive: the input may be
/// any web page, so extraction is best-effort and the caller is expected to
/// let the user review and correct the draft.
/// </summary>
public interface IJobPostingContentExtractor
{
    /// <summary>
    /// Extracts a job posting summary from HTML or text.
    /// </summary>
    /// <param name="url">The source URL.</param>
    /// <param name="htmlOrText">Raw HTML or plain text from the posting.</param>
    /// <param name="fallbackTitle">Optional title already gathered by the client.</param>
    /// <returns>A populated <see cref="ExtractedJobPosting"/>.</returns>
    ExtractedJobPosting Extract(string url, string htmlOrText, string? fallbackTitle = null);
}

/// <summary>
/// Structured fields extracted from a job posting page.
/// </summary>
public class ExtractedJobPosting
{
    public string CompanyName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? SalaryRange { get; set; }
    public bool IsRemote { get; set; }
    public string Source { get; set; } = string.Empty;
}
