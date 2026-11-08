
Elema API — Better Auth Migration Test Plan

Date: 2026-11-08
Status: Planned — tests not yet executed
Target branch: "Elema-api"
Target database: Neon Preview only
Production changes: Prohibited without explicit approval

1. Purpose

This document defines the verification strategy for migrating Elema API from Supabase Auth to Better Auth.

The purpose is to detect authentication, authorization, data integrity, security, and regression problems before any production release.

A test is not considered passed until its execution and result have been recorded.

2. Test Environments

Development

- Git branch: "Elema-api"
- Backend: Render service "BNGproject"
- Frontend: Elema API frontend Preview
- Database: Neon Preview branch "preview/Elema-api"

Protected environments

The following must not be modified during these tests:

- Git branch "main"
- Neon Production branch
- Production user records
- Production authentication configuration
- Production domain and DNS settings

Tests must use dedicated test accounts and synthetic data.

Never use real users' passwords or production credentials in automated tests.

3. Test Categories

The migration requires the following test categories:

1. Backend configuration and health.
2. Database schema and connectivity.
3. Better Auth authentication.
4. Session and cookie management.
5. Role-based authorization.
6. User data isolation.
7. Business resource CRUD.
8. AI provider routing.
9. Quota management.
10. Data migration integrity.
11. Frontend integration.
12. Security and regression.

4. Backend and Database Tests

Backend health

- [ ] Backend health endpoint returns HTTP 200.
- [ ] Database connectivity is confirmed.
- [ ] Better Auth configuration is loaded.
- [ ] Missing required environment variables cause a clear startup failure.
- [ ] No secret values appear in logs or responses.

Database

- [ ] Backend connects to Neon Preview.
- [ ] Better Auth tables exist.
- [ ] Required business tables exist.
- [ ] Foreign-key constraints are valid.
- [ ] Required indexes exist.
- [ ] Database errors are handled safely.
- [ ] No test writes reach Neon Production.

5. Authentication Tests

Email registration

- [ ] Valid email and password registration succeeds.
- [ ] Duplicate email registration is rejected.
- [ ] Invalid email is rejected.
- [ ] Password below the configured minimum is rejected.
- [ ] Password is never stored or logged in plaintext.
- [ ] New account receives the default "user" role.

Email login

- [ ] Valid credentials create a session.
- [ ] Invalid credentials are rejected.
- [ ] Unknown accounts are rejected safely.
- [ ] Login errors do not expose sensitive account information.

Session management

- [ ] Session is available after successful login.
- [ ] Session persists after page reload.
- [ ] Expired sessions are rejected.
- [ ] Logout invalidates the session.
- [ ] Cookies use appropriate Secure, HttpOnly, and SameSite settings.
- [ ] Cross-origin requests follow the configured trusted-origin policy.

Password recovery

- [ ] Recovery request can be initiated.
- [ ] Recovery message is delivered through the configured email provider.
- [ ] Invalid or expired recovery tokens are rejected.
- [ ] Password can be changed using a valid recovery flow.
- [ ] Existing sessions follow the configured invalidation policy.

Phone registration

- [ ] Recovery email is mandatory.
- [ ] International phone numbers are normalized consistently.
- [ ] Duplicate phone usernames are rejected.
- [ ] Phone registration is compatible with the selected Better Auth plugin.
- [ ] Recovery uses the recovery email.
- [ ] Phone ownership is not treated as verified without actual verification.

6. Authorization and Roles

Unauthenticated requests

- [ ] Protected endpoints return HTTP 401 without a valid session.
- [ ] Expired sessions cannot access protected resources.
- [ ] Invalid session cookies are rejected.

User isolation

- [ ] User A can access their own projects.
- [ ] User A cannot read User B's projects.
- [ ] User A cannot update User B's projects.
- [ ] User A cannot delete User B's projects.
- [ ] Client-supplied user IDs cannot override the authenticated identity.

Administrative permissions

- [ ] New users receive "user".
- [ ] Users cannot promote themselves.
- [ ] Only Super Admin can perform Super Admin operations.
- [ ] Sub-admin permissions are restricted to explicitly authorized operations.
- [ ] Unauthorized administrative requests return HTTP 403.
- [ ] Existing Super Admin identity is preserved.

7. Business Resource Tests

API projects

- [ ] Create an API project.
- [ ] Read the created project.
- [ ] Update the project.
- [ ] Delete the project.
- [ ] Confirm ownership is correct.
- [ ] Confirm another user cannot access it.

AI agents

- [ ] Create an AI agent.
- [ ] Read the created agent.
- [ ] Update the agent.
- [ ] Delete the agent.
- [ ] Verify ownership and isolation.

Applications

- [ ] Create an application project.
- [ ] Read the created application.
- [ ] Update the application.
- [ ] Delete the application.
- [ ] Verify ownership and isolation.

Secrets

- [ ] API secrets are stored using the approved secure mechanism.
- [ ] Secret values are never returned in ordinary project responses.
- [ ] Unauthorized users cannot retrieve or modify secrets.

8. Chat IA and Provider Tests

Authentication

- [ ] Authenticated users can submit a chat request.
- [ ] Unauthenticated requests are rejected.
- [ ] The backend derives user identity from the verified session.
- [ ] Forged user IDs are ignored.

Provider routing

- [ ] Groq routing works.
- [ ] Gemini routing works.
- [ ] OpenRouter routing works.
- [ ] Selected model is respected.
- [ ] Provider credentials remain server-side.
- [ ] Provider errors are handled safely.
- [ ] Fallback occurs only for eligible transient failures.

Quotas

- [ ] User quota is checked before processing.
- [ ] Quota is shared across configured providers.
- [ ] Reservations are atomic.
- [ ] Concurrent requests cannot exceed quota through race conditions.
- [ ] Successful usage is recorded.
- [ ] Failed requests release reservations according to policy.
- [ ] Administrative quota exemptions are server-controlled.

9. Data Migration Tests

Source and destination comparison

- [ ] Source table counts are recorded.
- [ ] Destination table counts are recorded.
- [ ] Migrated user identities are accounted for.
- [ ] Existing API project is preserved.
- [ ] Subscription plans are preserved.
- [ ] Launch settings are preserved.
- [ ] Existing ownership references are valid.
- [ ] Foreign-key relationships are valid.
- [ ] Empty tables are created where required.

Idempotency

- [ ] Running the migration twice does not duplicate records.
- [ ] Existing records are updated only according to the migration policy.
- [ ] Failed migrations can be safely resumed.
- [ ] Migration results are auditable.

10. Frontend Integration Tests

- [ ] Vite production build succeeds.
- [ ] Login form works with Better Auth.
- [ ] Registration form works with Better Auth.
- [ ] Password recovery flow works.
- [ ] Authentication state survives reload.
- [ ] Protected pages require authentication.
- [ ] Dashboard renders after login.
- [ ] Chat IA works through Render.
- [ ] API project CRUD works through Render.
- [ ] AI agent and application flows remain functional.
- [ ] Logout returns the user to the authentication page.
- [ ] No protected business operation depends on Supabase Auth.

11. End-to-End Acceptance Scenario

Execute the following scenario using a dedicated test account:

1. Open the Preview application.
2. Register a new test account.
3. Confirm the default "user" role.
4. Log in.
5. Open the user dashboard.
6. Submit a Chat IA request.
7. Create an API project.
8. Read and update the project.
9. Confirm project ownership.
10. Log out.
11. Attempt to access a protected endpoint.
12. Confirm the request is rejected.

Repeat the isolation tests with a second test account.

12. Security Review

- [ ] No provider API keys in frontend bundles.
- [ ] No database secrets in frontend bundles.
- [ ] No service-role credentials exposed to browsers.
- [ ] No trust in client-supplied ownership identifiers.
- [ ] No user role escalation.
- [ ] No unauthorized cross-user access.
- [ ] No sensitive values in application logs.
- [ ] CORS and trusted origins are restrictive.
- [ ] Cookies use appropriate security attributes.
- [ ] Input validation is present on protected endpoints.
- [ ] Rate limits are configured for sensitive operations.

13. Test Reporting

For every test, record:

Field| Description
Test ID| Unique test identifier
Category| Authentication, CRUD, quota, etc.
Environment| Preview only
Status| Not run, Passed, Failed, Blocked
Evidence| Test output or screenshot
Defect| Related issue, if any
Date| Execution date

Do not mark tests as passed before execution.

14. Release Gate

The migration cannot be approved for Production until:

- All critical authentication tests pass.
- All authorization and isolation tests pass.
- Data integrity checks pass.
- Chat IA and quota tests pass.
- Frontend integration tests pass.
- Production build succeeds.
- No unresolved critical security issue remains.
- Preview acceptance is explicitly confirmed.

Production migration requires a separate explicit approval.

15. Rollback Conditions

Stop the migration and investigate if:

- User identities cannot be mapped safely.
- Existing project ownership is lost.
- Cross-user data access is possible.
- Authentication sessions behave inconsistently.
- Quota accounting becomes inaccurate.
- Production is unexpectedly affected.
- Critical business data is missing or duplicated.

Supabase must remain available as a rollback source until final migration acceptance.

Final rule: tests and implementation remain on "Elema-api" and Neon Preview. "main" and Neon Production remain untouched.
