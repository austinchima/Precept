using System.Text.Json;

namespace Precept.Api.Services.AiProviders;

internal static class LlmUsageJson
{
    /// <summary>Reads a non-negative integer property, or null when it is missing or not a number.</summary>
    public static int? ReadInt(JsonElement obj, string name) =>
        obj.ValueKind == JsonValueKind.Object
        && obj.TryGetProperty(name, out var value)
        && value.ValueKind == JsonValueKind.Number
        && value.TryGetInt32(out var n)
        && n >= 0
            ? n
            : null;
}
