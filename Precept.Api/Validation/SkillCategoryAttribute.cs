using System.ComponentModel.DataAnnotations;
using Precept.Api.Models;

namespace Precept.Api.Validation;

/// <summary>
/// Validates that a skill category is either empty (the category is optional)
/// or a member of <see cref="SkillCategories.All"/> (case-insensitive).
/// Applied to request DTOs so an out-of-set value is rejected with a 400 at the
/// API boundary, regardless of what the client UI sends.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class SkillCategoryAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is null || (value is string s && SkillCategories.IsAllowed(s));

    public override string FormatErrorMessage(string name) =>
        $"{name} must be one of: {string.Join(", ", SkillCategories.All)}.";
}
