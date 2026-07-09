namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Extracts skill/technology keywords from a job description text.
/// </summary>
public interface IJobDescriptionKeywordExtractor
{
    /// <summary>
    /// Returns a distinct, case-normalized list of keywords found in the description.
    /// </summary>
    IReadOnlyList<string> ExtractKeywords(string description);
}
