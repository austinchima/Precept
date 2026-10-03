using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Precept.Api.Services.Usage;

/// <summary>
/// Turns AI calls refused by the usage guard into structured responses:
/// 402 for a user limit, 503 for the global daily cap, 403 for demo accounts.
/// </summary>
public sealed class AiCallRefusedExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        context.Result = context.Exception switch
        {
            UsageLimitExceededException e => new ObjectResult(new
            {
                code = "limit_reached",
                feature = e.Feature,
                remaining = e.Remaining,
                resetsAt = e.ResetsAt,
                message = "You have used all of this AI feature's allowance for now. It resets at the time shown.",
            })
            { StatusCode = StatusCodes.Status402PaymentRequired },

            AiBudgetExhaustedException e => new ObjectResult(new
            {
                code = "ai_unavailable",
                resetsAt = e.ResetsAt,
                message = "AI features are paused for the rest of the day. Everything else keeps working.",
            })
            { StatusCode = StatusCodes.Status503ServiceUnavailable },

            DemoAiRefusedException => new ObjectResult(new
            {
                code = "demo_ai_disabled",
                message = "The demo shows sample AI responses only. Create an account to use AI features.",
            })
            { StatusCode = StatusCodes.Status403Forbidden },

            _ => null,
        };

        if (context.Result is not null)
        {
            context.ExceptionHandled = true;
        }
    }
}
