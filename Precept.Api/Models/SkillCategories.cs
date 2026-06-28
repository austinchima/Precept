namespace Precept.Api.Models;

/// <summary>
/// Canonical allow-list of skill categories.
///
/// <see cref="Skill.Category"/> is stored as a free string (no enum, so no
/// migration is needed to add categories), but the API only accepts values
/// from this set — validated on write and normalised to the canonical casing.
/// Keeping a single source of truth here lets the frontend dropdown and the
/// readiness radar share one consistent vocabulary.
/// </summary>
public static class SkillCategories
{
    public static readonly IReadOnlyList<string> All =
    [
        "Language",
        "Framework",
        "Library",
        "Database",
        "Tool",
        "Cloud",
        "DevOps",
        "Testing",
        "Mobile",
        "Concept",
    ];

    /// <summary>
    /// Returns the canonical-cased category for a (case-insensitive) input, or
    /// <c>null</c> when the input is empty or not an allowed category.
    /// </summary>
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return All.FirstOrDefault(c => string.Equals(c, value.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// True when the value is null/empty (category is optional) or a member of
    /// the allow-list. False for a non-empty value outside the allow-list.
    /// </summary>
    public static bool IsAllowed(string? value) =>
        string.IsNullOrWhiteSpace(value) || Normalize(value) is not null;
}
