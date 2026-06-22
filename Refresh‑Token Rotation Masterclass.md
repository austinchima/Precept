# Refresh‑Token Rotation Masterclass

## Background
The authentication system uses rotating refresh tokens. A client presents a refresh token, the server marks the old token as revoked, creates a new token, and returns it. Reuse‑detection is added: if a revoked token is presented again, the system assumes it was stolen and revokes **all** sessions for that user.

## The Hidden Trap
Two legitimate use‑cases collide with the security guard:

1. **Concurrent requests** – a user has the same page open in two tabs or clicks the refresh button twice quickly. Both requests carry the same active token.
2. **Dead‑heat race** – the two requests hit the database at the same millisecond. Each sees the token as still active, each attempts to rotate it. If both rotations succeed, we end up with two valid child tokens and a phantom session.

When the second request finally reaches the server after the first has already revoked the token, the reuse‑detection logic sees a revoked token and treats it as a replay attack. The result is an aggressive cascade revocation that logs the genuine user out of **all** devices. The security feature becomes a usability bug.

## Why the Original Code Failed
* The code checked only `IsRevoked && RevokedAt within grace window` without verifying that the token is the **direct parent** of the current token. A replay of a token two generations back (`A -> B -> C`) still satisfied the time condition and avoided cascade, leaving a stolen token alive.
* Revocation of the parent token and insertion of the child token were performed in separate `SaveChangesAsync` calls. Without a concurrency guard, two overlapping requests could each succeed, creating two live tokens.
* No optimistic concurrency check on the `RevokedAt` column meant the second update silently overwrote the first instead of failing.

## The Fix – Three Pillars
### 1. Lineage Guard
Before performing a cascade revocation, verify that the replayed token is the **immediate predecessor** of the currently active token. If it is, treat the request as a benign retry and return a 401 with a “token just refreshed” message. If it is not, treat it as an attack and revoke all sessions.

### 2. Optimistic Concurrency on `RevokedAt`
Add a `[ConcurrencyCheck]` attribute to the `RevokedAt` property of the `RefreshToken` entity. EF Core then generates an `UPDATE … WHERE RevokedAt IS NULL` statement. When two requests try to set `RevokedAt` at the same time, the second update affects zero rows and EF throws `DbUpdateConcurrencyException`.

### 3. Single‑Save Atomic Rotation
Wrap the parent revocation and child insertion in a single `SaveChangesAsync` call. The transaction updates the parent row and inserts the child row together. If a `DbUpdateConcurrencyException` occurs, catch it, discard the child token, and return the benign 401.

## Test‑Driven Validation
The fix is proven by four focused integration tests:

* **Dead‑heat guard** – starts two devices, forces a race, and asserts `active‑token‑count == 2`. This guarantees no phantom session survives.
* **Non‑parent replay** – builds a chain `A -> B -> C`, replays `A` within the grace window, and asserts that `A`, `B`, and `C` are all revoked. It validates the lineage check.
* **Replay after window** – replays the direct parent token just after the grace period and expects a full cascade revocation.
* **Cookie options** – unit tests confirm that production cookies are `Secure` and `SameSite=Strict` while testing cookies remain `Lax`.

All 65 tests now pass, and the test count math (61 original + 2 unit + 2 integration – 1 obsolete = 65) matches the suite output.

## Takeaways
* Security checks must be **context‑aware**. A simple time‑based rule can miss the lineage dimension.
* Optimistic concurrency is a light‑weight way to protect against dead‑heat races without introducing distributed locks.
* One‑save atomic operations keep the database state consistent and make the failure mode easy to reason about.
* Writing targeted integration tests that exercise the exact invariants you care about is essential. Simple status‑code checks are not enough.

## Next Steps
* Ensure the frontend Axios interceptor treats the “Token just refreshed” 401 as a benign retry instead of a login redirect.
* Deploy the updated AuthController behind the feature flag and monitor the rollout.
* Document the race condition and the fix in the team’s security handbook.

---

This masterclass captures the problem, the reasoning, the concrete code changes, and the verification strategy so any future engineer can understand and extend the solution.
