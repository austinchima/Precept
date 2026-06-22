# Testing Masterclass: Understanding Your Test Suite

Welcome. Take a seat. 

A true engineer doesn't just write code that works; they write code that proves it works. That's the essence of Test-Driven Development (TDD). You've successfully built a robust test suite for the Precept application, but to truly own this codebase, you must understand exactly *what* these tests are doing under the hood.

Today, we're going to break down the anatomy of your tests, line by line.

---

## 1. The Philosophy: Unit vs. Integration Tests

Before we look at code, let's establish the ground rules.

> [!NOTE]
> **Unit Tests** test a single component in isolation (e.g., a specific C# class like `TokenService`). They are lightning-fast and mock out dependencies like databases. 
> 
> **Integration Tests** test the entire pipeline. They spin up a real web server, connect to a real database, hit the HTTP endpoints, and verify the final HTTP responses and database state.

---

## 2. The Engine: `PreceptWebApplicationFactory`

In integration tests, you don't want to mock the database—you want to test against the real thing. But you also don't want tests stepping on each other's toes by modifying the same data.

In your suite, we use a pattern involving `Testcontainers`. Every time your integration tests run, Docker spins up a pristine, temporary PostgreSQL database. The `PreceptWebApplicationFactory` intercepts your application's startup, overrides the database connection string to point to this Docker container, and runs EF Core migrations. This guarantees that your tests always run against a clean, production-like database schema.

---

## 3. Deep Dive: Integration Testing the Endpoints

Let's look at `AuthEndpointTests.cs`. This is an integration test class. We are simulating a real client (like a browser or mobile app) talking to your API.

### The Registration Test

Let's break down `Register_Returns200_AndSetsFullySecureCookie`:

```csharp
[Fact]
public async Task Register_Returns200_AndSetsFullySecureCookie()
{
    // 1. Arrange & Act: We call our helper method to hit the /api/auth/register endpoint.
    var (response, _) = await RegisterAsync();

    // 2. Assert Status: The server should return 200 OK.
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    // 3. Extract the Cookie: We look at the Set-Cookie headers in the HTTP response.
    var cookie = ExtractRefreshCookieHeader(response);
    
    // 4. Assert Cookie Existence: If it's null, the test fails with the provided message.
    cookie.Should().NotBeNull("a refreshToken cookie must be set");
    
    // 5. Assert Cookie Security Flags:
    // This ensures our XSS and CSRF defenses are active.
    cookie!.Should().ContainEquivalentOf("HttpOnly"); // JS cannot read it (XSS protection)
    cookie.Should().ContainEquivalentOf("path=/api/auth"); // Only sent to auth routes
    cookie.Should().MatchRegex("(?i)samesite=(Lax|Strict)"); // CSRF protection
}
```

### The Reuse Detection Test (The Vault)

You asked earlier about the reuse detection test. This is `Refresh_Returns401_WithRevokedToken_RevokesAllSessions`. This test verifies our defense mechanism against stolen refresh tokens.

```csharp
[Fact]
public async Task Refresh_Returns401_WithRevokedToken_RevokesAllSessions()
{
    // 1. Setup: Register a new user.
    var email = UniqueEmail();
    var (r1, client1) = await RegisterAsync(email: email);
    r1.EnsureSuccessStatusCode();

    // 2. Capture the Thief's Target: We grab the raw cookie the server just gave client1.
    // We do this BEFORE we rotate the token, because the HttpClient will automatically 
    // replace it in its cookie jar once it gets a new one.
    var originalCookie = ExtractRefreshCookieHeader(r1)!;
    var originalRawToken = ExtractRawTokenFromCookieHeader(originalCookie);

    // 3. Legitimate Second Login: The user logs in on their phone (client2).
    // Now the user has TWO active sessions in the database.
    var client2 = _factory.CreateCookieClient();
    (await client2.PostAsJsonAsync("/api/auth/login",
        new { Email = email, Password = "ValidPass123!" })).EnsureSuccessStatusCode();

    // 4. Legitimate Rotation: client1 refreshes their token. 
    // The server gives them a new token, and marks their original token as "Revoked".
    await client1.PostAsync("/api/auth/refresh", null);

    // 5. The Attack: A hacker stole client1's ORIGINAL cookie and tries to use it.
    // We create a brand new client, forge the HTTP request, and inject the stolen cookie.
    var replayClient = _factory.CreateAnonymousClient();
    var replayRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
    replayRequest.Headers.TryAddWithoutValidation("Cookie", $"refreshToken={Uri.EscapeDataString(originalRawToken)}");
    
    var replayResp = await replayClient.SendAsync(replayRequest);

    // 6. Assert Defense Triggered: The server must reject it (401).
    replayResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    
    var body = await replayResp.Content.ReadAsStringAsync();
    body.Should().Contain("reuse", "response must indicate reuse detection");

    // 7. Assert The Fallout: The server should have realized someone is playing games.
    // It must burn ALL sessions to protect the user account.
    await using var db = _factory.CreateDbContext();
    var allTokens = await db.RefreshTokens.ToListAsync();
    
    // We loop through all tokens for this user and assert that RevokedAt has a value.
    allTokens.Should().AllSatisfy(t =>
        t.RevokedAt.Should().NotBeNull("all sessions must be revoked on token reuse"));
}
```

---

## 4. Deep Dive: Unit Testing the Engine

Now let's look at a unit test: `TokenServiceTests.cs`. Here, we aren't spinning up a web server or a database. We are directly instantiating the `TokenService` class and testing its raw logic.

### Testing Time Constraints

How do you test that an expired token is rejected without writing a test that actually waits 15 minutes? You control time itself.

```csharp
[Fact]
public void ValidateExpiredToken_ReturnsNull_WhenIssuerIsWrong()
{
    // 1. Time Manipulation: We create a FakeTimeProvider.
    // We tell it that the "current time" is actually 2 hours ago.
    var fakeTime = new FakeTimeProvider();
    fakeTime.SetUtcNow(DateTimeOffset.UtcNow.AddHours(-2));

    // 2. Configuration: We configure our service to generate tokens with a 1-minute lifespan.
    var settings = new JwtSettings
    {
        SecretKey = ValidSecret, Issuer = "wrong-issuer",
        Audience = Audience, AccessTokenExpiryMinutes = 1
    };
    
    // 3. Service Instantiation: We pass our fake clock to the service.
    var wrongIssueSvc = new TokenService(Options.Create(settings), fakeTime);
    
    // 4. Token Generation: The token is generated as if it's 2 hours ago.
    // Since it only lasts 1 minute, it "expired" 1 hour and 59 minutes ago.
    var token = wrongIssueSvc.GenerateAccessToken(MakeUser(), []);

    // 5. Assertion: We pass this genuinely expired token to a healthy TokenService.
    // We assert that the token validation fails (returns null) because the issuer string was wrong,
    // proving our security parameters are strictly enforced.
    var principal = CreateService().ValidateExpiredToken(token);
    principal.Should().BeNull("token with wrong issuer must be rejected");
}
```

> [!TIP]
> Notice the difference? The Integration test relies on HTTP calls, JSON parsing, and database context. The Unit test is just raw C# class instantiation and method invocation. Both are vital.

---

## Summary

To become a TDD master, you must learn to read tests not as chores, but as **specifications**. 

1. **Arrange**: Set up the state (Create a user, fake the clock, inject a cookie).
2. **Act**: Perform the operation (Hit the endpoint, call the method).
3. **Assert**: Verify the exact state of the universe (Check HTTP status, query the database, inspect the return value).

Your test suite is your safety net. It allows you to confidently refactor, knowing that if you break a core security feature, the tests will immediately catch it. 

Study these patterns. Own them. And you will write unshakeable software.
