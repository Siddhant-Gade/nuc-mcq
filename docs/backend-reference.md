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

`src/server.ts` composes `SupabaseJwtVerifier`, the identity resolver, and each module's service/repository (`Student`, `Batch`, `AuthorizationRequest`, `Dashboard`, `Result`); `src/app.ts` receives those dependencies. This keeps app construction independent of live database initialization for health checks and route tests.

## 4. Actual Project Structure

```text
admin/                         React/Vite admin application (live API for shipped modules; mocks remain for Phase 13 features)
student_app/                   Flutter student client (foundation: login + broadcasts; see its README)
backend/
  src/
    app.ts, server.ts
    config/env.ts
    database/{client.ts,check-connection.ts,schema/,migrations/}
    middleware/{auth,authorization,error,not-found,validation}.middleware.ts
    modules/auth/auth-token-verifier.ts
    modules/students/{controller,repository,routes,schema,service,types}.ts
    modules/batches/{controller,repository,routes,schema,service,types}.ts
    modules/authorization/{controller,repository,routes,schema,service,types}.ts
    modules/dashboard/{controller,repository,routes,service,types}.ts
    modules/student-access/{student-identity.service.ts,student-access.routes.ts}
    modules/results/{controller,repository,routes,schema,service,types}.ts
    modules/broadcasts/{controller,repository,routes,schema,service,types}.ts
    modules/study-materials/{content,controller,repository,routes,schema,service,types}.ts
    modules/notifications/{controller,repository,routes,schema,service,types}.ts
    types/express.d.ts
    utils/{api-error,api-response}.ts
  drizzle.config.ts
  package.json
SYSTEM_DESIGN.md               Product and architecture blueprint
```

## 5. Environment Variables

Backend variable names only:

- `DATABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWT_AUDIENCE`
- `CORS_ORIGINS`
- `PORT`
- `NODE_ENV`

Admin variable names only:

- `VITE_API_BASE_URL` (now `http://localhost:3000/api/v1`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLIC_KEY` (publishable or legacy anon key; public-safe)

## 6. Authentication Design

Implemented endpoints require `Authorization: Bearer <token>`. `SupabaseJwtVerifier` validates the JWT with the issuer JWKS, issuer, and audience, then sets `request.auth` to `{ authUserId, email?, roles }`. Roles are read only from verified `app_metadata.role`; accepted values are `STUDENT`, `TEACHER`, and `ADMIN`.

The client is not accepted as proof of identity. `/auth/me` returns only verified token claims; application identity resolution exists for students (Phase 10): a verified `authUserId` maps to a student profile/access pair exclusively through `student_access.auth_user_id`, which only admin approval writes.

## 7. Authorization Design

`requireRoles(...roles)` returns 403 when the verified role list lacks an allowed role. The Student/Batch/Authorization/Dashboard routers are admin-only. Student-owned routes (`GET /api/v1/student/me`, `POST /api/v1/authorization-requests/mine`, `POST /api/v1/results/sync`) resolve ownership from the verified token via `StudentIdentityService`; result sync additionally requires ACTIVE access (`STUDENT_IDENTITY_NOT_LINKED` / `STUDENT_ACCESS_INACTIVE` codes).

## 8. Database Design

Six generated migrations define the schema. `0000_unknown_the_liberteens.sql`:

| Table | Important columns and constraints |
|---|---|
| `student_profile` | UUID primary key; unique `student_id`; name; optional email/mobile/photo/course info; `institute_id` and `batch_id` are required varchar fields but are not foreign keys |
| `student_access` | UUID primary key; unique FK `student_profile_id` → `student_profile.id` with cascade delete; unique nullable `auth_user_id`; enum status `PENDING`, `ACTIVE`, `EXPIRED`, `REVOKED`; access timestamps |

`0001_plain_nightmare.sql`:

| Table | Important columns and constraints |
|---|---|
| `batch` | varchar(100) `batch_id` natural primary key; `batch_name`; `institute_id`; integer `capacity` with `CHECK (capacity > 0)`; enum status `ACTIVE`, `FULL`, `INACTIVE` defaulting to ACTIVE; timestamps |

`0002_dashing_the_captain.sql`:

| Table | Important columns and constraints |
|---|---|
| `authorization_request` | UUID primary key; FK `student_profile_id` → `student_profile.id` (cascade); nullable `auth_user_id`; `requested_at`; enum status `PENDING`, `APPROVED`, `REJECTED` defaulting to PENDING; nullable `reviewed_at`/`reviewed_by` (reviewed_by stores the admin's auth user id) |

`0003_dark_ultragirl.sql`:

| Table | Important columns and constraints |
|---|---|
| `test_result` | UUID primary key; **UNIQUE** `client_event_id`; FK `student_profile_id` → `student_profile.id` (cascade); not-null `auth_user_id` (syncing user); `test_id`; enum mode `PRACTICE`, `EXAM`; optional version strings; counts with CHECKs (`correct ≤ total`, `wrong ≤ total`, `correct + wrong ≤ total`); non-negative `score` CHECK; jsonb `wrong_question_ids` defaulting to `[]`; server-stamped `completed_at`/`synced_at` |

`0004_nasty_carmella_unuscione.sql`:

| Table | Important columns and constraints |
|---|---|
| `broadcast` | UUID primary key; `title` varchar(200); `message` text; enum status `DRAFT`, `PUBLISHED` defaulting to DRAFT; enum audience `ALL`, `BATCH`; nullable `published_at`; not-null `created_by` (admin auth user id, JWT-derived) |
| `broadcast_target` | Composite PK (`broadcast_id`, `batch_id`); FK `broadcast_id` → `broadcast.id` (cascade); FK `batch_id` → `batch.batch_id` (cascade — confirmed Phase 12 rule) |

`0005_clammy_maverick.sql`:

| Table | Important columns and constraints |
|---|---|
| `notification` | UUID primary key; not-null `recipient_auth_user_id`; `title`; `message`; enum type `announcement`, `study_material`, `system` defaulting to system; nullable `related_route`; `is_read` default false with `read_at`; btree index on (`recipient_auth_user_id`,`created_at`) |

Batch enrollment is never stored; it is aggregated at query time from `student_profile.batch_id`. Effective FULL status is derived in the service (stored INACTIVE wins, else enrollment ≥ capacity). No foreign key exists yet between `student_profile.batch_id` and `batch`. Approval transitions are guarded by a conditional UPDATE on status inside a transaction (no double-review races). Result idempotency is enforced by the database-level `UNIQUE(client_event_id)`; concurrent retries lose the insert race and replay the stored row. Broadcast publishing is one-way via a conditional `UPDATE … WHERE status='DRAFT'` (409 on re-publish, race-free), published rows stay editable, deletion is hard, and student visibility is decided inside PostgreSQL (`PUBLISHED AND (audience='ALL' OR EXISTS(target = caller's batch))`).

No database tables/migrations exist yet for study materials or application admin/teacher profiles.

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
| GET | `/api/v1/batches` | Implemented; ADMIN only; aggregated enrollment + derived status |
| GET | `/api/v1/batches/active` | Implemented; ADMIN only; admission-available batches |
| POST | `/api/v1/batches` | Implemented; ADMIN only; 201 created / 409 duplicate ID |
| DELETE | `/api/v1/batches/:batchId` | Implemented; ADMIN only; 409 while students assigned (V1 default policy) |
| GET | `/api/v1/authorization-requests` | Implemented; ADMIN only; optional `?status=PENDING\|APPROVED\|REJECTED` filter |
| GET | `/api/v1/authorization-requests/pending` | Implemented; ADMIN only |
| GET | `/api/v1/authorization-requests/:id` | Implemented; ADMIN only |
| POST | `/api/v1/authorization-requests/:id/approve` | Implemented; ADMIN only; transactionally activates access + links auth identity; reviewer derived from JWT; 409 on repeat |
| POST | `/api/v1/authorization-requests/:id/reject` | Implemented; ADMIN only; reviewer derived from JWT; 409 on repeat |
| GET | `/api/v1/dashboard/stats` | Implemented; ADMIN only; SQL-aggregated DashboardStats matching the admin UI type |
| GET | `/api/v1/student/me` | Implemented; STUDENT only; identity derived solely from the verified token |
| POST | `/api/v1/authorization-requests/mine` | Implemented; STUDENT only; §17 first-login request creation; 409 when access ACTIVE or a PENDING request exists |
| POST | `/api/v1/results/sync` | Implemented; STUDENT only with ACTIVE access; idempotent offline result ingestion keyed by `UNIQUE(client_event_id)`; explicit 200 acknowledgement (`alreadySynced`) for writes and replays |
| GET/POST/PATCH/DELETE | `/api/v1/broadcasts(/:id)(/:id/publish)` | Implemented; ADMIN only; list/get/create(201)/edit/publish/delete; BATCH audience requires known targets; one-way publish (409 on repeat); hard delete; `created_by` from verified JWT |
| GET | `/api/v1/student/broadcasts` | Implemented; STUDENT only with ACTIVE access; PUBLISHED broadcasts for ALL audience or the caller's batch (SQL-filtered) |
| GET/PATCH/POST | `/api/v1/notifications(/unread-count)(/:id/read)(/read-all)` | Implemented; any authenticated role; strictly own rows via JWT-derived recipient; foreign ids are indistinguishable 404s; mark-all returns `{updatedCount}`; creation triggers deferred to future module hooks |

## 10. Module Status

| Module | Status | Phase | Notes |
|---|---|---:|---|
| Backend foundation | COMPLETE | 1 | Health, structured 404, errors, CORS allowlist, startup/shutdown handling, and app-level tests are in place. |
| Database foundation | COMPLETE | 2 | Supabase PostgreSQL connection, Drizzle migration generation, and initial migration application are verified. |
| API infrastructure | COMPLETE | 3 | Response helpers, `ApiError`, central errors, and tested Zod body/params/query middleware are in place. |
| Authentication | COMPLETE | 4 | Supabase JWT verification, verified `authUserId` request context, and safe `/auth/me` behavior are implemented and tested. |
| Authorization | COMPLETE | 5 | Verified role middleware protects admin routes with 401/403/200 behavior. Resource ownership resolution is intentionally scheduled for Phase 10. |
| Students | COMPLETE | 6 | CRUD/access-status backend stabilized: access timestamps maintained, service + route tests added; batch/institute FKs deferred to Phase 7. |
| Batches | COMPLETE | 7 | Natural-key `batch` table with capacity CHECK; SQL-aggregated enrollment; derived FULL/INACTIVE status; delete blocked while students assigned (documented V1 default); 18 new tests. |
| Authorization requests | COMPLETE | 8 | Blueprint �17 workflow: transactional approve (activates access + links auth identity, conditional status guard) / reject; reviewer from verified JWT; creation endpoint deferred to Phase 10. |
| Dashboard | COMPLETE | 9 | `GET /api/v1/dashboard/stats` � all six KPIs aggregated inside PostgreSQL matching the admin UI type. |


| Student identity resolution | COMPLETE | 10 | `StudentIdentityService` maps verified `authUserId` → profile/access via `student_access.auth_user_id`; student-facing `GET /api/v1/student/me`; unlocked `POST /api/v1/authorization-requests/mine`. |
| Offline result sync | COMPLETE | 11 | `POST /api/v1/results/sync`: insert-first idempotency over `UNIQUE(client_event_id)` (23505 replays the stored row as success); count-consistency validation; identity from verified token via `requireActive`; advisory `clientStudentId` must match or 403. |
| Broadcasts | COMPLETE | 12 | Confirmed rules: ALL/BATCH audiences, admin-only write/edit/publish, published rows editable, one-way publish (409 on repeat), hard delete, cascade targets. Student visibility via `GET /api/v1/student/broadcasts`. Admin UI integration (audience field missing in the UI type) remains Phase 15. |
| Study materials | NOT STARTED | 13 | Design proposed (blueprint §21); awaiting confirmation of five vetoable V1 defaults — bucket name, 25 MB cap, signed download URLs, service-role env vars, unpublishable materials. |
| Notifications | COMPLETE | 14 | User-scoped REST only: list/unread-count/mark-read/mark-all-read keyed by the verified JWT identity; ownership enforced in SQL; no push/real-time. Creation triggers deferred pending event policy. |
| Frontend integration | PARTIALLY COMPLETE | 15 | Admin panel now uses real auth (supabase-js + ADMIN verification via `/auth/me`) and live API calls for students, batches, authorization requests, dashboard, broadcasts, and notifications; normalized envelope/error handling; audience selector added to the broadcast modal. Still mock: study materials (Phase 13), admin creation, CSV import. |
| Testing | COMPLETE | 16 | Middleware/route/service suites across all modules plus live-database adapter tests (`RUN_DB_TESTS=1`) proving constraints, cascades, conditional transitions, and idempotency against real PostgreSQL; surfaced and fixed the drizzle wrapped-error bug affecting unique-violation handling. |
| Final review | NOT STARTED | 17 | — |

## 11. Important Architecture Decisions

- Keep a simple modular monolith with Express, Zod, Drizzle, and PostgreSQL.
- The backend is the trust boundary; do not accept user or student IDs in client input as proof of identity.
- Supabase JWT roles must come from verified `app_metadata`, not `user_metadata`.
- Preserve route → controller → service → repository boundaries for each new module.
- Use database constraints and transactions for uniqueness, state transitions, and idempotency.
- Flutter calculates non-certification V1 scores locally, as documented in `SYSTEM_DESIGN.md`; server-side result ingestion must validate structural consistency.

## 12. Offline Result Sync Design

Implemented (Phase 11):

```text
Completed test → Flutter saves locally in Drift/SQLite with sync_status=PENDING
→ POST /api/v1/results/sync → JWT authentication → STUDENT role check
→ StudentIdentityService.requireActive (server-derived identity + ACTIVE access)
→ Zod structural validation (counts non-negative and consistent; wrong_question_ids length == wrong_count)
→ insert into test_result → UNIQUE(client_event_id) is the final guarantee
→ on unique violation: replay the stored row as a successful acknowledgement (alreadySynced=true)
→ Flutter marks local record SYNCED
```

The advisory body field `clientStudentId`, if present, must equal the token-resolved `studentId` or the sync fails 403 `IDENTITY_MISMATCH`. Scores are stored verbatim per the confirmed client-scoring trust boundary (§12.5 of `SYSTEM_DESIGN.md`) and never recomputed. Result retention policy remains an open product decision.

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
| 2026-08-26 | Phase 7 — Batch Module | Generated and applied migration `0001_plain_nightmare` (`batch_status` enum; `batch` table with natural PK `batch_id`, capacity CHECK). Implemented the batches module (repository with SQL-aggregated enrollment, service deriving FULL/INACTIVE status, controller/routes) wired through DI. Deletion blocked with 409 while students are assigned — documented V1 default policy pending confirmation. Added 18 tests including proof that UI payload extras (`enrolledCount`, `status`) are stripped server-side. | `db:migrate` applied; `db:generate` reports no drift; typecheck/lint/build passed; 54/54 tests passed. |
| 2026-08-26 | Phase 8 — Authorization Requests | Applied migration `0002_dashing_the_captain` (`authorization_request` per blueprint §17). Implemented the module with transactional approval (conditional status guard, activates access + links auth identity) and rejection; reviewer identity taken only from the verified JWT — route test proves a body-supplied `reviewedBy` is ignored. Creation endpoint deferred to Phase 10. | `db:migrate` applied; typecheck/lint/build passed. |
| 2026-08-26 | Phase 9 — Admin Dashboard | Implemented `modules/dashboard` with all six KPIs computed inside PostgreSQL (filtered counts + grouped batch-enrollment subquery), returning exactly the admin UI's `DashboardStats`. ADMIN-only route with tests asserting exact shape and role enforcement. | Typecheck/lint/build passed; 70/70 total backend tests passed. |
| 2026-08-26 | Phase 10 — Student Identity Resolution | Added `findByAuthUserId` to the student repository; created `StudentIdentityService` (`resolve`/`requireActive` with distinct 403 codes); added student-facing `GET /api/v1/student/me` and unlocked `POST /api/v1/authorization-requests/mine`. Client-supplied identifiers are never accepted as identity proof. | Typecheck/lint/build passed; 76/76 tests including unmapped/pending/revoked identity cases. |
| 2026-08-26 | Phase 11 — Offline Result Sync | Generated/applied migration `0003_dark_ultragirl` (`test_result` with `UNIQUE(client_event_id)`, count/score CHECKs, cascade FK). Implemented the results module with insert-first idempotency (unique violation replays the stored row as an acknowledgement), Zod count-consistency validation, token-derived identity requiring ACTIVE access, and advisory-`clientStudentId` mismatch rejection. Wired DI in `app.ts`/`server.ts`; added service + route tests covering first write, duplicate retry, lost-race replay, auth, role, identity mismatch, inactive access, and invalid counts. | `db:migrate` applied; `db:generate` reports no drift; typecheck/lint/build passed; 89/89 total backend tests passed. |
| 2026-08-26 | Flutter foundation (pre-Phase 12) | Scaffolded `student_app/` per blueprint stack (Cubit/Dio/supabase_flutter): dart-define configuration with in-app validation screen, Bearer-token Dio client with envelope/error mapping, Supabase login verified against `/auth/me` with STUDENT-role gating, broadcasts list wired to the Phase 12 student contract, home shell with sign-out; dev README with run commands and test-data seeding. | `flutter test` 12/12 passed; `flutter analyze` clean. Live login requires supplied Supabase credentials and an approved student account (README). |
| 2026-08-26 | Phase 12 — Broadcast Module | Generated/applied migration `0004_nasty_carmella_unuscione` (`broadcast`, `broadcast_target`, both enums, cascade FKs). Implemented admin CRUD/publish (JWT-derived `created_by`; BATCH audience validated against real batches; transactional target replacement; one-way status-guarded publish with 409 on repeat; hard delete) plus `GET /api/v1/student/broadcasts` with SQL-decided ALL/own-batch visibility requiring ACTIVE access. Service + route tests cover roles, creator stamping, audience rules, edit-after-publish, publish conflicts, deletion, and visibility filtering. | `db:migrate` applied; `db:generate` reports no drift; typecheck/lint/build passed; 108/108 total backend tests passed. |
| 2026-08-26 | Phase 14 — Notification Module | Generated/applied migration `0005_clammy_maverick` (`notification` + type enum, recipient index). Implemented user-scoped list/unread-count/mark-one/mark-all with ownership enforced inside the UPDATE (`WHERE id AND recipient`), indistinguishable 404s for foreign ids, `read_at` stamping, and any-role access to own rows only; internal `create()` reserved for future hooks. Documented V1 defaults: JWT-derived recipients, REST-only (no push/real-time), UI-matching enum values. | `db:migrate` applied; `db:generate` reports no drift; typecheck/lint/build passed; 118/118 total backend tests passed. |
| 2026-08-26 | Phase 15 — Frontend Integration (partial) | Admin base URL moved to port 3000; added Supabase env keys and `@supabase/supabase-js`. Built the auth foundation (session restore, ADMIN verification via `/auth/me`, Bearer interceptor, envelope unwrapping into a normalized `ApiError`, 401 auto-signout, route guard via `AuthContext`) and replaced six service modules with live API calls: students, batches, authorization requests, dashboard, broadcasts (audience selector added to the form modal), notifications. Mutation/list error banners added across seven pages. Study materials/admin-creation/import remain mock pending their backends. | `npm run build` (tsc + vite) passed; `npm run lint` passes with only pre-existing-style warnings. Live browser checks require running backend + Supabase credentials with an ADMIN user. |
| 2026-08-26 | Phase 16 — Testing | Added live-database adapter tests (`database-adapter.test.ts`, opt-in via `RUN_DB_TESTS=1`, self-cleaning fixtures) covering real Drizzle repositories: student transitions + unique collisions, result idempotency against `UNIQUE(client_event_id)` + cascade delete, broadcast one-way publish/target/cascade behavior, notification ownership guards, transactional authorization approval. Running them exposed that drizzle-orm wraps driver errors (`DrizzleQueryError.cause`), so no service ever matched real unique violations; fixed via shared `utils/db-errors.ts` used by student/batch/result services, with a wrapped-violation replay regression test. | Default suite 119 pass / 5 opt-in skips / 0 fail; with `RUN_DB_TESTS=1` vs live Supabase 124/124 pass; typecheck/lint/build passed. |

## 14. Known Limitations

- Current `student_profile.institute_id` and `batch_id` do not enforce referential integrity. The `batch` table now exists, but the foreign key remains intentionally deferred until existing student rows are reconciled with real batch records (Phase 15 integration).
- Batch FULL/INACTIVE semantics and the delete-blocked-while-assigned rule are documented V1 defaults derived from UI behavior; they await explicit product confirmation and are trivially adjustable in `batch.service.ts`.
- Admin mock services remain for study materials (Phase 13 pending), admin creation, and CSV import admissions; all other admin services call the live API.
- Admin admission UI hardcodes `instituteId: 'INST001'` (single-institute V1); no institute picker exists.
- Student pagination/filtering is not implemented; the admin list UI paginates client-side, which is acceptable at demonstration scale.
- The only verified role source is JWT metadata, but the repository has no implementation for assigning or managing that metadata.
- Application-profile lookup and student resource ownership resolution are intentionally deferred to the confirmed Phase 10 identity-resolution scope; `/auth/me` currently returns only safe verified JWT identity data.
- Admin mock services remain for study materials (Phase 13 pending), admin creation, and CSV import admissions; all other admin services call the live API.
- No pagination, filtering, or file upload endpoint is implemented for students.

## 15. NOT DECIDED Product Decisions

- Institute table/identity policy for a single-institute deployment.
- Batch capacity, full-batch behavior, enrollment/assignment policy, and batch deletion rules.
- Student admission fields and photo-upload/storage policy beyond the current UI fields.
- How a student first proves eligibility and requests authorization; exact request payload and device re-authorization rules.
- Who may create admins and how Supabase users/app_metadata roles are provisioned safely.
- Result-sync retention policy (the payload contract, active-access requirement, and idempotency design are implemented per Phase 11).
- Broadcast audience model (all students vs. batches), editing/publishing rules, and deletion behavior after publication.
- Study-material storage bucket, allowed file types/sizes, audience rules, and signed-download policy.
- Notification recipients, persistence requirements, and whether push delivery is required for V1.
