# Backend Reference

## 1. Project Purpose

MSCIT Typing & Skill Assessment Platform is a single-institute V1 system. The current repository contains a React + TypeScript admin panel and a Node.js API intended to support students, batches, authorization, offline result synchronization, broadcasts, study materials, and notifications. The Flutter student client described in `SYSTEM_DESIGN.md` is not present in this repository.

## 2. Technology Stack

| Area | Actual implementation |
|---|---|
| Backend | Node.js, TypeScript, Express 5 |
| Database | PostgreSQL through a configured Supabase connection string |
| ORM | Drizzle ORM with `pg` |
| Validation | Zod 4 |
| Authentication | Supabase JWT verification using `jose` and remote JWKS |
| Admin client | React 19, TypeScript, Vite, Axios |
| Architecture | Intended modular monolith; only the Student module currently follows it |

## 3. Architecture

The implemented request path is:

```text
Express route → authentication/role/validation middleware → controller → service → repository → Drizzle → PostgreSQL
```

- Routes attach middleware and map endpoints.
- Middleware extracts and verifies Bearer tokens, checks roles, validates input, and handles 404/errors.
- Controllers read validated data from `response.locals.validated` and produce HTTP responses.
- Services own student business rules and translate known persistence errors.
- Repositories execute Drizzle queries and transactions.

`src/server.ts` composes `SupabaseJwtVerifier`, `StudentService`, and `DrizzleStudentRepository`; `src/app.ts` receives those dependencies. This keeps app construction independent of live database initialization for health checks and route tests.

## 4. Actual Project Structure

```text
admin/                         React/Vite admin application (mock services)
backend/
  src/
    app.ts, server.ts
    config/env.ts
    database/{client.ts,check-connection.ts,schema/,migrations/}
    middleware/{auth,authorization,error,not-found,validation}.middleware.ts
    modules/auth/auth-token-verifier.ts
    modules/students/{controller,repository,routes,schema,service,types}.ts
    types/express.d.ts
    utils/{api-error,api-response}.ts
  drizzle.config.ts
  package.json
SYSTEM_DESIGN.md               Product and architecture blueprint
```

No backend modules currently exist for batches, authorization requests, dashboard, results/sync, broadcasts, study materials, or notifications.

## 5. Environment Variables

Backend variable names only:

- `DATABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWT_AUDIENCE`
- `CORS_ORIGINS`
- `PORT`
- `NODE_ENV`

Admin variable names only:

- `VITE_API_BASE_URL`

## 6. Authentication Design

Implemented endpoints require `Authorization: Bearer <token>`. `SupabaseJwtVerifier` validates the JWT with the issuer JWKS, issuer, and audience, then sets `request.auth` to `{ authUserId, email?, roles }`. Roles are read only from verified `app_metadata.role`; accepted values are `STUDENT`, `TEACHER`, and `ADMIN`.

The client is not accepted as proof of identity. However, application identity resolution is incomplete: `/api/v1/auth/me` returns only verified token claims and no server-side lookup is yet possible for admins, teachers, or student profiles.

## 7. Authorization Design

`requireRoles(...roles)` returns 403 when the verified role list lacks an allowed role. The Student router is admin-only. `/api/v1/admin/access-check` is admin-only.

Resource ownership checks and student identity resolution are not implemented. There is no admin/teacher application profile model or server-controlled role-assignment workflow in this repository.

## 8. Database Design

One generated migration (`0000_unknown_the_liberteens.sql`) defines:

| Table | Important columns and constraints |
|---|---|
| `student_profile` | UUID primary key; unique `student_id`; name; optional email/mobile/photo/course info; `institute_id` and `batch_id` are required varchar fields but are not foreign keys |
| `student_access` | UUID primary key; unique FK `student_profile_id` → `student_profile.id` with cascade delete; unique nullable `auth_user_id`; enum status `PENDING`, `ACTIVE`, `EXPIRED`, `REVOKED`; access timestamps |

No database tables/migrations exist for institutes, batches, authorization requests, results, broadcasts, study materials, notifications, or application admin/teacher profiles.

## 9. API Conventions

- Versioned base path: `/api/v1`.
- Success helper: `{ "success": true, "data": ... }`.
- Error helper: `{ "success": false, "error": { "code", "message" } }`.
- Validation, authentication, authorization, not-found, conflict, business-rule, and internal-error codes are defined.
- `GET /health` returns `{ "success": true, "data": { "status": "healthy" } }`.
- Browser origins are allowlisted by the comma-separated `CORS_ORIGINS` environment variable. Its local-development default is `http://localhost:5173`.

Current routes:

| Method | Path | Status |
|---|---|---|
| GET | `/health` | Implemented and tested |
| GET | `/api/v1/auth/me` | Implemented; verified JWT claims only |
| GET | `/api/v1/admin/access-check` | Implemented; ADMIN only |
| GET/POST | `/api/v1/students` | Implemented; ADMIN only |
| GET/PATCH | `/api/v1/students/:id` | Implemented; ADMIN only |
| GET | `/api/v1/students/:id/access` | Implemented; ADMIN only |
| PATCH | `/api/v1/students/:id/access-status` | Implemented; ADMIN only |

## 10. Module Status

| Module | Status | Phase | Notes |
|---|---|---:|---|
| Backend foundation | COMPLETE | 1 | Health, structured 404, errors, CORS allowlist, startup/shutdown handling, and app-level tests are in place. |
| Database foundation | COMPLETE | 2 | Supabase PostgreSQL connection, Drizzle migration generation, and initial migration application are verified. |
| API infrastructure | COMPLETE | 3 | Response helpers, `ApiError`, central errors, and tested Zod body/params/query middleware are in place. |
| Authentication | COMPLETE | 4 | Supabase JWT verification, verified `authUserId` request context, and safe `/auth/me` behavior are implemented and tested. |
| Authorization | COMPLETE | 5 | Verified role middleware protects admin routes with 401/403/200 behavior. Resource ownership resolution is intentionally scheduled for Phase 10. |
| Students | COMPLETE | 6 | CRUD/access-status backend stabilized: access timestamps maintained, service + route tests added; batch/institute FKs deferred to Phase 7. |
| Batches | NOT STARTED | 7 | Admin UI is mock-only. |
| Authorization requests | NOT STARTED | 8 | Admin UI is mock-only. |
| Dashboard | NOT STARTED | 9 | Admin UI calculates mock data. |
| Student identity resolution | NOT STARTED | 10 | `student_access.auth_user_id` exists but is unused. |
| Offline result sync | NOT STARTED | 11 | No Flutter source, result table, or endpoint. |
| Broadcasts | NOT STARTED | 12 | Admin UI is mock-only. |
| Study materials | NOT STARTED | 13 | Admin UI is mock-only; storage integration absent. |
| Notifications | NOT STARTED | 14 | Admin UI is mock-only. |
| Frontend integration | NOT STARTED | 15 | Axios client exists but business services do not call it. |
| Testing | PARTIALLY COMPLETE | 16 | Middleware tests exist; no API/module/database integration tests. |
| Final review | NOT STARTED | 17 | — |

## 11. Important Architecture Decisions

- Keep a simple modular monolith with Express, Zod, Drizzle, and PostgreSQL.
- The backend is the trust boundary; do not accept user or student IDs in client input as proof of identity.
- Supabase JWT roles must come from verified `app_metadata`, not `user_metadata`.
- Preserve route → controller → service → repository boundaries for each new module.
- Use database constraints and transactions for uniqueness, state transitions, and idempotency.
- Flutter calculates non-certification V1 scores locally, as documented in `SYSTEM_DESIGN.md`; server-side result ingestion must validate structural consistency.

## 12. Offline Result Sync Design

Confirmed target flow (not implemented):

```text
Completed test → Flutter saves locally in Drift/SQLite with sync_status=PENDING
→ POST /api/v1/results/sync → JWT authentication → student identity resolution
→ structural validation → idempotency check → PostgreSQL → explicit acknowledgement
→ Flutter marks local record SYNCED
```

The eventual `test_result` schema must include `client_event_id` with a database-level `UNIQUE(client_event_id)` constraint. Repeated submissions with the same ID must return a successful, non-duplicating acknowledgement. No Flutter code or payload contract is present to implement this safely yet.

## 13. Completed Phases

| Date | Phase | Implemented work | Validation |
|---|---:|---|---|
| Before 2026-08-25 | 1–6 (partial) | Backend foundation, Drizzle setup, auth/role middleware, Student module, first migration, middleware tests. | Source inspection only at this audit point; live database status unknown. |
| 2026-08-25 | Audit and planning | Created this reference and `docs/backend-plan.md` from repository evidence. No application code changed. | Backend lint passed; six existing middleware tests passed. Backend typecheck failed on four unused controller parameters. Admin production build passed outside the sandbox (with a 547 kB chunk-size warning). Live database verification was not run because it requires configured project credentials. |
| 2026-08-25 | Phase 1 — Backend Foundation | Aligned `/health`; moved dependency composition to `server.ts`; added CORS allowlist middleware, signal shutdown handling, startup error reporting, and app-route tests; resolved the four typecheck-blocking unused parameters. | `npm run typecheck`, `npm run lint`, and `npm run build` passed. `npm test` passed: 9/9 tests. No database changes. |
| 2026-08-25 | Phase 2 — Database Foundation (blocked) | Inspected Drizzle configuration, database client, migration journal, migration SQL, and environment template. Verified migration generation reports no schema changes. | `npm run db:generate` passed. `npm run db:check` correctly failed before connection because `backend/.env` is absent and required `DATABASE_URL`/`SUPABASE_JWT_ISSUER` values are unavailable. No database changes. |
| 2026-08-25 | Phase 2 — Environment prerequisite verification | Confirmed `backend/.env.example` names, local `backend/.env` presence, Git ignore and non-tracking status, and successful backend environment-module loading. | `DATABASE_URL` and `SUPABASE_JWT_ISSUER` passed the loader’s format/required-variable validation. No values were printed or recorded. No database connectivity, migration, or schema operation was run. |
| 2026-08-25 | Phase 2 — Connectivity verification (blocked) | Re-reviewed the single generated migration and ran the configured read-only connection check. | PostgreSQL rejected the credentials in `DATABASE_URL` with an authentication error. The migration was not run and the database was not modified. |
| 2026-08-26 | Phase 2 — Database Foundation | Verified Supabase PostgreSQL connectivity and applied the reviewed initial Drizzle migration. | `db:check` passed before and after migration; `db:migrate` applied `0000_unknown_the_liberteens`; `db:generate` reported no drift; typecheck, lint, and production build passed. |
| 2026-08-26 | Phase 3 — API Infrastructure | Verified API response/error conventions and added tests proving validated query and parameter values reach controllers. Scoped the lint command to `src` so a user-created root database helper is preserved but does not participate in source linting. | Typecheck, lint, build, and tests passed. |
| 2026-08-26 | Phase 4 — Authentication | Verified Bearer-token middleware and added `/api/v1/auth/me` tests for missing-token rejection and verifier-derived identity response. | Typecheck, lint, build, and all 12 backend tests passed. No database changes. |
| 2026-08-26 | Phase 5 — Authorization | Verified role-based authorization on the real admin route for unauthenticated, wrong-role, and ADMIN requests. | Typecheck, lint, build, and all 13 backend tests passed. No database changes. |
| 2026-08-26 | Phase 6 — Student Module | Fixed access-transition timestamps in `DrizzleStudentRepository.updateAccessStatus` (ACTIVE sets `accessGrantedAt`, REVOKED sets `revokedAt`, EXPIRED touches neither). Confirmed `instituteId` stays strictly required on create. Added `student.service.test.ts` (in-memory fake repository: CRUD, duplicate-ID conflict, transitions, timestamp assertions) and `student.routes.test.ts` (401/403, validation errors, success shapes via stubbed service over real HTTP fixture). | Typecheck, lint, and build passed; all 36 backend tests passed. No database changes. |

## 14. Known Limitations

- Current `student_profile.institute_id` and `batch_id` do not enforce referential integrity; this is intentional until the Phase 7 batch schema is confirmed.
- The React admission UI (`admin/src/pages/StudentAdmission.tsx`) does not yet send the required `instituteId` field; it must be added before Phase 15 frontend integration.
- Student pagination/filtering is not implemented; the admin list UI paginates client-side, which is acceptable at demonstration scale.
- The only verified role source is JWT metadata, but the repository has no implementation for assigning or managing that metadata.
- Application-profile lookup and student resource ownership resolution are intentionally deferred to the confirmed Phase 10 identity-resolution scope; `/auth/me` currently returns only safe verified JWT identity data.
- Admin mock services use mock arrays; Axios is unused for module data.
- Admin default API port (8080) still does not match backend default port (3000); this belongs to frontend integration because the frontend remains mock-driven.
- No pagination, filtering, or file upload endpoint is implemented for students.

## 15. NOT DECIDED Product Decisions

- Institute table/identity policy for a single-institute deployment.
- Batch capacity, full-batch behavior, enrollment/assignment policy, and batch deletion rules.
- Student admission fields and photo-upload/storage policy beyond the current UI fields.
- How a student first proves eligibility and requests authorization; exact request payload and device re-authorization rules.
- Who may create admins and how Supabase users/app_metadata roles are provisioned safely.
- Result-sync payload contract, retention policy, and whether active student access is required at sync time.
- Broadcast audience model (all students vs. batches), editing/publishing rules, and deletion behavior after publication.
- Study-material storage bucket, allowed file types/sizes, audience rules, and signed-download policy.
- Notification recipients, persistence requirements, and whether push delivery is required for V1.
