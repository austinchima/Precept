using System.Text.RegularExpressions;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Dependency-free, heuristic extractor that turns raw HTML or text from a
/// job posting page into a structured <see cref="ExtractedJobPosting"/>.
/// Extraction is best-effort; the user is expected to review the draft.
/// </summary>
public partial class JobPostingContentExtractor : IJobPostingContentExtractor
{
    public ExtractedJobPosting Extract(string url, string htmlOrText, string? fallbackTitle = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        htmlOrText = string.IsNullOrWhiteSpace(htmlOrText) ? string.Empty : htmlOrText;

        // Prefer a plain-text representation when the input is HTML.
        var text = StripHtml(htmlOrText);

        var title = ExtractTitle(htmlOrText, fallbackTitle);
        var description = ExtractDescription(htmlOrText, text);
        var (company, role) = SplitTitle(title);
        var location = ExtractLocation(text);
        var salary = ExtractSalary(text);
        var isRemote = DetectRemote(text, location);

        return new ExtractedJobPosting
        {
            CompanyName = company,
            RoleTitle = role,
            Description = description,
            Location = location,
            SalaryRange = salary,
            IsRemote = isRemote,
            Source = url
        };
    }

    /// <summary>
    /// Removes HTML tags, scripts, styles, and collapses whitespace.
    /// </summary>
    private static string StripHtml(string html)
    {
        // Drop script/style/noscript/iframe content first.
        var withoutBlocks = ScriptStyleBlockRegex().Replace(html, " ");
        // Drop remaining tags.
        var withoutTags = HtmlTagRegex().Replace(withoutBlocks, " ");
        // Decode common entities.
        var decoded = System.Net.WebUtility.HtmlDecode(withoutTags);
        // Collapse whitespace.
        return WhitespaceRegex().Replace(decoded, " ").Trim();
    }

    private static string ExtractTitle(string html, string? fallbackTitle)
    {
        if (!string.IsNullOrWhiteSpace(fallbackTitle))
            return CleanTitle(fallbackTitle);

        var ogTitle = ExtractMetaContent(html, "og:title");
        if (!string.IsNullOrWhiteSpace(ogTitle))
            return CleanTitle(ogTitle);

        var twitterTitle = ExtractMetaContent(html, "twitter:title");
        if (!string.IsNullOrWhiteSpace(twitterTitle))
            return CleanTitle(twitterTitle);

        var titleMatch = TitleRegex().Match(html);
        if (titleMatch.Success)
            return CleanTitle(System.Net.WebUtility.HtmlDecode(titleMatch.Groups[1].Value));

        return string.Empty;
    }

    private static string ExtractDescription(string html, string plainText)
    {
        var ogDescription = ExtractMetaContent(html, "og:description");
        if (!string.IsNullOrWhiteSpace(ogDescription))
            return ogDescription.Trim();

        var twitterDescription = ExtractMetaContent(html, "twitter:description");
        if (!string.IsNullOrWhiteSpace(twitterDescription))
            return twitterDescription.Trim();

        var metaDescription = ExtractMetaContent(html, "description");
        if (!string.IsNullOrWhiteSpace(metaDescription))
            return metaDescription.Trim();

        // Fallback to the first chunk of visible text, capped reasonably.
        if (plainText.Length > 0)
        {
            const int maxFallbackLength = 2000;
            return plainText.Length > maxFallbackLength
                ? plainText[..maxFallbackLength].Trim() + "..."
                : plainText;
        }

        return string.Empty;
    }

    private static string ExtractMetaContent(string html, string nameOrProperty)
    {
        // Match both <meta name="x" content="..."> and <meta property="x" content="...">.
        var pattern = $"<meta\\s+(?:name|property)=\"(?:{Regex.Escape(nameOrProperty)})\"\\s+content=\"([^\"]*)\"";
        var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (match.Success)
            return System.Net.WebUtility.HtmlDecode(match.Groups[1].Value).Trim();

        // Try the reverse attribute order.
        pattern = $"<meta\\s+content=\"([^\"]*)\"\\s+(?:name|property)=\"(?:{Regex.Escape(nameOrProperty)})\"";
        match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (match.Success)
            return System.Net.WebUtility.HtmlDecode(match.Groups[1].Value).Trim();

        return string.Empty;
    }

    private static string CleanTitle(string title)
    {
        var cleaned = System.Net.WebUtility.HtmlDecode(title).Trim();
        // Strip a small set of known site-name suffixes (e.g. " | LinkedIn") so
        // they do not get mistaken for the company name. We intentionally keep
        // "Role at Company" and "Role - Company" intact for SplitTitle.
        cleaned = KnownSiteSuffixRegex().Replace(cleaned, string.Empty).Trim();
        return cleaned;
    }

    /// <summary>
    /// Splits a title like "Software Engineer - Acme" or "Software Engineer at Acme"
    /// into (company, role). Titles are noisy, so this is intentionally simple.
    /// </summary>
    private static (string Company, string Role) SplitTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return (string.Empty, string.Empty);

        var separators = new[] { " - ", " | ", " at ", " @ ", " — ", " – ", " :: ", ": " };
        foreach (var sep in separators)
        {
            var idx = title.IndexOf(sep, StringComparison.OrdinalIgnoreCase);
            if (idx <= 0) continue;

            var left = title[..idx].Trim();
            var right = title[(idx + sep.Length)..].Trim();

            // Heuristic: the longer side is usually the role; the shorter side the company.
            // Common exceptions exist, but this works for "Role at Company" titles.
            if (left.Length >= right.Length)
                return (right, left);

            return (left, right);
        }

        // No separator found — treat the whole thing as the role.
        return (string.Empty, title);
    }

    private static string ExtractLocation(string text)
    {
        // Common patterns: "Location: Remote", "Remote - US", "San Francisco, CA", "Hybrid in New York"
        var patterns = new (Regex Regex, int Group)[]
        {
            (LocationColonRegex(), 1),
            (HybridInRegex(), 0),
            (RemoteLocationRegex(), 0),
            (CityStateRegex(), 0),
        };

        foreach (var (regex, group) in patterns)
        {
            var match = regex.Match(text);
            if (match.Success)
            {
                var value = match.Groups[group].Value.Trim();
                if (value.Length > 2 && value.Length < 80)
                    return value;
            }
        }

        return string.Empty;
    }

    private static string? ExtractSalary(string text)
    {
        var match = SalaryRegex().Match(text);
        if (match.Success)
            return match.Groups[0].Value.Trim();

        return null;
    }

    private static bool DetectRemote(string text, string location)
    {
        var normalized = (text + " " + location).ToLowerInvariant();
        return normalized.Contains("remote", StringComparison.InvariantCulture) &&
               !normalized.Contains("not remote", StringComparison.InvariantCulture);
    }

    [GeneratedRegex("<(script|style|noscript|iframe)\\b[^<]*(?:(?!</\\1>)<[^<]*)*</\\1>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex ScriptStyleBlockRegex();

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex("\\s+")]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex("<title\\b[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleRegex();

    [GeneratedRegex(@"\s+(?:\|\s*-?\s*|[-—]\s+|/\s+)(?:LinkedIn|Indeed|Glassdoor|ZipRecruiter|Monster|CareerBuilder|Greenhouse|Lever|Workday|SmartRecruiters|Ashby|Breezy HR|Jobvite)\b.*$", RegexOptions.IgnoreCase)]
    private static partial Regex KnownSiteSuffixRegex();

    [GeneratedRegex(@"(?:location|based in|work location)[:\s]+([A-Za-z0-9\s,\-()]+)(?=\n|\.|,|$)", RegexOptions.IgnoreCase)]
    private static partial Regex LocationColonRegex();

    [GeneratedRegex(@"hybrid\s+(?:in|from|at)?\s+([A-Za-z0-9\s,\-()]+)", RegexOptions.IgnoreCase)]
    private static partial Regex HybridInRegex();

    [GeneratedRegex(@"\b(remote(?:\s*\(\s*[A-Za-z0-9\s,]+\))?|remote[-\s]*only|remote\s*in\s*[A-Za-z0-9\s,]+)\b", RegexOptions.IgnoreCase)]
    private static partial Regex RemoteLocationRegex();

    [GeneratedRegex(@"(?<!\w)([A-Z][a-zA-Z]*(?:[\s-][A-Z][a-zA-Z]*){0,2},\s*[A-Z]{2}(?:\s+\d{5})?)(?!\w)")]
    private static partial Regex CityStateRegex();

    [GeneratedRegex(@"\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:[Kk])?(?:\s*[-–—]\s*\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:[Kk])?)?(?:\s*/\s*(?:year|yr|month|mo|hour|hr))?|\b\d{1,3}\s*[Kk]\s*[-–—]\s*\d{1,3}\s*[Kk]\b", RegexOptions.IgnoreCase)]
    private static partial Regex SalaryRegex();
}
