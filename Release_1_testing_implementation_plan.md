# Precept Test Suite + RLS — Final Implementation Plan (v3)

## Overview

Two goals, one implementation pass:

1. **Test suite** (`Precept.Tests`) — xUnit + Testcontainers, covering unit, integration, and RLS-specific tests.
2. **Row-Level Security** — a Postgres-enforced tenant boundary across all user-owned tables, wired into EF Core via a `DbCommandInterceptor`. Designed to be forward-compatible with a future multi-tenant release.

---

## Why RLS Now

The current data isolation is application-enforced (`&& s.UserId == userId` in every query). For a personal app that is fine today, but multi-tenancy bolted onto an app-only model is a painful retrofit:

- Every new query must be audited for ownership filters manually.
- A bug that drops one clause silently exposes data — no database-level backstop.
- Adding a tenant concept later means adding RLS anyway, but to a schema that wasn't designed for it.

**Adding RLS now is ~50 lines of code + one migration.** At multi-tenant time, you extend the session variable from `app.current_user_id` to also carry `app.current_tenant_id` and add a second policy predicate — no schema changes, no backfill.

---

## Production Code Changes

### 1. [MODIFY] `ApplicationService.cs` and `TokenService.cs` — `TimeProvider` injection

Replace all `DateTime.UtcNow` references with `_timeProvider.GetUtcNow().UtcDateTime`. Both classes receive `TimeProvider timeProvider` via constructor injection.

**Why**: `CalculateAutoFollowUpDate` and date-stamping logic are currently time-coupled. With a pinned `FakeTimeProvider` in tests, assertions are exact (`== now + 7 days`), not windowed, and DST/midnight edges are testable.

### 2. [NEW] `Precept.Api/Data/RlsCommandInterceptor.cs`

An EF Core `DbCommandInterceptor` that prepends `SET LOCAL app.current_user_id = '...'` before every command. Uses `IHttpContextAccessor` to read the authenticated user's `sub` claim. `SET LOCAL` is transaction-scoped — safe with Npgsql connection pooling, no leakage between requests.

```csharp
// Pseudocode outline — full implementation in execution phase
public class RlsCommandInterceptor(IHttpContextAccessor accessor) : DbCommandInterceptor
{
    private string? CurrentUserId =>
        accessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? accessor.HttpContext?.User.FindFirst("sub")?.Value;

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(...)
    {
        SetUserIdLocal(command);
        return base.ReaderExecutingAsync(...);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(...)
    {
        SetUserIdLocal(command);
        return base.NonQueryExecutingAsync(...);
    }

    private void SetUserIdLocal(DbCommand command)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return;

        // Escape single quotes to prevent injection via the claim value
        var safe = userId.Replace("'", "''");
        command.CommandText = $"SET LOCAL app.current_user_id = '{safe}';\n" + command.CommandText;
    }
}
```

> [!IMPORTANT]
> `SET LOCAL` only persists for the duration of the current transaction. EF Core wraps `SaveChangesAsync` in an implicit transaction, but `FirstOrDefaultAsync` (read queries) is not automatically transactional. The interceptor must also call `BeginTransaction` or the SET LOCAL on reads will be a no-op. The implementation will wrap reads in an explicit short-lived transaction via an override in `PreceptDbContext`.

### 3. [MODIFY] `Precept.Api/Data/PreceptDbContext.cs`

Override `SaveChangesAsync` to always begin an explicit transaction before the save, ensuring `SET LOCAL` is always inside a transaction boundary. Add a `SetUserContext(string userId)` method for test harness use (bypasses `IHttpContextAccessor`).

### 4. [NEW] `Precept.Api/Migrations/XXXXXXXX_AddRowLevelSecurity.cs`

A hand-crafted EF Core migration using `migrationBuilder.Sql(...)` to apply RLS policies. EF Core's model does not natively represent RLS, so this is raw SQL.

```sql
-- Stories
ALTER TABLE "Stories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "Stories"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- BehavioralStories
ALTER TABLE "BehavioralStories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "BehavioralStories"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- Skills
ALTER TABLE "Skills" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "Skills"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- JobDescriptions
ALTER TABLE "JobDescriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "JobDescriptions"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- Applications
ALTER TABLE "Applications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "Applications"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- RefreshTokens (auth system needs this for token lookup — use BYPASSRLS on the superuser role)
ALTER TABLE "RefreshTokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "RefreshTokens"
    USING ("UserId" = current_setting('app.current_user_id', TRUE));

-- ApplicationEvents (no direct UserId — join through Applications)
ALTER TABLE "ApplicationEvents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_isolation ON "ApplicationEvents"
    USING (
        EXISTS (
            SELECT 1 FROM "Applications" a
            WHERE a."Id" = "ApplicationId"
              AND a."UserId" = current_setting('app.current_user_id', TRUE)
        )
    );
```

> [!CAUTION]
> **`RefreshTokens` edge case**: The `/api/auth/refresh` endpoint reads and writes `RefreshTokens` *before* the user is authenticated (the point of the endpoint is to *establish* identity). The interceptor reads the `sub` claim, which doesn't exist yet. The RLS policy on `RefreshTokens` must therefore be applied with `FOR ALL` but with a `TRUE` permissive policy for the lookup role, OR the refresh flow uses a short-lived elevated context. The safest approach: the application DB user is granted `BYPASSRLS` and the policy on `RefreshTokens` is dropped — the auth controller's security is already the `HashToken` lookup and revocation logic, not RLS.

### 5. [MODIFY] `Precept.Api/Program.cs`

```csharp
// Register interceptor and TimeProvider
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<RlsCommandInterceptor>();

// Wire interceptor into EF Core
builder.Services.AddDbContext<PreceptDbContext>((sp, options) =>
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .AddInterceptors(sp.GetRequiredService<RlsCommandInterceptor>()));
```

---

## `Precept.slnx` Update

### [MODIFY] `Precept.slnx`
Add `Precept.Tests/Precept.Tests.csproj` to the solution.

---

## New Project: `Precept.Tests`

### [NEW] `Precept.Tests/Precept.Tests.csproj`

```xml
<PackageReference Include="xunit" />
<PackageReference Include="xunit.runner.visualstudio" />
<PackageReference Include="FluentAssertions" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
<PackageReference Include="Testcontainers.PostgreSql" />
<PackageReference Include="NSubstitute" />
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" />
```

### Test Infrastructure

#### [NEW] `Precept.Tests/Infrastructure/PreceptWebApplicationFactory.cs`

`WebApplicationFactory<Program>` subclass:
- Overrides `ConfigureWebHost` to substitute Npgsql connection string with the Testcontainer's.
- Seeds JWT env vars (`JWT_SECRET_KEY`, `JwtSettings:Issuer`, `JwtSettings:Audience`) with known test values.
- Exposes `CreateAuthenticatedClientAsync(email, password)` → registers + logs in → returns `HttpClient` with `Authorization: Bearer` pre-set.
- Exposes `GetDbContextAsync()` for direct DB inspection in RLS tests.

#### [NEW] `Precept.Tests/Infrastructure/TestDatabaseFixture.cs`

`IAsyncLifetime` class that:
1. Starts one `PostgreSqlContainer` (shared across the test session via `ICollectionFixture<TestDatabaseFixture>`).
2. Each test *class* generates a unique GUID-named database on that container to prevent parallel test class collisions.
3. Tears down the per-class DB in `DisposeAsync`.

---

## Unit Tests

EF InMemory is acceptable here — we are testing pure business logic on hand-seeded data, not relational integrity or RLS.

### [NEW] `Precept.Tests/Unit/TokenServiceTests.cs`

| Test | What it verifies |
|---|---|
| `GenerateAccessToken_ContainsCorrectClaims` | `sub`, `email`, `username`, and all role claims present |
| `GenerateAccessToken_ValidatesIssuerAndAudience` | `ValidateExpiredToken` rejects token with wrong `iss` or `aud` |
| `GenerateRefreshToken_IsBase64_AndUniqueAcrossCalls` | Cryptographically distinct across two calls |
| `ValidateExpiredToken_ReturnsNull_ForAlgorithmNoneAttack` | Algorithm confusion guard |
| `ValidateExpiredToken_ReturnsPrincipal_ForExpiredButValidToken` | Refresh flow reads expired claims |
| `Constructor_Throws_WhenSecretKeyIsUnder32Chars` | Weak-secret guard |

### [NEW] `Precept.Tests/Unit/ApplicationServiceTests.cs`

`FakeTimeProvider` pinned to a fixed UTC instant.

| Test | What it verifies |
|---|---|
| `CreateApplication_PersistsEntity_AndCreatesGenesisEvent` | Application + first `ApplicationEvent` saved in one call |
| `UpdateApplicationStatus_WhenStatusChanges_AppendsEvent` | New `ApplicationEvent` row added |
| `UpdateApplicationStatus_WhenStatusUnchanged_DoesNotAppendEvent` | Idempotent — no duplicate rows |
| `CalculateFollowUpDate_AllStatuses` *[Theory]* | `Applied`→+7d, `PhoneScreen`→+3d, `Interviewing`→+5d, `Offer`→+2d, `Ghosted`→+14d, `Rejected`→pinned now — all exact |
| `DeleteApplication_ReturnsTrue_AndEntityIsGone` | Removed from context |
| `GetApplication_ReturnsEmpty_ForAnotherUsersApplication` | Service-layer isolation |

### [NEW] `Precept.Tests/Unit/StoryServiceTests.cs`

`FakeTimeProvider` pinned.

| Test | What it verifies |
|---|---|
| `CreateStory_MapsAllFieldsCorrectly` | DTO → entity mapping complete |
| `DeleteStory_ReturnsFalse_ForMalformedGuid` | `Guid.TryParse` guard |
| `DeleteStory_ReturnsFalse_ForAnotherUsersStory` | Service-layer ownership |
| `UpdateStoryConfidenceLevel_StampsLastReviewedAt_ToPinnedNow` | Exact timestamp assertion |
| `GetQuizStory_Priority1_UnreviewedBeatsReviewed` | Never-reviewed wins |
| `GetQuizStory_Priority2_PanicBeatesSolid_WhenAllReviewed` | Low-confidence wins |
| `GetQuizStory_Priority3_OldestReviewedDate_AsFallback` | Oldest `LastReviewedAt` wins |
| `GetQuizStory_ReturnsEmptyDto_WhenNoStoriesExist` | Empty-state handled |

---

## Integration Tests

All use Testcontainers (real Postgres) with per-class GUID database isolation.

### [NEW] `Precept.Tests/Integration/AuthEndpointTests.cs`

#### Registration

| Test | What it verifies |
|---|---|
| `Register_Returns200_AndSetsFullySecureCookie` | Cookie has `HttpOnly` + `Secure` + `SameSite=Strict` + `Path=/api/auth` — all four |
| `Register_Returns409_WhenEmailAlreadyExists` | Unique index on real Postgres fires |
| `Register_Returns400_WeakPassword` *[Theory — one case per rule]* | No digit / no uppercase / no special char / under 8 chars — each is a separate case |
| `Register_Returns400_WithMalformedJsonBody` | 400, not 500 — no unhandled exception |
| `Register_PersistsHashedToken_NotRawCookieValue` | Query DB: `SHA256(cookie) == RefreshTokens.Token` — "raw token never stored" invariant |

#### Login

| Test | What it verifies |
|---|---|
| `Login_Returns200_WithValidCredentials` | Access token in response body |
| `Login_Returns401_WithWrongPassword` | Rejected cleanly |

#### Token Refresh — Happy Path (prerequisite for cascade tests)

| Test | What it verifies |
|---|---|
| `Refresh_Returns200_AndReturnsNewAccessToken` | New JWT in body |
| `Refresh_OldToken_IsMarkedRevoked_InDB_AfterRotation` | `RefreshTokens.RevokedAt` is non-null for the old row |
| `Refresh_NewRefreshCookie_DiffersFrom_OldCookie` | The `Set-Cookie` value changes |
| `Refresh_NewToken_IsStoredAsHash_InDB` | `SHA256(new cookie) == new DB row Token` |

#### Token Refresh — Failure Paths

| Test | What it verifies |
|---|---|
| `Refresh_Returns401_WithExpiredToken_DoesNotTriggerCascade` | Expired (not reused) → 401 with expiry message; other active tokens survive |
| `Refresh_Returns401_WithRevokedToken_AndRevokesAllSessions` | Reuse → cascade; all active tokens for that user revoked |
| `Refresh_ExpiredMessage_DiffersFrom_ReuseMessage` | Response bodies are distinguishable — client can show correct UX |

#### Race Condition

> [!CAUTION]
> The current implementation has no optimistic concurrency guard on the check-then-revoke path. Two concurrent `/refresh` calls with the same valid token will race: the second finds the token revoked (by the first) and nukes all sessions. The production fix (a `RowVersion`/`xmin` concurrency token on `RefreshToken`) is required before this test can pass correctly.

| Test | What it verifies |
|---|---|
| `Refresh_ConcurrentRequests_WithSameToken_DoNotLockOutUser` | Two simultaneous refreshes → at most one success + one 401; remaining sessions survive |

#### Protected Route Access

| Test | What it verifies |
|---|---|
| `GetMe_Returns401_WithNoToken` | Unauthenticated |
| `GetMe_Returns401_WithExpiredAccessToken` | Expired JWT → 401; `X-Token-Expired: true` header present |
| `GetMe_Returns200_WithValidToken` | Correct profile returned |

---

### [NEW] `Precept.Tests/Integration/StoryEndpointTests.cs`

| Test | What it verifies |
|---|---|
| `GetStories_Returns401_WithNoAuth` | Protected route |
| `CreateStory_Returns200_AndReturnsId` | Happy path |
| `CreateStory_Returns400_WhenExplanationUnder50Chars` | `[MinLength(50)]` enforced |
| `GetStory_ReturnsEmpty_ForAnotherUsersStory` | Cross-user read isolation |
| `UpdateStory_ReturnsEmpty_ForAnotherUsersStory` | Cross-user **write** isolation (endpoint-level IDOR) |
| `DeleteStory_ReturnsFalse_ForAnotherUsersStory` | Cross-user **delete** isolation (endpoint-level IDOR) |
| `UpdateConfidenceLevel_StampsLastReviewedAt` | DB updated correctly |
| `GetRandomStory_Returns200_AndBelongsToCurrentUser` | `EF.Functions.Random()` runs on real Postgres — previously untestable |

---

### [NEW] `Precept.Tests/Integration/ApplicationEndpointTests.cs`

| Test | What it verifies |
|---|---|
| `CreateApplication_Returns200_WithGenesisEventInResponse` | `Events` has 1 item |
| `UpdateStatus_ToInterviewing_SetsFollowUpTo5DaysFromPinnedNow` | Exact date assertion via `FakeTimeProvider` |
| `UpdateStatus_ToRejected_SetsFollowUpToPinnedNow` | `Rejected` → `now` exactly |
| `GetApplications_WithStatusFilter_ReturnsOnlyMatchingRows` | Filter query on real Postgres |
| `UpdateApplication_ForAnotherUsersApplication_ReturnsEmpty` | Endpoint-level cross-user write |
| `DeleteApplication_ForAnotherUsersApplication_ReturnsFalse` | Endpoint-level cross-user delete |

---

### [NEW] `Precept.Tests/Integration/RowLevelSecurityTests.cs`

These tests verify the **database policy** fires independently of the application layer. They bypass all service and controller code, talking directly to Postgres via the test's `DbContext` with an explicit `SET LOCAL` call.

| Test | What it verifies |
|---|---|
| `RLS_PoliciesExist_OnAllUserOwnedTables` | Query `pg_policies`; assert a policy named `rls_user_isolation` exists on `Stories`, `BehavioralStories`, `Applications`, `Skills`, `JobDescriptions`, `ApplicationEvents` |
| `RLS_DirectQuery_WithWrongUserId_ReturnsZeroRows_ForStories` | `SET LOCAL app.current_user_id = 'user_b'`; raw `SELECT` against `Stories` where all rows belong to `user_a`; result must be empty — DB policy fires with no app code |
| `RLS_DirectQuery_WithCorrectUserId_ReturnsOwnRows` | Same setup; `SET LOCAL` to `user_a`; rows are visible |
| `RLS_ApplicationBugSimulation_QueryWithoutOwnershipFilter_IsBlockedByDB` | Execute a raw query `SELECT * FROM "Stories"` with user_b's context — returns zero rows even without a `WHERE UserId =` clause |
| `RLS_ApplicationEvents_PolicyJoinsThroughApplications` | `SET LOCAL` to user_b; query `ApplicationEvents` where all events belong to user_a's applications; zero rows returned |

---

## Multi-Tenancy Forward-Compatibility Note

The session variable is named `app.current_user_id`. When multi-tenancy is added:
1. Add `app.current_tenant_id` to the interceptor (one line).
2. Add a second predicate to each policy: `AND "TenantId" = current_setting('app.current_tenant_id', TRUE)`.
3. Add a `TenantId` column to the relevant tables.

No policy rewrites. No schema gymnastics. The RLS infrastructure is already in place.

---

## Verification Plan

```bash
# Requires Docker Desktop running
dotnet test Precept.Tests --logger "console;verbosity=detailed"
```

**Expected order of results:**
1. Unit tests pass immediately (no Docker required, EF InMemory).
2. Integration tests pass once the Testcontainer boots (~5–10s first run).
3. `RLS_*` tests will fail until the migration is applied — this is the intended red-green sequence.
4. The concurrent refresh test will fail until the `RowVersion` concurrency fix is applied — documenting the production bug.
