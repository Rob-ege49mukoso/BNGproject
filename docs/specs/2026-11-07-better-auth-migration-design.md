
Elema API — Better Auth Migration Design

Date: 2026-11-07
Status: Proposed — implementation pending
Target branch: "Elema-api"
Production: Must remain untouched until explicit approval

1. Objective

Migrate Elema API from Supabase Auth to Better Auth while preserving application functionality, user identity, project ownership, AI usage accounting, and security boundaries.

The migration must be coherent across the frontend, backend, database, and AI gateway. Replacing authentication methods alone is insufficient because project storage and Chat IA currently depend on Supabase Auth sessions and Supabase Row Level Security.

The migration must be developed and tested exclusively on the "Elema-api" branch and Neon Preview environment.

2. Current Architecture

Frontend

- React application built with Vite.
- "src/AuthPage.jsx" uses Supabase Auth for signup and login.
- "src/AuthGate.jsx" checks Supabase sessions and handles logout.
- "src/main.jsx" wraps the application in "AuthGate".
- "src/App.jsx" contains Supabase authentication dependencies for Chat IA.
- "src/lib/projectStorage.js" uses Supabase Auth to identify the current user.
- Project CRUD operations use Supabase tables and RLS policies.

Backend

- Node.js and Express backend hosted on Render.
- Better Auth is mounted at "/api/auth/*".
- Better Auth uses PostgreSQL through the existing database pool.
- Better Auth is configured for email/password authentication.
- The backend health endpoint reports database connectivity.

Database

Neon Preview currently contains the Better Auth tables:

- "user"
- "session"
- "account"
- "verification"

The following business tables currently exist in Supabase:

- "profiles"
- "api_projects"
- "ai_agents"
- "app_projects"
- "api_project_secrets"
- "usage_events"
- "payment_requests"
- "payment_events"
- "subscriptions"
- "subscription_plans"
- "launch_settings"

The quota tables "ai_quota_plans", "ai_user_plans", "ai_quota_daily", and "ai_quota_reservations" are not currently present in Supabase and must be verified before implementation.

3. Target Architecture

Authentication

- Better Auth is the only authentication system.
- Neon PostgreSQL stores Better Auth identities and sessions.
- React uses the official Better Auth React client.
- The Render backend validates authenticated requests using Better Auth sessions.
- Authentication cookies must be configured securely.
- New accounts receive the "user" role by default.
- Role assignment and authorization are enforced server-side.

Roles

The platform must support:

- "user"
- "sub_admin"
- "super_admin"

The existing Elema owner account must retain the Super Admin role.

Users must never be able to assign or elevate their own roles through client requests.

Frontend

The frontend must:

- Use Better Auth for signup, login, session checks, and logout.
- Use the Render backend for protected business-data operations.
- Avoid direct access to protected Supabase tables.
- Never expose provider API keys or privileged database credentials.
- Preserve existing dashboard navigation and user experience.

Backend

The Render backend must provide authenticated endpoints for:

- User profile operations.
- API project CRUD.
- AI agent CRUD.
- Application project CRUD.
- Chat IA requests.
- Usage and quota accounting.
- Subscription and payment operations, subject to authorization.

The backend must derive the authenticated user ID from the verified session. Client-supplied "userId" values must never be trusted for ownership or authorization.

4. Identity and Data Migration

User identifiers

Existing Supabase Auth user IDs are UUIDs. Better Auth user IDs are text values.

The migration must preserve existing ownership relationships. Existing UUIDs may be retained as text identifiers when compatible with the target schema.

If direct preservation is not possible, a deterministic and auditable mapping must be created.

Data migration

The migration must transfer:

- Existing user identity and profile data.
- Existing API projects.
- Subscription plans.
- Launch settings.
- Any relevant usage, payment, subscription, agent, and application records.

Existing empty business tables must be recreated in Neon when required by the application.

All owner and reviewer references must be converted consistently to the Better Auth identity model.

Migration safety

- Neon Preview is the only permitted target during development.
- Production must not be modified.
- Supabase must remain available as a rollback source until acceptance.
- Migration scripts must be idempotent.
- Existing records must not be duplicated during repeated execution.
- Row counts and foreign-key relationships must be verified.

5. Authentication Requirements

The initial migration must support:

- Email/password signup.
- Email/password login.
- Duplicate email rejection.
- Invalid password rejection.
- Session persistence.
- Logout and session invalidation.
- Password recovery through email.
- Secure cookie handling.
- Correct CORS and trusted-origin configuration.

Phone registration

The product requires phone-based registration with a recovery email.

The intended approach is:

- Use the recovery email as the primary verified email identity.
- Store the normalized international phone number as a unique username.
- Use the Better Auth Username plugin or an equivalent supported mechanism.
- Send password recovery codes or links to the recovery email.
- Avoid requiring paid SMS during the initial release.

Phone ownership must not be considered verified unless a phone verification mechanism is implemented.

The final phone authentication implementation must be validated against the installed Better Auth version before release.

6. Protected Business API

The backend must provide authenticated CRUD operations for:

- API projects.
- AI agents.
- Application projects.
- User profiles.

Authorization rules:

- Unauthenticated requests return "401".
- Users can only access their own resources.
- Cross-user access returns "403" or an appropriate non-disclosing response.
- The backend must ignore forged client ownership identifiers.
- Privileged administrative operations require a server-verified role.
- New users must not receive administrative privileges.

Existing Supabase RLS protections must not be removed until equivalent backend authorization has been implemented and verified.

7. Chat IA and Quota Migration

Chat IA requests must be routed through the Render backend.

The backend must:

- Validate the Better Auth session.
- Determine the user identity from the session.
- Select the requested AI provider and model.
- Keep provider API keys server-side.
- Apply shared subscription and quota limits across providers.
- Reserve quota atomically before processing.
- Consume quota only according to the configured usage policy.
- Release reservations after failed requests.
- Use fallback only for eligible transient provider failures.
- Record usage events securely.

The frontend must not directly expose Groq, Gemini, or OpenRouter credentials.

Conversation history persistence is not included unless explicitly approved as a separate feature.

8. Migration Sequence

1. Prepare automated tests and CI checks.
2. Confirm the Neon Preview schema and migration requirements.
3. Create the required business tables in Neon Preview.
4. Implement the identity and data migration.
5. Complete Better Auth signup, login, recovery, sessions, and cookies.
6. Implement protected Render endpoints for business CRUD.
7. Migrate Chat IA and quota enforcement to the backend.
8. Replace Supabase Auth dependencies in the frontend.
9. Remove direct frontend access to protected Supabase tables.
10. Deploy and validate the Preview environment.
11. Perform security and regression testing.
12. Obtain explicit approval before any Production migration.

9. Test Plan

Authentication tests

- Email signup succeeds.
- Email login succeeds.
- Duplicate email signup is rejected.
- Invalid credentials are rejected.
- Password recovery works through email.
- Session persists after page reload.
- Logout invalidates the session.
- Trusted-origin and CORS restrictions work.
- Phone numbers are normalized consistently.
- Duplicate phone usernames are rejected.
- Recovery email is required for phone registration.

Authorization tests

- Requests without a session return "401".
- Users cannot read another user's projects.
- Users cannot modify another user's projects.
- Forged "userId" values are ignored.
- New users receive the "user" role.
- Users cannot promote themselves.
- Only Super Admin can perform privileged operations.
- Sub-admin permissions are limited to explicitly granted capabilities.

Business CRUD tests

- Create, read, update, and delete API projects.
- Create, read, update, and delete AI agents.
- Create, read, update, and delete application projects.
- Verify ownership after every operation.
- Verify unique project identifiers per owner.
- Verify data preservation during migration.

Chat IA tests

- Valid authenticated requests reach the selected provider.
- Invalid or missing sessions are rejected.
- Provider keys are never returned to the frontend.
- Model selection works.
- Fallback is limited to eligible provider failures.
- Quotas are shared across providers.
- Concurrent quota reservations remain consistent.
- Failed requests release quota reservations.
- Usage events are recorded accurately.

Migration tests

- Migration scripts can be safely rerun.
- Source and destination row counts match.
- User identifiers and ownership references remain valid.
- Foreign-key relationships remain valid.
- Existing Super Admin identity and role are preserved.
- Neon Production remains unchanged.
- Supabase remains available for rollback.

Frontend and integration tests

- Vite production build succeeds.
- Signup and login forms work.
- Session state is restored after reload.
- Dashboard access requires authentication.
- Chat IA works with Better Auth.
- Project CRUD works through Render.
- Logout returns the user to the authentication screen.
- Browser flow succeeds from login through project creation and logout.

10. Acceptance Criteria

The migration is accepted only when:

- Better Auth is the sole authentication system.
- The frontend no longer depends on Supabase Auth.
- Protected project data is accessed through authenticated backend endpoints.
- Existing data and ownership are preserved.
- Chat IA uses server-side provider credentials.
- Quota enforcement is secure and consistent.
- Authentication and authorization tests pass.
- The production build succeeds.
- Preview integration tests pass.
- Security review finds no critical authorization or credential exposure issue.
- Production remains untouched until explicit approval.

11. Out of Scope

Unless separately approved:

- Production database migration.
- Production domain or DNS changes.
- Changes to the "main" branch.
- New persistent Chat IA history.
- Automatic subscription upgrades or renewals.
- Enabling platform-wide content moderation.
- Removing Supabase before Preview acceptance.

12. Rollback Strategy

- Keep Supabase available as the original data source during Preview validation.
- Do not delete existing Supabase tables or authentication data during the migration.
- Keep migration scripts and schema changes versioned.
- If Preview validation fails, revert the relevant changes on "Elema-api".
- Do not switch production traffic until the migration has been explicitly approved.

Final constraint: all implementation and testing must remain on "Elema-api" and Neon Preview. The "main" branch and Neon Production must remain untouched.
