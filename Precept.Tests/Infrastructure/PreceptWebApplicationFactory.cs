using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Precept.Api.Data;
using Precept.Api.DTOs;

namespace Precept.Tests.Infrastructure;

/// <summary>
/// WebApplicationFactory that boots a test instance of the Precept API
/// against a real PostgreSQL Testcontainer database.
///
/// Per-class isolation: each instance creates a uniquely-named database,
/// so xUnit's parallel test class execution never sees shared state.
/// </summary>
public class PreceptWebApplicationFactory(PostgresContainerFixture containerFixture)
    : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _databaseName = $"precept_test_{Guid.NewGuid():N}";

    // Deterministic test JWT settings — known issuer/audience so token assertions are exact.
    public const string TestJwtSecret = "precept-test-jwt-secret-key-must-be-at-least-32-chars";
    public const string TestIssuer = "precept-test-issuer";
    public const string TestAudience = "precept-test-audience";

    private string ConnectionString => containerFixture.GetConnectionString(_databaseName);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Inject test JWT settings before the app reads configuration
        builder.UseSetting("JWT_SECRET_KEY", TestJwtSecret);
        builder.UseSetting("JwtSettings:SecretKey", TestJwtSecret);
        builder.UseSetting("JwtSettings:Issuer", TestIssuer);
        builder.UseSetting("JwtSettings:Audience", TestAudience);
        builder.UseSetting("JwtSettings:AccessTokenExpiryMinutes", "15");
        builder.UseSetting("JwtSettings:RefreshTokenExpiryDays", "7");

        builder.ConfigureServices(services =>
        {
            // Remove the production DbContext registration and replace with
            // one pointing at the per-class Testcontainer database
            services.RemoveAll<DbContextOptions<PreceptDbContext>>();
            services.RemoveAll<PreceptDbContext>();

            services.AddDbContext<PreceptDbContext>(options =>
                options.UseNpgsql(ConnectionString));
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  Lifecycle: create + migrate database for this test class
    // ─────────────────────────────────────────────────────────────

    public async Task InitializeAsync()
    {
        await CreateDatabaseAsync();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PreceptDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await DropDatabaseAsync();
    }

    // ─────────────────────────────────────────────────────────────
    //  Helpers for creating authenticated HTTP clients
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Registers a user and returns an HttpClient with the JWT pre-set and
    /// a CookieContainer tracking the refresh token cookie.
    /// </summary>
    public async Task<(HttpClient Client, AuthResponse Auth)> CreateAuthenticatedClientAsync(
        string email = "testuser@example.com",
        string password = "TestPass123!")
    {
        // Server.CreateHandler() returns the in-process test transport.
        // Wrapping it in an HttpClientHandler-equivalent that supports cookies
        // requires using a CookieContainer delegating handler chain.
        var cookieContainer = new System.Net.CookieContainer();
        var serverHandler = Server.CreateHandler();
        var cookieHandler = new CookieContainerHandler(cookieContainer, serverHandler);
        var client = new HttpClient(cookieHandler) { BaseAddress = Server.BaseAddress };

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            FirstName = "Test",
            LastName = "User",
            Email = email,
            Password = password,
            ConfirmPassword = password
        });

        registerResponse.EnsureSuccessStatusCode();
        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize AuthResponse");

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        return (client, auth);
    }

    /// <summary>
    /// Returns a raw unauthenticated HttpClient.
    /// </summary>
    public HttpClient CreateAnonymousClient() => CreateClient();

    /// <summary>
    /// Returns an unauthenticated HttpClient with a CookieContainer wired to the
    /// in-process test server.  Use this for raw auth flows (register/login/refresh)
    /// that depend on cookie tracking.
    /// </summary>
    public HttpClient CreateCookieClient()
    {
        var cookieContainer = new System.Net.CookieContainer();
        var cookieHandler = new CookieContainerHandler(cookieContainer, Server.CreateHandler());
        return new HttpClient(cookieHandler) { BaseAddress = Server.BaseAddress };
    }

    /// <summary>
    /// Opens a scoped DbContext connected to this test class's database.
    /// Useful for direct DB assertions (e.g. inspecting token hashes after registration).
    /// </summary>
    public PreceptDbContext CreateDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<PreceptDbContext>();
    }

    // ─────────────────────────────────────────────────────────────
    //  Private: database lifecycle helpers
    // ─────────────────────────────────────────────────────────────

    private async Task CreateDatabaseAsync()
    {
        var rootCs = containerFixture.RootConnectionString;
        await using var conn = new NpgsqlConnection(rootCs);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_databaseName}\"";
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task DropDatabaseAsync()
    {
        var rootCs = containerFixture.RootConnectionString;
        await using var conn = new NpgsqlConnection(rootCs);
        await conn.OpenAsync();

        // Two separate commands — Npgsql 8+ pipelines multi-statement CommandText,
        // and PostgreSQL forbids DROP DATABASE inside a pipeline (error 25001).
        await using (var terminate = conn.CreateCommand())
        {
            terminate.CommandText = $"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{_databaseName}' AND pid <> pg_backend_pid();
                """;
            await terminate.ExecuteNonQueryAsync();
        }

        await using (var drop = conn.CreateCommand())
        {
            drop.CommandText = $"""DROP DATABASE IF EXISTS "{_databaseName}" """;
            await drop.ExecuteNonQueryAsync();
        }
    }
}

/// <summary>
/// Delegating handler that adds <see cref="System.Net.CookieContainer"/> support
/// to the in-process <see cref="Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory{T}"/>
/// test transport returned by <c>Server.CreateHandler()</c>.
/// </summary>
internal sealed class CookieContainerHandler(System.Net.CookieContainer cookies, HttpMessageHandler inner)
    : DelegatingHandler(inner)
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Inject stored cookies into the outgoing request
        var cookieHeader = cookies.GetCookieHeader(request.RequestUri!);
        if (!string.IsNullOrEmpty(cookieHeader))
            request.Headers.TryAddWithoutValidation("Cookie", cookieHeader);

        var response = await base.SendAsync(request, cancellationToken);

        // Harvest Set-Cookie headers from the response
        if (response.Headers.TryGetValues("Set-Cookie", out var setCookieHeaders))
        {
            foreach (var header in setCookieHeaders)
                cookies.SetCookies(request.RequestUri!, header);
        }

        return response;
    }
}
