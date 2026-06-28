using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for managing a user's skills inventory.
/// </summary>
public class SkillService(PreceptDbContext dbContext, ILogger<SkillService> logger) : ISkillService
{
    private static SkillResponse MapToResponse(Skill skill) => new()
    {
        Id = skill.Id.ToString(),
        UserId = skill.UserId,
        Name = skill.Name,
        Category = skill.Category,
        ProficiencyLevel = skill.ProficiencyLevel,
        Notes = skill.Notes,
        CreatedAt = skill.CreatedAt,
        UpdatedAt = skill.UpdatedAt
    };

    public async Task<SkillResponse> CreateSkillAsync(string userId, CreateSkillRequest request)
    {
        var skill = new Skill
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Category = SkillCategories.Normalize(request.Category),
            ProficiencyLevel = request.ProficiencyLevel,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Skills.Add(skill);
        await dbContext.SaveChangesAsync();

        logger.SkillCreated(skill.Id, userId);

        return MapToResponse(skill);
    }

    public async Task<List<SkillResponse>> GetSkillsAsync(string userId)
    {
        logger.SkillsRetrieved(userId);

        return await dbContext.Skills
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Name)
            .Select(s => new SkillResponse
            {
                Id = s.Id.ToString(),
                UserId = s.UserId,
                Name = s.Name,
                Category = s.Category,
                ProficiencyLevel = s.ProficiencyLevel,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<SkillResponse> GetSkillAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new SkillResponse();

        var skill = await dbContext.Skills
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (skill == null)
        {
            logger.LogWarning("Skill (ID: {skillId}) not found for user (ID: {userId})", guid, userId);
            return new SkillResponse();
        }

        return MapToResponse(skill);
    }

    public async Task<SkillResponse> UpdateSkillAsync(string userId, string id, UpdateSkillRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            return new SkillResponse();

        var skill = await dbContext.Skills
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (skill == null)
        {
            logger.SkillNotFound(guid, userId);
            return new SkillResponse();
        }

        skill.Name = request.Name;
        skill.Category = SkillCategories.Normalize(request.Category);
        skill.ProficiencyLevel = request.ProficiencyLevel;
        skill.Notes = request.Notes;
        skill.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        logger.SkillUpdated(guid);

        return MapToResponse(skill);
    }

    public async Task<bool> DeleteSkillAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return false;

        var skill = await dbContext.Skills
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (skill == null)
            return false;

        dbContext.Skills.Remove(skill);
        await dbContext.SaveChangesAsync();
        return true;
    }
}

internal static partial class SkillServiceExtensions
{
    [LoggerMessage(1, LogLevel.Information, "Skill (ID: {skillId}) created for user (ID: {userId})")]
    public static partial void SkillCreated(this ILogger logger, Guid skillId, string userId);

    [LoggerMessage(2, LogLevel.Information, "Skills retrieved for user (ID: {userId})")]
    public static partial void SkillsRetrieved(this ILogger logger, string userId);

    [LoggerMessage(3, LogLevel.Warning, "Skill (ID: {skillId}) not found for user (ID: {userId})")]
    public static partial void SkillNotFound(this ILogger logger, Guid skillId, string userId);

    [LoggerMessage(4, LogLevel.Information, "Skill (ID: {skillId}) updated successfully")]
    public static partial void SkillUpdated(this ILogger logger, Guid skillId);

    [LoggerMessage(5, LogLevel.Warning, "Skill (ID: {skillId}) not found for user (ID: {userId})")]
    public static partial void SkillDeleted(this ILogger logger, Guid skillId, string userId);
}