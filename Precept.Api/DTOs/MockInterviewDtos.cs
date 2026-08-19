namespace Precept.Api.DTOs;

public class GenerateMockQuestionRequest
{
    public string? JobDescription { get; set; }
    public string? RoleTitle { get; set; }
    public string? Category { get; set; }
    public string? StoryId { get; set; }
}

public class MockQuestionResponse
{
    public string Question { get; set; } = string.Empty;
    public string Category { get; set; } = "Behavioral";
    public string FocusArea { get; set; } = string.Empty;
    public string ContextTips { get; set; } = string.Empty;
}

public class EvaluateMockAnswerRequest
{
    public string Question { get; set; } = string.Empty;
    public string Category { get; set; } = "Behavioral";
    public string AnswerTranscript { get; set; } = string.Empty;
}

public class StarBreakdown
{
    public string Situation { get; set; } = string.Empty;
    public string Task { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
}

public class MockInterviewEvaluationResponse
{
    public int Score { get; set; }
    public StarBreakdown StarBreakdown { get; set; } = new();
    public List<string> Strengths { get; set; } = new();
    public List<string> AreasForImprovement { get; set; } = new();
    public string ModelAnswer { get; set; } = string.Empty;
    public string DeliveryFeedback { get; set; } = string.Empty;
}
