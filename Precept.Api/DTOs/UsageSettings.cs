namespace Precept.Api.DTOs;

/// <summary>
/// Limits and prices for metered AI features (section "Usage").
/// The defaults below are conservative placeholders, not pricing decisions;
/// set real values per environment (plan gates D4 and D6).
/// </summary>
public class UsageSettings
{
    public const string SectionName = "Usage";

    /// <summary>Per-user limits keyed by feature name (see <see cref="UsageFeatures"/>).</summary>
    public Dictionary<string, FeatureLimit> Features { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        [UsageFeatures.MockQuestion] = new FeatureLimit { PerDay = 20, PerMonth = 200 },
        [UsageFeatures.MockEvaluate] = new FeatureLimit { PerDay = 20, PerMonth = 200 },
    };

    /// <summary>Applies to any feature missing from <see cref="Features"/>.</summary>
    public FeatureLimit DefaultLimit { get; set; } = new() { PerDay = 10, PerMonth = 100 };

    /// <summary>Total estimated spend across all users per UTC day. Only calls to priced models count.</summary>
    public decimal GlobalDailyBudgetUsd { get; set; } = 10m;

    /// <summary>Total calls across all users per UTC day. Applies whether or not the model is priced.</summary>
    public int GlobalDailyCallLimit { get; set; } = 500;

    /// <summary>
    /// USD per million tokens, keyed by model name. Empty by default: provider prices change,
    /// so they must be copied from the provider's current price page when configuring a model.
    /// Calls to unpriced models record a null cost and are capped by <see cref="GlobalDailyCallLimit"/> only.
    /// </summary>
    public Dictionary<string, ModelPrice> ModelPrices { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class FeatureLimit
{
    public int PerDay { get; set; }
    public int PerMonth { get; set; }
}

public class ModelPrice
{
    public decimal InputPerMillionUsd { get; set; }
    public decimal OutputPerMillionUsd { get; set; }
}

/// <summary>Feature names recorded in the usage ledger.</summary>
public static class UsageFeatures
{
    public const string MockQuestion = "mock_question";
    public const string MockEvaluate = "mock_evaluate";
}
