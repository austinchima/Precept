using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// AI-agnostic Mock Interview Service that leverages ILlmClientFactory
/// to support OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Ollama, and offline heuristics.
/// </summary>
public class MockInterviewService(
    ILlmClientFactory llmFactory,
    PreceptDbContext dbContext,
    ILogger<MockInterviewService> logger)
    : IMockInterviewService
{
    public async Task<MockQuestionResponse> GenerateQuestionAsync(GenerateMockQuestionRequest request, string userId)
    {
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

            var responseText = await llm.GenerateCompletionAsync(prompt, "You are a senior tech lead conducting an interview. Always output pure valid JSON.");
            var parsed = ParseQuestionJson(responseText);
            if (parsed != null)
            {
                return parsed;
            }
        }
        catch (Exception ex)
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

            var responseText = await llm.GenerateCompletionAsync(prompt, "You are an expert executive interview coach. Always respond in valid JSON format.");
            var parsed = ParseEvaluationJson(responseText);
            if (parsed != null)
            {
                return parsed;
            }
        }
        catch (Exception ex)
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

    private static MockInterviewEvaluationResponse EvaluateFallbackAnswer(EvaluateMockAnswerRequest request, string transcript)
    {
        var wordCount = transcript.Split(new[] { ' ', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
        int score = 70;

        var strengths = new List<string>();
        var improvements = new List<string>();

        bool hasAction = transcript.Contains("I ", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("we decided", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("implemented", StringComparison.OrdinalIgnoreCase) ||
                         transcript.Contains("built", StringComparison.OrdinalIgnoreCase);

        bool hasMetrics = transcript.Any(char.IsDigit) ||
                          transcript.Contains("percent", StringComparison.OrdinalIgnoreCase) ||
                          transcript.Contains("%") ||
                          transcript.Contains("reduced", StringComparison.OrdinalIgnoreCase) ||
                          transcript.Contains("improved", StringComparison.OrdinalIgnoreCase);

        if (wordCount >= 80)
        {
            score += 10;
            strengths.Add("Good depth and detail in explaining the context and workflow.");
        }
        else
        {
            score -= 10;
            improvements.Add("Answer is somewhat brief (under 80 words). Aim for a 90-120 second response with complete STAR steps.");
        }

        if (hasAction)
        {
            score += 10;
            strengths.Add("Clearly articulated personal ownership and specific actions taken.");
        }
        else
        {
            improvements.Add("Emphasize your individual contribution using 'I chose', 'I designed', or 'I executed' rather than passive phrasing.");
        }

        if (hasMetrics)
        {
            score += 10;
            strengths.Add("Included quantifiable metrics or business impact in the result.");
        }
        else
        {
            improvements.Add("Quantify the final result (e.g. latency reduced by X%, saved Y hours, improved reliability).");
        }

        score = Math.Clamp(score, 45, 95);

        return new MockInterviewEvaluationResponse
        {
            Score = score,
            StarBreakdown = new StarBreakdown
            {
                Situation = wordCount > 40 ? "Clear context established." : "Context was brief; provide more background.",
                Task = "Defined the core objective and challenge.",
                Action = hasAction ? "Strong demonstration of proactive problem solving." : "Add more specific technical actions taken.",
                Result = hasMetrics ? "Impact clearly demonstrated with quantifiable results." : "Result could be strengthened with concrete numbers or metrics."
            },
            Strengths = strengths.Count > 0 ? strengths : new List<string> { "Direct answer to the prompt", "Conversational delivery" },
            AreasForImprovement = improvements.Count > 0 ? improvements : new List<string> { "Pace yourself to stay between 90 and 120 seconds." },
            ModelAnswer = $"In my previous role, our system faced a high-stakes challenge when {request.Question.Replace("Tell me about a time you", "I had to").Replace("?", "")}. I took ownership by diagnosing the root bottleneck, aligning stakeholders on a phased mitigation plan, and implementing automated safeguards. As a result, we eliminated system downtime and improved delivery speed by 35%.",
            DeliveryFeedback = $"Transcript contained {wordCount} words. Delivery is articulate and direct. Structure your final punchline to highlight lasting organizational impact."
        };
    }
}
