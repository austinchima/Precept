using Precept.Api.DTOs;

namespace Precept.Api.Services;

/// <summary>
/// Fixed mock interview responses served to demo accounts instead of calling an LLM.
/// Every response is marked <c>IsDemoSample</c> so the UI can label it.
/// </summary>
public static class DemoSamples
{
    public static MockQuestionResponse Question() => new()
    {
        Question = "Tell me about a production incident you helped resolve. What did you check first, and what did you change afterwards?",
        Category = "Behavioral",
        FocusArea = "Ownership and debugging under pressure",
        ContextTips = "Demo sample question. No AI model was used. Sign up to get questions built from your own stories.",
        IsDemoSample = true
    };

    public static MockInterviewEvaluationResponse Evaluation() => new()
    {
        Score = 0,
        StarBreakdown = new StarBreakdown
        {
            Situation = "A full evaluation would check whether you named the system, who was affected and why it mattered.",
            Task = "It would check whether your own responsibility in the incident is clear.",
            Action = "It would look for the specific steps you took, in order, and why you chose them.",
            Result = "It would check whether you stated the outcome and what changed to prevent a repeat."
        },
        Strengths = ["Demo sample: your answer was not evaluated."],
        AreasForImprovement = ["Sign up to get AI feedback on your actual answer."],
        ModelAnswer = string.Empty,
        DeliveryFeedback = "Demo sample feedback. No AI model was used and your answer was not scored.",
        IsDemoSample = true
    };
}
