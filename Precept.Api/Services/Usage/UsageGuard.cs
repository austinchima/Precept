using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Usage;

public enum UsageDenial
{
    None,
    UserLimit,
    GlobalBudget,
}

public sealed record UsageCheckResult(UsageDenial Denial, string Feature, int Remaining, DateTime? ResetsAt)
{
    public bool Allowed => Denial == UsageDenial.None;
}

/// <summary>One finished provider call, ready to be written to the ledger.</summary>
public sealed record UsageRecord(
    string UserId,
    string Feature,
    string Provider,
    string Model,
    string PromptVersion,
    int InputTokens,
    int OutputTokens,
    bool TokensEstimated,
    bool Succeeded);

public interface IUsageGuard
{
    /// <summary>Checks the user's per-feature limits and the global daily caps. Writes nothing.</summary>
    Task<UsageCheckResult> CheckAsync(string userId, string feature, CancellationToken ct = default);

    /// <summary>Writes one ledger row, pricing it from the configured price table.</summary>
    Task RecordAsync(UsageRecord record, CancellationToken ct = default);
}

/// <summary>
/// Enforces AI limits from the usage ledger. Check and record are separate calls, so two
/// requests racing at the limit can both pass; the overshoot is at most the number of
/// concurrent requests, which the per-user rate limiter keeps small.
/// </summary>
public class UsageGuard(
    PreceptDbContext db,
    IOptions<UsageSettings> options,
    TimeProvider time,
    ILogger<UsageGuard> logger) : IUsageGuard
{
    private readonly UsageSettings _settings = options.Value;

    public async Task<UsageCheckResult> CheckAsync(string userId, string feature, CancellationToken ct = default)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var dayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextDay = dayStart.AddDays(1);
        var nextMonth = monthStart.AddMonths(1);

        // System-level aggregates: the ledger's per-user filter is bypassed and the user is scoped explicitly.
        var ledger = db.UsageLedger.IgnoreQueryFilters();

        var todayCalls = await ledger.CountAsync(e => e.CreatedAt >= dayStart, ct);
        var todaySpend = await ledger.Where(e => e.CreatedAt >= dayStart && e.EstimatedCostUsd != null)
            .SumAsync(e => e.EstimatedCostUsd ?? 0m, ct);
        if (todayCalls >= _settings.GlobalDailyCallLimit || todaySpend >= _settings.GlobalDailyBudgetUsd)
        {
            logger.LogCritical(
                "AI global daily cap reached: {Calls} calls (limit {CallLimit}), {Spend} USD (budget {Budget}). AI features are paused until {ResetsAt:o}.",
                todayCalls, _settings.GlobalDailyCallLimit, todaySpend, _settings.GlobalDailyBudgetUsd, nextDay);
            return new UsageCheckResult(UsageDenial.GlobalBudget, feature, 0, nextDay);
        }

        var limit = _settings.Features.TryGetValue(feature, out var configured) ? configured : _settings.DefaultLimit;
        var mine = ledger.Where(e => e.UserId == userId && e.Feature == feature && e.CreatedAt >= monthStart);
        var monthUnits = await mine.SumAsync(e => e.Units, ct);
        var dayUnits = await mine.Where(e => e.CreatedAt >= dayStart).SumAsync(e => e.Units, ct);

        var dayLeft = Math.Max(0, limit.PerDay - dayUnits);
        var monthLeft = Math.Max(0, limit.PerMonth - monthUnits);
        var remaining = Math.Min(dayLeft, monthLeft);

        if (remaining > 0)
        {
            return new UsageCheckResult(UsageDenial.None, feature, remaining, null);
        }

        // When the month is used up, the next day does not help.
        var resetsAt = monthLeft == 0 ? nextMonth : nextDay;
        return new UsageCheckResult(UsageDenial.UserLimit, feature, 0, resetsAt);
    }

    public async Task RecordAsync(UsageRecord record, CancellationToken ct = default)
    {
        decimal? cost = null;
        if (_settings.ModelPrices.TryGetValue(record.Model, out var price))
        {
            cost = Math.Round(
                record.InputTokens / 1_000_000m * price.InputPerMillionUsd
                + record.OutputTokens / 1_000_000m * price.OutputPerMillionUsd, 6);
        }
        else
        {
            logger.LogWarning(
                "Model {Model} has no price in Usage:ModelPrices; its cost is recorded as unknown and only the daily call cap limits it.",
                record.Model);
        }

        db.UsageLedger.Add(new UsageLedgerEntry
        {
            UserId = record.UserId,
            Feature = record.Feature,
            Units = 1,
            InputTokens = record.InputTokens,
            OutputTokens = record.OutputTokens,
            TokensEstimated = record.TokensEstimated,
            EstimatedCostUsd = cost,
            Provider = record.Provider,
            Model = record.Model,
            PromptVersion = record.PromptVersion,
            Succeeded = record.Succeeded,
            CreatedAt = time.GetUtcNow().UtcDateTime,
        });
        await db.SaveChangesAsync(ct);
    }
}
