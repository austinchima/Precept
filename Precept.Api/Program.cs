using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;
using Precept.Api.Services.Interfaces;
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

    // Override JWT secret from environment variable if present
    var envSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
    if (!string.IsNullOrWhiteSpace(envSecretKey))
    {
        builder.Configuration["JwtSettings:SecretKey"] = envSecretKey;
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

// Override Identity's default cookie-based authentication scheme
// with JwtBearer — must come AFTER AddIdentity to take precedence.
builder.Services.Configure<Microsoft.AspNetCore.Authentication.AuthenticationOptions>(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
});

// ─────────────────────────────────────────────────────────────
//  3. JWT Settings (strongly typed)
// ─────────────────────────────────────────────────────────────
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration section is missing.");

var secretKey = Encoding.UTF8.GetBytes(jwtSettings.SecretKey);

// ─────────────────────────────────────────────────────────────
//  4. JWT Authentication
// ─────────────────────────────────────────────────────────────
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Require HTTPS in production only
    options.RequireHttpsMetadata = builder.Environment.IsProduction();

    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        // Zero clock skew — access tokens expire exactly when they say they do
        ClockSkew = TimeSpan.Zero
    };

    // Return structured error info in WWW-Authenticate header (useful for debugging)
    options.Events = new JwtBearerEvents
    {
        OnChallenge = context =>
        {
            if (context.AuthenticateFailure is SecurityTokenExpiredException)
            {
                // Take over the response to ensure X-Token-Expired is included
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.Headers.Append("WWW-Authenticate", "Bearer error=\"invalid_token\", error_description=\"The token is expired\"");
                context.Response.Headers.Append("X-Token-Expired", "true");
            }
            return Task.CompletedTask;
        }
    };
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
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IStoryService, StoryService>();
builder.Services.AddScoped<IBehavioralStoryService, BehavioralStoryService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISkillService, SkillService>();
builder.Services.AddScoped<IJobDescriptionService, JobDescriptionService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<ICookieOptionsFactory, CookieOptionsFactory>();

// ─────────────────────────────────────────────────────────────
//  8. Rate Limiting (prevents brute-force and abuse)
// ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    // Auth endpoints: stricter limits
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
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
//  Middleware Pipeline
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
