# Precept Testing Strategy

Now that release 1.0 of Precept is complete, securing its functionality with a robust testing suite is critical—especially since it handles personal, private career data. Below is a structured list of what needs testing across the Precept stack, broken down by test type.

## 1. Unit Tests

Unit tests should test the pure logic of your application without hitting the database or external APIs.

### Backend (`Precept.Api`)
* **Domain Entities & Validation Logic**
  * **What to test:** Ensure entities like `Story`, `BehavioralStory`, `Application`, and `Skill` reject invalid states (e.g., null titles, empty categories). Test the `ConfidenceLevel` enum logic if there's any state machine behavior attached to it.
* **Business Services**
  * **What to test:** Use mocks (e.g., Moq) for your database context. Verify core business logic.
    * Example: When an `Application`'s status changes, ensure the service also creates an `ApplicationEvent` log correctly.
    * Example: Ensure the Skills Matrix update logic accurately calculates/saves proficiency levels.
* **Security & Auth Logic (Crucial)**
  * **What to test:** The complex JWT and Refresh Token logic. Test token rotation specifically: verify that issuing a new token revokes the old one in the chained list. Test cascade revocation (if a revoked token is reused, all tokens in that family should be invalidated).

### Frontend (`Precept.Web`)
* **React Context State (`Context API`)**
  * **What to test:** State transitions in your Auth Context and Data Contexts. Verify that `login()`, `logout()`, and token refresh functions correctly update the global state.
* **React Components & Forms**
  * **What to test:** Form submissions for adding a `BehavioralStory` (STAR method). Ensure client-side validation triggers when Situation, Task, Action, or Result fields are empty or exceed length limits.
* **Utility Functions**
  * **What to test:** Helper functions like date formatters for the pipeline timeline or confidence level calculators.

---

## 2. Integration Tests

Integration tests ensure your application layers interact seamlessly, specifically focusing on database interactions and API endpoints.

### Backend (`Precept.Api` + `PostgreSQL`)
* **Entity Framework Core Operations**
  * **What to test:** Use an in-memory database or PostgreSQL Testcontainers. Test the persistence and retrieval of `ApplicationUser` alongside their `Application` and `ApplicationEvent` histories. Ensure cascading deletes work correctly if a user deletes their account.
* **API Endpoints (`WebApplicationFactory`)**
  * **What to test:** Hit your controller endpoints in a test server.
    * **Auth Endpoints:** Ensure login sets the `HttpOnly`, `Secure`, `SameSite=Strict` cookie successfully.
    * **Protected Endpoints:** Attempt to hit `/api/applications` without a JWT, with an expired JWT, and with a valid JWT to ensure the `[Authorize]` attributes are working.
    * **CRUD Operations:** Test the full request-response cycle of creating, reading, updating, and deleting a `Story` or `JobDescription`.

---

## 3. End-to-End (E2E) Tests

E2E tests simulate a real developer using Precept through the UI to the database. Tools like Playwright or Cypress are ideal here.

### Critical Workflows
* **The "Add a STAR Story" Flow**
  * **What to test:** Simulate a user logging in, navigating to the Behavioral Story Bank, filling out the STAR form, saving it, and verifying the new story appears in the UI list.
* **The "Pipeline Tracker" Flow**
  * **What to test:**
    1. User adds a new job application.
    2. User updates the status from "Applied" to "Interviewing".
    3. The system should automatically reflect this change in the pipeline dashboard.
    4. Navigating to the application history should show the exact timestamped `ApplicationEvent` log.
* **The JD Analyzer Flow**
  * **What to test:** A user pastes a job description, and the system maps and highlights coverage gaps based on their existing `Skill` and `Story` bank.

---

## 4. Security & Privacy Tests

Given the focus on containerized privacy and security, these tests are highly recommended.

* **Data Export Feature**
  * **What to test:** Ensure the raw JSON payload export endpoint correctly gathers *all* data associated with a `UserId` and does not leak data from other users.
* **Cookie Security Constraints**
  * **What to test:** Write integration tests specifically verifying that the `Set-Cookie` headers for refresh tokens strictly contain `HttpOnly`, `Secure`, and `SameSite` flags.
