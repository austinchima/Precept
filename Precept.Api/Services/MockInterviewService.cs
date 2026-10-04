using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.Usage;

namespace Precept.Api.Services;

/// <summary>
/// AI-agnostic Mock Interview Service that leverages ILlmClientFactory
/// to support OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Ollama, and offline heuristics.
/// </summary>
public class MockInterviewService(
    ILlmClientFactory llmFactory,
    IDemoAccountService demoAccountService,
    PreceptDbContext dbContext,
    ILogger<MockInterviewService> logger)
    : IMockInterviewService
{
    // Bump when a prompt's wording or output schema changes, so ledger rows can be compared by version.
    internal const string QuestionPromptVersion = "mock_question.v1";
    internal const string EvaluatePromptVersion = "mock_evaluate.v1";

    public async Task<MockQuestionResponse> GenerateQuestionAsync(GenerateMockQuestionRequest request, string userId)
    {
        // Demo visitors never reach an LLM provider, so they cannot spend AI budget.
        if (await demoAccountService.IsDemoUserAsync(userId))
        {
            return DemoSamples.Question();
        }

        string storyContext = "";
        if (!string.IsNullOrEmpty(request.StoryId) && Guid.TryParse(request.StoryId, out var storyGuid))
        {
            var bStory = await dbContext.BehavioralStories
                .FirstOrDefaultAsync(s => s.Id == storyGuid && s.UserId == userId);
            if (bStory != null)
            {
                storyContext = $"Base Story Title: '{bStory.Title}', Situation: '{bStory.Situation}', Task: '{bStory.Task}', Action: '{bStory.Action}', Result: '{bStory.Result}'.";
            }
        }

        var llm = llmFactory.GetClient();
        try
        {
            var prompt = $@"
You are a Staff Hiring Manager conducting a high-stakes behavioral and technical mock interview.
Context provided:
- Target Role: {request.RoleTitle ?? "Senior Software Engineer / Technical Leader"}
- Job Description / Requirements: {request.JobDescription ?? "General modern software engineering and systems leadership"}
- Category Focus: {request.Category ?? "Behavioral / STAR"}
- Candidate's Background Story: {storyContext}

Generate exactly ONE compelling, realistic interview question that rigorously tests this candidate.
Return strictly valid JSON with this schema (no markdown, no other text):
{{
  ""question"": ""Tell me about a time when..."",
  ""category"": ""Behavioral | System Design | Technical | Leadership"",
  ""focusArea"": ""What this question assesses (e.g. Conflict resolution, Technical trade-offs, Ownership)"",
  ""contextTips"": ""A 1-sentence tip on how the candidate should structure their STAR response.""
}}
";

            var responseText = await llm.GenerateCompletionAsync(
                new LlmUsageContext(userId, UsageFeatures.MockQuestion, QuestionPromptVersion),
                prompt,
                "You are a senior tech lead conducting an interview. Always output pure valid JSON.");
            var parsed = ParseQuestionJson(responseText);
            if (parsed != null)
            {
                return parsed;
            }
        }
        // Refusals (limits, budget, demo) reach the caller as 402/503/403; only provider failures fall back.
        catch (Exception ex) when (ex is not AiCallRefusedException)
        {
            logger.LogWarning(ex, "Provider {Provider} failed to generate question. Falling back to built-in generator.", llm.ProviderName);
        }

        return GenerateFallbackQuestion(request, storyContext);
    }

    public async Task<MockInterviewEvaluationResponse> EvaluateAnswerAsync(EvaluateMockAnswerRequest request, string userId)
    {
        var transcript = (request.AnswerTranscript ?? "").Trim();
        if (string.IsNullOrEmpty(transcript))
        {
            return new MockInterviewEvaluationResponse
            {
                Score = 0,
                DeliveryFeedback = "No response transcript was captured. Please speak or type your answer.",
                Strengths = [],
                AreasForImprovement = ["Please provide an answer before requesting evaluation."]
            };
        }

        if (await demoAccountService.IsDemoUserAsync(userId))
        {
            return DemoSamples.Evaluation();
        }

        var llm = llmFactory.GetClient();
        try
        {
            var prompt = $@"
You are an expert interview coach analyzing a candidate's recorded answer.
Question: ""{request.Question}""
Category: ""{request.Category}""
Candidate's Spoken Answer Transcript:
""{transcript}""

Evaluate the candidate's answer using the STAR method (Situation, Task, Action, Result).
Return strictly valid JSON with this exact schema:
{{
  ""score"": 82,
  ""starBreakdown"": {{
    ""situation"": ""Assessment of Situation description..."",
    ""task"": ""Assessment of Task clarity..."",
    ""action"": ""Assessment of specific Actions taken..."",
    ""result"": ""Assessment of measurable Results and Impact...""
  }},
  ""strengths"": [
    ""First major strength of the answer"",
    ""Second strength of the answer""
  ],
  ""areasForImprovement"": [
    ""First specific improvement or missing detail"",
    ""Second actionable tip to increase offer probability""
  ],
  ""modelAnswer"": ""A refined, highly compelling 90-second STAR response to the question."",
  ""deliveryFeedback"": ""Brief analysis of pacing, conciseness, and clarity.""
}}
";

            var responseText = await llm.GenerateCompletionAsync(
                new LlmUsageContext(userId, UsageFeatures.MockEvaluate, EvaluatePromptVersion),
                prompt,
                "You are an expert executive interview coach. Always respond in valid JSON format.");
            var parsed = ParseEvaluationJson(responseText);
            if (parsed != null)
            {
                return parsed;
            }
        }
        // Refusals (limits, budget, demo) reach the caller as 402/503/403; only provider failures fall back.
        catch (Exception ex) when (ex is not AiCallRefusedException)
        {
            logger.LogWarning(ex, "Provider {Provider} failed to evaluate answer. Falling back to built-in evaluation engine.", llm.ProviderName);
        }

        return EvaluateFallbackAnswer(request, transcript);
    }

    private static MockQuestionResponse? ParseQuestionJson(string raw)
    {
        try
        {
            var cleanJson = ExtractJsonBlock(raw);
            using var doc = JsonDocument.Parse(cleanJson);
            var root = doc.RootElement;
            return new MockQuestionResponse
            {
                Question = root.TryGetProperty("question", out var q) ? q.GetString() ?? "" : "",
                Category = root.TryGetProperty("category", out var c) ? c.GetString() ?? "Behavioral" : "Behavioral",
                FocusArea = root.TryGetProperty("focusArea", out var f) ? f.GetString() ?? "Problem Solving" : "Problem Solving",
                ContextTips = root.TryGetProperty("contextTips", out var t) ? t.GetString() ?? "Use STAR format." : "Use STAR format."
            };
        }
        catch
        {
            return null;
        }
    }

    private static MockInterviewEvaluationResponse? ParseEvaluationJson(string raw)
    {
        try
        {
            var cleanJson = ExtractJsonBlock(raw);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<MockInterviewEvaluationResponse>(cleanJson, options);
        }
        catch
        {
            return null;
        }
    }

    private static string ExtractJsonBlock(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            var endIdx = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (endIdx > 7)
            {
                return trimmed.Substring(7, endIdx - 7).Trim();
            }
        }
        else if (trimmed.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            var endIdx = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (endIdx > 3)
            {
                return trimmed.Substring(3, endIdx - 3).Trim();
            }
        }

        var startBrace = trimmed.IndexOf('{');
        var endBrace = trimmed.LastIndexOf('}');
        if (startBrace >= 0 && endBrace > startBrace)
        {
            return trimmed.Substring(startBrace, endBrace - startBrace + 1);
        }

        return trimmed;
    }

    private static MockQuestionResponse GenerateFallbackQuestion(GenerateMockQuestionRequest request, string storyContext)
    {
        var questions = new List<(string Question, string Category, string Focus, string Tips)>
        {
            (
                "Tell me about a time you had to make a critical technical architectural decision under tight deadlines with incomplete information.",
                "Technical Leadership",
                "Decision Making & Risk Management",
                "Frame the constraints (Situation), the decision criteria (Task), your proactive actions (Action), and the production outcome (Result)."
            ),
            (
                "Describe a situation where you had a significant disagreement with a product manager or senior engineer on technical strategy. How did you resolve it?",
                "Behavioral",
                "Conflict Resolution & Alignment",
                "Highlight empathy, data-driven reasoning, and focus on business value rather than personal ego."
            ),
            (
                "Tell me about a complex project that was falling behind schedule or encountered unexpected production blockers. What steps did you take?",
                "Behavioral",
                "Ownership & Execution",
                "Focus on root-cause diagnosis, stakeholder communication, and unblocking the team."
            ),
            (
                "Walk me through a time you identified and resolved a major scalability bottleneck or production incident in a distributed system.",
                "System Design & Reliability",
                "Observability & Problem Solving",
                "Detail the metrics monitored, the debugging methodology, the fix deployed, and post-mortem safeguards created."
            )
        };

        var rand = new Random();
        var selected = questions[rand.Next(questions.Count)];

        if (!string.IsNullOrEmpty(request.RoleTitle))
        {
            return new MockQuestionResponse
            {
                Question = $"As a {request.RoleTitle}, {selected.Question.Substring(0, 1).ToLower()}{selected.Question.Substring(1)}",
                Category = selected.Category,
                FocusArea = selected.Focus,
                ContextTips = selected.Tips
            };
        }

        return new MockQuestionResponse
        {
            Question = selected.Question,
            Category = selected.Category,
            FocusArea = selected.Focus,
            ContextTips = selected.Tips
        };
    }

    /// <summary>
    /// Used only when no AI provider answered. It checks three observable things (length,
    /// first-person action words, and any numbers) and says nothing it did not measure: no model
    /// answer, no default praise, and no figures that are not in the transcript. The response is
    /// flagged <see cref="MockInterviewEvaluationResponse.IsHeuristic"/> so the UI labels it.
    /// </summary>
    internal static MockInterviewEvaluationResponse EvaluateFallbackAnswer(EvaluateMockAnswerRequest request, string transcript)
    {
        var wordCount = transcript.Split(new[] { ' ', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;

        bool hasAction = transcript.Contains("I ", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("we decided", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("implemented", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("built", StringComparison.OrdinalIgnoreCase);

        bool hasMetrics = transcript.Any(char.IsDigit) ||
                          transcript.Contains("percent", StringComparison.OrdinalIgnoreCase) ||
                          transcript.Contains('%');

        // Fixed formula over the three checks above; shown in the UI as an offline heuristic.
        int score = 70 + (wordCount >= 80 ? 10 : -10) + (hasAction ? 10 : 0) + (hasMetrics ? 10 : 0);

        var strengths = new List<string>();
        var improvements = new List<string>();

        if (wordCount >= 80)
            strengths.Add("The answer is long enough to cover context, actions and outcome.");
        else
            improvements.Add("The answer is under 80 words. A full STAR answer usually runs 90 to 120 seconds when spoken.");

        if (hasAction)
            strengths.Add("It describes actions in the first person.");
        else
            improvements.Add("Say what you did yourself: \"I chose\", \"I designed\", \"I rolled back\".");

        if (hasMetrics)
            strengths.Add("It includes at least one number.");
        else
            improvements.Add("Add a measured result if you have one, such as latency, error rate, time saved or users affected.");

        return new MockInterviewEvaluationResponse
        {
            Score = score,
            IsHeuristic = true,
            StarBreakdown = new StarBreakdown
            {
                Situation = wordCount > 40 ? "Long enough to include context." : "Too short to include much context.",
                Task = "Not checked by the offline heuristic.",
                Action = hasAction ? "First-person actions found." : "No first-person actions found.",
                Result = hasMetrics ? "A number appears in the answer." : "No number appears in the answer."
            },
            Strengths = strengths,
            AreasForImprovement = improvements,
            ModelAnswer = string.Empty,
            DeliveryFeedback = $"AI feedback was unavailable, so this is an offline check of length, first-person actions and numbers only. Your answer has {wordCount} words."
        };
    }
}
