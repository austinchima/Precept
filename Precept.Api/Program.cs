using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.SpacedRepetition;
using Scalar.AspNetCore;
using Serilog;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/api-log-.txt", rollingInterval: RollingInterval.Day));

// ─────────────────────────────────────────────────────────────
//  Load .env file (production secrets — skipped during integration tests)
// ─────────────────────────────────────────────────────────────
if (!builder.Environment.IsEnvironment("Testing"))
{
    var envPath = Path.Combine(builder.Environment.ContentRootPath, ".env");
    if (File.Exists(envPath))
    {
        DotNetEnv.Env.Load(envPath);
    }

    // JWT_SECRET_KEY is no longer required — cookie auth uses ASP.NET Core
    // Data Protection keys instead of a shared HMAC signing secret.

    var resendKey = Environment.GetEnvironmentVariable("RESEND_API_KEY");
    if (!string.IsNullOrWhiteSpace(resendKey))
    {
        builder.Configuration["Resend:ApiKey"] = resendKey;
    }

    var resendFrom = Environment.GetEnvironmentVariable("RESEND_FROM_EMAIL");
    if (!string.IsNullOrWhiteSpace(resendFrom))
    {
        builder.Configuration["Resend:FromEmail"] = resendFrom;
    }

    var geminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    if (!string.IsNullOrWhiteSpace(geminiKey))
    {
        builder.Configuration["Gemini:ApiKey"] = geminiKey;
        builder.Configuration["AiSettings:GeminiApiKey"] = geminiKey;
    }

    var openAiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    if (!string.IsNullOrWhiteSpace(openAiKey))
    {
        builder.Configuration["AiSettings:OpenAiApiKey"] = openAiKey;
    }

    var anthropicKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
    if (!string.IsNullOrWhiteSpace(anthropicKey))
    {
        builder.Configuration["AiSettings:AnthropicApiKey"] = anthropicKey;
    }

    var aiKey = Environment.GetEnvironmentVariable("AI_API_KEY");
    if (!string.IsNullOrWhiteSpace(aiKey))
    {
        builder.Configuration["AiSettings:ApiKey"] = aiKey;
    }

    var aiProvider = Environment.GetEnvironmentVariable("AI_PROVIDER");
    if (!string.IsNullOrWhiteSpace(aiProvider))
    {
        builder.Configuration["AiSettings:Provider"] = aiProvider;
    }

    var aiModel = Environment.GetEnvironmentVariable("AI_MODEL");
    if (!string.IsNullOrWhiteSpace(aiModel))
    {
        builder.Configuration["AiSettings:Model"] = aiModel;
    }

    var aiBaseUrl = Environment.GetEnvironmentVariable("AI_BASE_URL");
    if (!string.IsNullOrWhiteSpace(aiBaseUrl))
    {
        builder.Configuration["AiSettings:BaseUrl"] = aiBaseUrl;
    }
}

// ─────────────────────────────────────────────────────────────
//  1. Database
// ─────────────────────────────────────────────────────────────
builder.Services.AddDbContext<PreceptDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─────────────────────────────────────────────────────────────
//  2. Time
// ─────────────────────────────────────────────────────────────
// Registered as a singleton so services can inject TimeProvider and tests
// can substitute FakeTimeProvider for deterministic date assertions.
builder.Services.AddSingleton(TimeProvider.System);


// ─────────────────────────────────────────────────────────────
//  3. ASP.NET Identity
// ─────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Password policy
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;

    // Lockout policy (brute-force protection)
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.RequireUniqueEmail = true;

    // Allow spaces in user names (for names like "Sam Smith")
    // options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+ ";
})
.AddEntityFrameworkStores<PreceptDbContext>()
.AddDefaultTokenProviders();

// ─────────────────────────────────────────────────────────────
//  4. Identity application cookie (session authentication)
// ─────────────────────────────────────────────────────────────
// AddIdentity registers the cookie scheme as the default. Configure it here:
// HttpOnly + Secure + SameSite=Strict cookie with a 14-day sliding expiration.
// Security-stamp validation (built into the cookie scheme) revokes existing
// cookies server-side whenever the user's security stamp changes.
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "precept_auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = builder.Environment.IsProduction()
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = builder.Environment.IsProduction()
        ? SameSiteMode.Strict
        : SameSiteMode.Lax;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);

    // API: return 401/403 JSON status codes instead of redirecting to a login page.
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// Validate the security stamp on every request so that password resets,
// account deletion, and "sign out everywhere" invalidate other sessions
// immediately rather than after the default 30-minute interval.
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
{
    options.ValidationInterval = TimeSpan.Zero;
});

// ─────────────────────────────────────────────────────────────
//  5. Authorization
// ─────────────────────────────────────────────────────────────
builder.Services.AddAuthorization();

// ─────────────────────────────────────────────────────────────
//  6. Current-user accessor (feeds global query filters in DbContext)
// ─────────────────────────────────────────────────────────────
// Scoped, not singleton — reads per-request HttpContext claims.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

// ─────────────────────────────────────────────────────────────
//  7. Application Services
// ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<IDigestQueryService, DigestQueryService>();
builder.Services.AddHostedService<DailyDigestService>();
builder.Services.AddSingleton<ISpacedRepetitionAlgorithm, Sm2Algorithm>();
builder.Services.AddSingleton<IReviewScheduler, ReviewScheduler>();
builder.Services.AddScoped<IStoryService, StoryService>();
builder.Services.AddScoped<IBehavioralStoryService, BehavioralStoryService>();
builder.Services.AddScoped<IEmailService, ResendEmailService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISkillService, SkillService>();
builder.Services.AddScoped<IJobDescriptionService, JobDescriptionService>();
builder.Services.AddSingleton<IJobDescriptionKeywordExtractor, JobDescriptionKeywordExtractor>();
builder.Services.AddSingleton<IJobPostingContentExtractor, JobPostingContentExtractor>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("AiClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.Configure<AiSettings>(builder.Configuration.GetSection(AiSettings.SectionName));
builder.Services.AddSingleton<ILlmClientFactory, LlmClientFactory>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IMockInterviewService, MockInterviewService>();

// ─────────────────────────────────────────────────────────────
//  8. Rate Limiting (prevents brute-force and abuse)
// ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    // Auth endpoints: stricter limits (sliding window to prevent boundary bursts)
    options.AddSlidingWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 6;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // General API: generous limits for normal use
    options.AddFixedWindowLimiter("general", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Too many requests. Please slow down and try again." },
            token);
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteDev", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });

    // Production CORS: origins are read from the CORS_ORIGINS environment variable
    // as a comma-separated list (e.g. https://app.example.com,https://www.example.com).
    var corsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
    var allowedOrigins = string.IsNullOrWhiteSpace(corsOrigins)
        ? Array.Empty<string>()
        : corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    options.AddPolicy("Production", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins);
        }
        else
        {
            // No origins configured: deny cross-origin requests by default.
            // Set CORS_ORIGINS before deploying.
            policy.WithOrigins("https://localhost");
        }

        policy.WithHeaders("Content-Type", "Authorization", "X-Requested-With")
              .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// ─────────────────────────────────────────────────────────────
//  Initialize Database (Apply Migrations) — DEV ONLY
// ─────────────────────────────────────────────────────────────
// In production, migrations should be applied explicitly during deployment
// to avoid race conditions and ensure schema changes are audited.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("RunMigrationsOnStartup"))
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<PreceptDbContext>();
            context.Database.Migrate();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while migrating the database.");
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Middleware Pipeline (ORDER IS SIGNIFICANT)
//  1. Exception handler  — outermost, catches everything downstream
//  2. HTTPS redirect     — before any content can be served over HTTP
//  3. Security headers   — applied before any response body is written
//  4. Rate limiting      — reject DoS before auth work starts
//  5. CORS               — must precede auth so pre-flight OPTIONS succeeds
//  6. CSRF header check  — mutating API calls must opt in with a custom header
//  7. Authentication     — establishes identity
//  8. Authorization      — enforces policy using established identity
//  9. Endpoints          — actual business logic
// ─────────────────────────────────────────────────────────────

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception exception)
    {
        var statusCode = StatusCodes.Status500InternalServerError;
        var message = "An unexpected error occurred.";

        // Detect database connection/transient failures
        if (exception is Npgsql.NpgsqlException || 
            exception is System.Net.Sockets.SocketException ||
            (exception is InvalidOperationException && exception.InnerException is Npgsql.NpgsqlException))
        {
            statusCode = StatusCodes.Status503ServiceUnavailable;
            message = "Database connection failed. The service is temporarily offline.";
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        // Only expose exception details in development (OWASP A05)
        var detail = app.Environment.IsDevelopment() ? exception.Message : null;
        var response = new { message, detail };
        await context.Response.WriteAsJsonAsync(response);
    }
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Security headers (OWASP A05) — applied to all environments for defense-in-depth
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-Permitted-Cross-Domain-Policies", "none");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
    // CSP is relaxed for the Scalar dev UI; tighten for production front-end deployments
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
    await next();
});

// CORS: use dev policy in development, production policy otherwise
if (app.Environment.IsDevelopment())
    app.UseCors("AllowViteDev");
else
    app.UseCors("Production");

app.UseRateLimiter(); // MUST be after CORS, before auth

// CSRF defense-in-depth: SameSite=Strict on the auth cookie is the primary
// control; additionally require the X-Requested-With header on all mutating
// API requests (cross-site forms cannot set custom headers). This protects
// self-hosters running SameSite=Lax (non-production) or behind odd proxies.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        !HttpMethods.IsGet(context.Request.Method) &&
        !HttpMethods.IsHead(context.Request.Method) &&
        !HttpMethods.IsOptions(context.Request.Method) &&
        context.Request.Headers["X-Requested-With"] != "XMLHttpRequest")
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { message = "Missing X-Requested-With header." });
        return;
    }
    await next();
});

app.UseAuthentication(); // MUST be before UseAuthorization
app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => "Precept API is running...").ExcludeFromDescription();
app.MapGet("/api/health", () => Results.Ok(new { status = "operational" })).ExcludeFromDescription();

// OpenAPI documentation (development only)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.Run();
