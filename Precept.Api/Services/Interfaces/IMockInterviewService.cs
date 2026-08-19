using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces;

public interface IMockInterviewService
{
    Task<MockQuestionResponse> GenerateQuestionAsync(GenerateMockQuestionRequest request, string userId);
    Task<MockInterviewEvaluationResponse> EvaluateAnswerAsync(EvaluateMockAnswerRequest request, string userId);
}
