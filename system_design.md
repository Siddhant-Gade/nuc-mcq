# SYSTEM DESIGN — MSCIT Skill Assessment Platform (V1)

**Purpose of this document:** This is the implementation blueprint for the finalized V1 architecture. It is written to be followed step by step, module by module, in the order listed in Section 33. Every module has explicit boundaries, responsibilities, and dependencies so the system stays loosely coupled and highly cohesive as it grows. Read Sections 1–5 once for principles, then use Section 33 as the working checklist during actual build.

**Scope discipline for V1:** simple, reliable, offline-capable where it matters, low-cost, maintainable, and scalable enough — in that priority order. This is a **single-institute, solo-developer-maintainable modular monolith**, not a theoretical maximum-complexity architecture. Features are not added because they are technically interesting; they are added because a client requirement or an explicit architectural need demands them.

---

## 1. System Context

```
┌──────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Student      │     │  Admin        │     │  Teacher            │
│  App          │     │  Web App      │     │  Web App            │
│  (Flutter:    │     │  (React)      │     │  (React)            │
│   Android +   │     │               │     │                     │
│   Windows)    │     │               │     │                     │
└──────┬───────┘     └──────┬───────┘     └──────────┬──────────┘
       │  REST/HTTPS         │  REST/HTTPS             │  REST/HTTPS
       │  (sync/API only)    │                         │
       └──────────┬──────────┴──────────────┬──────────┘
                   ▼                         ▼
         ┌──────────────────────────────────────────┐
         │       NODE.JS + EXPRESS API                │
         │  Authorization, business rules, admin/    │
         │  teacher APIs, result sync, announcements, │
         │  study materials, validation, idempotency  │
         │  Auth middleware validates Supabase JWTs  │
         └──────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼               ▼             ▼
        Supabase Auth   Supabase        Supabase Storage
        (identity,      PostgreSQL      (private: student
         sessions,      (structured,     photos, study
         JWT)           dynamic data)    materials, temporary
                                          XLSX exports)
```

The Student app provides **offline-capable test execution with local-first completed-result persistence** (Flutter, Android + Windows) — it is **not** a fully offline-first application (Section 5 defines the exact boundary). The question bank is bundled with the app and test-taking is fully local; the network is used for login/authorization, result synchronization, announcements, study materials, and other centralized server data. The Admin and Teacher web apps (React) are online-only by nature (office/institute use) and do not need offline design.

This is a **single-institute V1 deployment**. The system is not a multi-tenant SaaS platform and must not claim to be one anywhere in this document, in code, or in future planning, unless multi-institute isolation is actually designed and implemented later (Section 23).

---

## 2. Design Principles (applied throughout, not optional)

### Loose coupling / high cohesion — how it's enforced, not just stated
- **Package-by-feature, not package-by-layer.** Each module (`auth`, `student`, `batch`, `content`, `result`, `sync`, etc.) is a TypeScript folder containing routes, controller, service, repository, Zod schema, and types as needed. Nothing outside a module accesses another module's repository directly.
- **Modules talk to each other through a deliberately small public service surface.** If `sync` needs student data, it calls the student module's exported service function, never `StudentRepository`.
- **One facade service per module.** External callers (controllers, other modules) call exactly one entry-point service class per module.
- **Side effects go through events, not direct facade calls, when the caller shouldn't need to know who's listening.** E.g. `admin` triggers approval, but doesn't hold a compile-time dependency on `NotificationService` — it publishes a domain event; `notification` listens and reacts.
- **No circular module dependencies.** Section 6 lists modules in dependency order — build in that order and this stays true automatically.

### SOLID, applied concretely
- **Single Responsibility:** a service class does one module's business logic — `SyncService` never validates student eligibility itself, it calls `StudentAccessService.isActive(studentId)`.
- **Open/Closed:** exam generation logic sits behind a `TestGenerator` abstraction (Section 12) so Practice and Exam modes are configuration, not duplicated code paths.
- **Liskov Substitution:** any `NotificationSender` implementation (FCM now, email later) must be swappable without callers knowing which one is active.
- **Interface Segregation:** don't create one giant `StudentService` interface with 30 methods if only a few are used cross-module.
- **Dependency discipline:** routes/controllers call services and services call repositories; dependencies are composed once in the application bootstrap, not constructed ad hoc in request handlers.

### Domain model discipline
Avoid scattered business rules. Where genuine rules exist (e.g., "student access can only transition PENDING → ACTIVE → EXPIRED/REVOKED"), put them in a focused domain/service function, never across controllers or routes.

### Anti-over-engineering discipline (explicit, not implied)
Before adding any new technology, table, or abstraction, ask: *does a real, current requirement need this, or does it just seem theoretically useful?* Section 24 lists concrete things this project deliberately does not build in V1. When in doubt, prefer the simpler option and revisit later if real usage proves it insufficient.

---

## 3. Layering Within Each Backend Module

```
Route        ── endpoint definition and middleware attachment only
    │
Middleware   ── authentication, authorization, request context, validation, error boundary
    │
Controller   ── HTTP concerns only (request/response, status codes, validated input)
    │
Service      ── business logic, orchestration, transaction boundaries
    │
Repository   ── Drizzle queries and persistence; no HTTP concerns
```

Zod schemas validate request DTOs before controller business calls; database rows never become an implicit public API contract.

---

## 4. Flutter Student App — Layering

```
Flutter UI (widgets, screens)
        ↓
Cubit (transient application state)
        ↓
Repository
        ↓
   ┌─────────────┴─────────────┐
   ▼                           ▼
Local Data Source          Remote Data Source
(SQLite/Drift)              (Node.js + Express REST client, via Sync Service)
```

The UI never talks to SQLite or the REST client directly, and it never contains synchronization logic.

**Cubit** (`flutter_bloc`) owns only transient, disposable application state: current screen state, current test answers during execution, current question, timer state, loading state, error state, general UI state, theme state, and sync indicators. Cubit state must be safe to lose after application termination, restart, navigation, or widget disposal — see Section 5.3 for why this is a confirmed policy, not an implementation shortcut.

**Drift / SQLite** owns durable local data: completed test results, pending-synchronization records, `sync_status`, `client_event_id`, the local question bank, the local exam blueprint, and any other explicitly durable data.

The **Repository** is the boundary between the UI/Cubit layer and durable/network data. It is the only layer that decides whether to read/write locally, call the remote API, or both — this is what makes the offline-capable rule in Section 5 enforceable rather than something each screen has to remember to do correctly. UI and Cubit layers must never directly coordinate database synchronization logic; that responsibility belongs to the Repository and the Sync Service (Section 13).

---

## 5. Offline-Capable Test Execution & Local-First Result Persistence (fundamental rule)

The Flutter Student application is **not** a fully offline-first application. Offline capability is scoped specifically to **test execution** and **completed-result safety** — not to the entire app.

### 5.1 Online / Offline Boundary

**Works without network connectivity:**
- Local question bank access
- Local exam blueprint access
- Test generation
- Test execution
- Answer evaluation
- Score calculation (client-calculated — Section 12.5)
- Completed test result persistence (local, durable)

**May require connectivity:**
- Login / initial authorization
- Authorization refresh/revocation updates
- Result synchronization
- Announcements (Section 20)
- Study materials (Section 21)
- Other centralized server data

Bundled question banks and exam blueprints exist as **requirement-driven local content** — they exist because a student must be able to take a test with zero connectivity. They are not evidence of, or a requirement for, a universal "everything works offline" design goal; they support one specific offline-capable feature (test execution), not the whole application.

### 5.2 Core Offline Reliability Invariant

> **Network availability must never determine whether a completed test result is saved.**

This is the actual load-bearing reliability mechanism, and it rests on exactly these pieces:
1. Local test execution
2. Local durable completed-result storage, before synchronization
3. Pending synchronization state (`sync_status`)
4. Safe retries
5. Idempotent server handling (Section 14)

Every completed test follows the exact same flow, online or offline:

```
Student completes test
        ↓
Flutter calculates the result locally
        ↓
Generate a stable client_event_id
        ↓
Create a compact TestResult
        ↓
ALWAYS save the result to Drift/SQLite FIRST
        ↓
sync_status = PENDING
        ↓
Immediately show the result to the student
        ↓
Synchronize later when a trigger occurs (Section 13)
```

**Explicitly rejected pattern:**

```
Internet available?
     ↓
YES → Save remotely
NO  → Save locally
```

This branching-by-connectivity pattern is never used anywhere a test result is involved. The local database is the **immediate source of truth** for the student; the server is the durable, cross-device system of record that catches up asynchronously.

### 5.3 In-Progress vs. Completed Test State (Confirmed V1 Policy — Interrupted Tests Are Abandoned)

**Confirmed V1 decision: Option B — interrupted tests are abandoned.**

If the application crashes, is force-closed, is killed by the operating system, is restarted, or the device restarts before a test completes, the unfinished test is considered abandoned. V1 does **not** support resuming an interrupted test.

Therefore V1 does **not** require durable persistence of:
- current answers
- current question position
- timer state
- partial score
- in-progress test session

This gives a clear, hard split between two kinds of state:

| | State type | Owned by | Durability |
|---|---|---|---|
| **IN-PROGRESS TEST** | Transient application state | Cubit | May be lost when the application terminates — this is acceptable and expected |
| **COMPLETED TEST** | Durable local record | Drift/SQLite (Repository) | Saved before network synchronization; retained until server synchronization succeeds (Section 13.2) |

This policy directly simplifies the Cubit/Drift boundary in Section 4: nothing about an in-progress test needs to survive a crash, so Cubit can safely treat all test-execution state as disposable.

---

## 6. Module Map (build order = dependency order, see Section 33)

| Module | Owns | Depends on |
|---|---|---|
| `auth` | Supabase JWT validation, role resolution | — (foundation) |
| `institute` | single institute record (organizational metadata only — see Section 23) | `auth` |
| `batch` | batches, capacity | `institute` |
| `student` | student_profile (admission data), photo processing | `institute`, `batch`, `auth` |
| `studentaccess` | student_access (entitlement/status), authorization_request | `student`, `auth` |
| `content` | question-bank/blueprint authoring, CSV/XLSX import, packaging for app release builds, `question_content` teacher-lookup store (Section 19.1) | `institute` |
| `result` | compact test_result records | `student` |
| `sync` | idempotent ingestion of offline test results; server-derived identity resolution and payload validation at sync time (Section 13.4) | `result`, `studentaccess`, `auth` |
| `progress` | derived progress/analytics reads (from `result`) | `result` |
| `teacherportal` | batch/student search, result review, single-question content lookup (read-heavy) | `result`, `student`, `batch`, `content` |
| `admin` | admission orchestration, authorization approval, batch admin actions | `student`, `studentaccess`, `batch` |
| `announcement` | announcement lifecycle and publishing, simple audience selection (all students, or an existing batch) | `institute`, `batch`, `auth` |
| `study_material` | study-material metadata, publication state, controlled Supabase Storage access | `institute`, `auth` |
| `notification` | FCM dispatch | triggered via events only (no compile-time dependency) |
| `export` | completed-course XLSX generation, retention/purge lifecycle | `student`, `result`, `progress` |

`admin → notification`, `export → notification`, `announcement → notification`, and `study_material → notification` use a small in-process event/handler boundary, never direct module-to-repository access, for the same reason described in Section 2. A message broker is not required for V1.

**"Storage integration" is not a separate module.** Controlled Supabase Storage access is a shared internal utility used by any module that needs it — `student` (photos, Section 16), `export` (XLSX, Section 25), and `study_material` (documents, Section 21) — consistent with the existing pattern rather than introducing a new module purely to hold a storage client.

**Explicitly not modules in V1:** `device`, `typing`, `doubt`/chat, `teacherprofile`, `questionbank-download-authorization` (see Section 24 for the full list).

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Student app | Flutter (Android + Windows) |
| Student app state management | Cubit (`flutter_bloc`) — transient/UI state only (Section 4) |
| Student app local persistence | Drift / SQLite — durable data only (Section 4) |
| Admin app | React |
| Teacher app | React |
| Backend runtime | Node.js |
| Backend language | TypeScript |
| HTTP framework | Express |
| Request validation | Zod |
| Database access | Drizzle ORM + PostgreSQL driver |
| Authentication | Supabase Auth |
| Primary database | Supabase PostgreSQL |
| File storage | Supabase Storage (private buckets only) |
| Student offline storage | SQLite / Drift — bundled question bank + local results + sync queue |
| Notifications | FCM (push), independent of database storage |

**Database-access choice — Drizzle ORM:** Drizzle is selected over Prisma because its typed SQL-like API, SQL migration files, and small runtime surface are easier to debug and keep close to PostgreSQL for a solo developer. It gives TypeScript type safety without adding a second query abstraction or generated-client workflow. The backend's repository layer keeps Supabase-specific details out of services so PostgreSQL could later move to another managed provider without touching business logic — an architectural precaution, not a V1 deliverable.

**Do not introduce:** Prisma or another ORM alongside Drizzle, MongoDB, Firebase/Firestore as a primary database, a second PostgreSQL provider, encryption/DRM infrastructure for the question bank or study materials, microservices, Redis, Docker/Kubernetes requirements, or message queues (Kafka etc.) for V1.

---

### 7.1 Recommended Node.js backend structure

```
backend/src/
  app.ts                         # Express app and module registration
  server.ts                      # process startup/shutdown
  config/env.ts                  # validated environment configuration
  middleware/
    auth.middleware.ts
    authorization.middleware.ts
    validate.middleware.ts
    error.middleware.ts
  modules/
    auth/
    institute/
    batch/
    student/
    studentaccess/
    content/
    result/
    sync/
    progress/
    teacherportal/
    admin/
    announcement/
    study-material/
    notification/
    export/
      <module>.routes.ts
      <module>.controller.ts
      <module>.service.ts
      <module>.repository.ts
      <module>.schema.ts          # Zod input schemas where applicable
      <module>.types.ts           # only where shared types add clarity
  database/
    client.ts
    schema/
    migrations/
  utils/
    api-error.ts
    api-response.ts
```

This is a recommended convention, not a requirement to create empty files. A module adds only the pieces it needs, while keeping the route → middleware → controller → service → repository boundary intact.

## 8. Supabase & Local Data Classification

**Supabase Auth** — identity only: students, teachers, admins (authentication, sessions, JWT).

**Supabase PostgreSQL** — structured, dynamic application data:
- `student_profile`, `student_access`, `batch`, `authorization_request`
- `test_result` (compact — Section 11)
- `announcement` (Section 20)
- `study_material` — metadata only, never the file itself (Section 21)
- `question_content` — a narrow, read-only per-question lookup store for the Teacher Portal only (Section 19.1); not a bulk-distributable copy of the question bank
- required audit/operational metadata (e.g. `access_audit_log`)

**Supabase Storage** (private buckets only) — files:
- student admission photos (optimized)
- study material files (PDF, DOC/DOCX, PPT/PPTX — Section 21)
- temporary completed-course XLSX exports

**Flutter local storage (SQLite/Drift)** — bundled + generated data:
- the bundled question bank (Section 9)
- the bundled exam blueprint (Section 12)
- local test results and the sync queue
- optional recent-question history for practice variety

**Explicitly not stored in PostgreSQL:** student photo binaries, study material file binaries, the question bank as a bulk, student-facing, downloadable dataset (it is bundled with the app — Section 9), per-question/per-answer interaction records, raw typing/keystroke data, unnecessary event telemetry, or online doubt/chat data. The single narrow exception is `question_content` (above), which exists only to serve one-question-at-a-time authenticated lookups for teachers, not to distribute the question bank.

---

## 9. Question Bank Architecture

The question bank is a **static resource bundled with the Flutter application** — it is not downloaded from Supabase at runtime, and it is not re-fetched "after every authorization."

```
Flutter Application
        │
        ├── Application UI and logic
        │
        └── Bundled Question Bank (local SQLite asset)
                    ↓
              Local queries only
                    ↓
              Test Generator (Section 12)
```

### 9.1 Local storage format

Evaluate storing the question bank as a **bundled local SQLite database** rather than loading the entire bank into memory. The app must query only the questions needed for the current test:

```
Avoid:  App starts → load all ~30,000 questions into RAM
Prefer: Local question database → query only what's needed → generate test
```

### 9.2 Content authoring & release pipeline (admin side)

The admin still authors and maintains question content — this workflow is preserved, but its output is a **build-time asset**, not a runtime-downloadable package:

```
Admin → Upload CSV/XLSX → Express API (content module) → validate → preview
      → generate local SQLite question-bank asset
      → included in the next Flutter app build/release
      → distributed to students via normal app store / installer updates
```

PDF ingestion remains optional and is only added if explicitly required. Flutter never parses administrative CSV/XLSX/PDF files — only the backend's `content` module does, at authoring time, not at runtime.

### 9.3 No runtime security/DRM layer for the bundled question bank

The previous design (question-bank encryption, AES-256-GCM, key management, private-Storage distribution, download-after-authorization, short-lived download URLs, "entitlement as a security boundary for the question bank") is **removed**. Rationale: content bundled directly inside a Flutter app that ships to a user's device can ultimately be extracted by a sufficiently skilled user regardless of encryption — the key/logic to decrypt it must also ship with the app. Building that complexity would be DRM theater, not real protection, and is explicitly out of scope for V1.

Student authorization (Section 10) still controls **normal application access** — logging in, using the app, syncing results — it is not described anywhere as a mechanism that makes the bundled question bank itself secret.

### 9.4 Versioning

Because the question bank ships as part of the app binary, its version tracks the **app release version**, not a separately downloaded package version. If a future requirement genuinely needs faster content updates without a full app release, that is a deliberate future enhancement — not built speculatively now.

### 9.5 Question-bank version tracking

Even though the question bank is bundled, its version identifier is still tracked end-to-end so a content issue can be traced later:

```
Bundled question bank exposes its own version (matches app release version)
        ↓
TestGenerator reads this version when generating a test
        ↓
test_result.question_bank_version is stamped at completion time (Section 11)
        ↓
Synced to the Express API → stored alongside the compact result
```

This is what lets the admin/backend later identify which results were produced by a specific question-bank content version — important if a content error (e.g., a wrong answer key) is discovered after release and affected results need to be identified or corrected. It does not provide a way to patch content without a new app release (Section 9.4); that limitation is accepted for V1 and revisited only if it becomes a real recurring problem.

---

## 10. Authentication & Authorization

Authentication and authorization remain strictly separate.

| Question | Answered by |
|---|---|
| "Who is this user?" | **Supabase Auth** — authentication, sessions, JWT issuance |
| "What can this authenticated user do?" | **Express middleware + application services** — JWT validation, role enforcement, access-status checks, business rules |

```
Student app / Admin / Teacher app
        ↓
Supabase Auth → authenticated identity + JWT
        ↓
Express authentication middleware → validate JWT, resolve role
        ↓
Application authorization: student_access status, batch rules, etc.
```

A successful login never implies unrestricted access by itself:

```
ACTIVE                       → application functionality available
PENDING / REVOKED / EXPIRED  → restricted per access rules (Section 15)
```

This authorization boundary protects **application access** — it is never described as cryptographic protection for the bundled question bank (Section 9.3).

Roles: `STUDENT`, `TEACHER`, `ADMIN`. Backend is authoritative — never trust a client-provided role, access status, or entitlement.

### 10.1 Server-Derived Identity (the client is never authoritative for `student_id`)

```
Validated JWT
        ↓
auth_user_id (JWT subject)
        ↓
Server-side student lookup
        ↓
Authoritative student_id
```

If a request payload includes a `student_id`, the Express API may use it only as a **consistency check** — it is never trusted as the authoritative identity source. If the client-supplied `student_id` does not match the student resolved server-side from the JWT, the request is **rejected**.

All ownership and authorization decisions — for test-result sync (Section 13.4), study material access (Section 21.2), or any other student-owned data — use the server-derived identity, never a client-asserted one.

---

## 11. Test Result Storage — Compact by Design

Do not store every question-answer interaction remotely, and do not create a database row per question. A 30-question test produces **one** compact result record, not 30.

```
test_result
------------
client_event_id            -- UNIQUE, generated on-device before the first sync attempt (Section 14)
student_id                 -- resolved/verified server-side at sync time, never trusted from the client alone (Section 10.1)
test_id / attempt_id
test_mode                 -- PRACTICE | EXAM
question_bank_version     -- app release version the test was generated from
blueprint_version
total_questions
correct_count
wrong_count
score                      -- calculated locally on the client (Section 12.5); not reconstructed server-side
wrong_question_ids        -- e.g. [Q1832, Q2451, Q0912]
completed_at
sync_status                -- PENDING | SYNCING | SYNCED | FAILED (local only; exact semantics in Section 13.2)
```

**Never stored:** question text, question options, full per-question copies, or unnecessary per-answer history. Question IDs are retained (as a compact array, not a separate table) purely because they enable future analytics if a real need arises later.

**No separate `wrong_question` table in V1.** Wrong question identifiers live inline in `test_result.wrong_question_ids`. Avoiding a per-question child table keeps row counts, indexes, write volume, and sync payloads small. A detailed per-answer analytics model is a possible future enhancement, introduced only if a real requirement justifies the added storage and complexity — never the default.

**Score trust (confirmed V1 decision):** `score` is calculated locally on the Flutter client for both `PRACTICE` and `EXAM` modes. The Express API does not independently reconstruct the test or cryptographically verify the score — see Section 12.5 for the full rationale and boundary.

---

## 12. Test Execution — 100% Local

The following happen entirely on the student's device, with no server round-trip:

```
Question selection
Test generation
Question display
Answer selection
Answer validation
Score calculation
Wrong-question identification
Result generation
```

The Express API never generates a student's test, never receives individual answers, never calculates a score, and never maintains a live test session. This is what keeps backend load flat regardless of how many students are actively testing at once.

### 12.1 Shared `TestGenerator`

One shared generator (entirely client-side, in Dart), not separate engines for Practice and Exam:
1. receives a configuration,
2. validates it,
3. selects questions by section/topic from the local bundled database,
4. guarantees unique `question_id`s within a test,
5. randomizes the selected set,
6. produces the test.

### 12.2 Practice Mode

Flexible, configurable per section (e.g., "Excel = 15, Internet = 15" → a 30-question test). Question selection is random within the requested distribution. Fully local.

### 12.3 Exam Mode

The official-style assessment: **25 questions total**, drawn from a client-approved blueprint across Computer Basics, Excel, Word, PowerPoint, and Internet. The blueprint (like the question bank) is bundled locally with the app:

```
exam_blueprint (bundled asset)
--------------
version
total_questions = 25
computer_basics_count
excel_count
word_count
powerpoint_count
internet_count
```

Section weightage must come from the client-approved blueprint — never invented equal weightage. Randomization changes *which* questions are picked within each section; it never changes *how many* questions each section contributes (`sum(section counts) == 25`, always).

### 12.4 No duplicate questions

The generator guarantees `unique(question_id)` within a single generated test. An optional local recent-question history may improve practice variety; individual question views are never synced to the server.

### 12.5 Client-Calculated Scoring — Confirmed Trust Boundary (V1)

This is a **confirmed V1 architectural decision**, not an oversight: `test_result.score` is calculated locally on the Flutter client, for both `PRACTICE` and `EXAM` modes. The Express API does not independently reconstruct the test or cryptographically verify the score.

The Express API still validates, at sync time (Section 13.4, Section 26.2):
- JWT identity and server-derived student ownership (Section 10.1)
- authorization/access
- required fields and payload structure
- field consistency (e.g. `correct_count + wrong_count == total_questions`, `wrong_question_ids` size matches `wrong_count`, `score` consistent with `correct_count`)
- a supported `question_bank_version` and `blueprint_version` where applicable
- idempotency (Section 14)

**Why this is acceptable for V1:** no `test_result`, in either mode, contributes to official MS-CIT certification, an external credential, a high-stakes examination outcome, or a real-world eligibility decision. Results are used only for internal training, practice, progress tracking, performance analytics, and teacher review (Section 19).

Server-side score reconstruction and advanced anti-tampering mechanisms are explicitly **out of scope** for V1 (Section 24). This decision must be revisited only if results later influence official certification or another high-stakes decision — not preemptively.

---

## 13. Synchronization Architecture

Synchronization is a **separate responsibility from test execution** — it never blocks showing the result to the student, and it never determines whether the result gets saved (Section 5).

**Required trust boundary:**

```
Flutter → HTTPS → Node.js + Express API → Supabase PostgreSQL
```

Flutter must **never** write test results directly to Supabase PostgreSQL. The Express API is always the business-validation and trust boundary; Supabase PostgreSQL is the authoritative persistent store. The full step-by-step flow is in Section 13.4.

```
Test completed → save locally → sync_status = PENDING
        ↓
UI immediately shows the result
        ↓
Sync Service checks pending records (on trigger — Section 13.1)
        ↓
Flutter sends an authenticated HTTPS request to the Express API
        ↓
Authentication middleware validates the Supabase JWT and resolves student identity (Section 10.1)
        ↓
Authorization middleware and Zod validation enforce access and payload consistency (Section 26.2)
        ↓
Idempotency check (Section 14)
        ↓
Supabase PostgreSQL
        ↓
Explicit success acknowledgment → local sync_status = SYNCED
```

Local sync states: `PENDING`, `SYNCING`, `SYNCED`, `FAILED` — their exact meaning is defined in Section 13.2 and is never used loosely.

### 13.1 Synchronization triggers

Sync is attempted when appropriate — not continuously in the background:

1. Internet connectivity becomes available
2. Application starts
3. Application returns to foreground
4. A test completes while connectivity is already available
5. Manual "Sync Now" fallback if needed

```
Internet available
        ↓
Check local database for pending records
        │
        ├── NO  → do nothing
        └── YES → start synchronization
```

No aggressive continuous background sync for V1 — it adds battery cost and platform-specific complexity (WorkManager on Android, no true background execution on Windows) without a real requirement driving it. No always-running background service is introduced. Revisit only if a genuine need emerges.

### 13.2 Sync state rules (what each state actually means)

`FAILED` must **never** represent an ordinary network problem. The following are always retryable and must remain in, or return to, `PENDING` — never `FAILED`:
- network loss
- timeout
- connection interruption
- an ambiguous or partial response
- temporary server unavailability

`SYNCED` is reachable **only** after an explicit server success acknowledgment.

`FAILED` is reserved only for a genuine, non-retryable server-side rejection — for example:
- permanently malformed data that requires manual/administrative intervention
- invalid data that cannot be resolved simply by retrying
- a non-retryable authorization rejection (e.g. the resolved student is `REVOKED`)

```
Sync attempt
        ↓
Explicit server success acknowledgment?
        ├── YES → local sync_status = SYNCED
        └── NO
                ↓
        Retryable? (network / timeout / ambiguous / temporary)
                ├── YES → sync_status stays/returns to PENDING,
                │         retried on the next trigger (Section 13.1)
                └── NO  → sync_status = FAILED (non-retryable;
                          record is still retained locally,
                          never deleted; requires investigation)
```

A synchronization failure of any kind must never automatically delete the local `test_result`. An ambiguous outcome (timeout, partial response) is always treated as **not confirmed**, and is retried safely — this is safe to do repeatedly only because of idempotency (Section 14): a retried submission of an already-stored result is a no-op on the server, never a duplicate.

### 13.3 Simple retry / backoff

Retries use a simple capped exponential backoff (e.g., 5s → 15s → 60s → capped at roughly every 5 minutes) rather than a tight retry loop, to avoid hammering the backend or draining battery on a student's device. No dedicated retry/queueing framework is introduced for V1 — sync volume is low (Section 27), so a basic in-app retry counter with a capped backoff interval is sufficient. Once the backoff cap is reached, the record simply waits for the next natural trigger (Section 13.1) rather than retrying indefinitely on its own.

### 13.4 Required Synchronization Flow (Trust Boundary Detail)

1. A sync trigger fires (Section 13.1).
2. The Sync Service reads `PENDING` results from Drift.
3. Results synchronize independently — one result's failure never blocks another's.
4. Flutter sends an authenticated HTTPS request to `POST /api/v1/results/sync` on the Express API.
5. Authentication middleware validates the Supabase JWT.
6. Authorization/identity middleware resolves the authenticated user identity.
7. The service resolves the authoritative `student_id` server-side (Section 10.1) — a client-supplied `student_id`, if present, is a consistency field only, never authoritative.
8. Zod validation and the service validate authorization and payload consistency (Section 26.2).
9. The result service/repository handles idempotency (Section 14).
10. The repository writes the accepted result to Supabase PostgreSQL.
11. The server returns an explicit success acknowledgment.
12. Flutter marks the local record `SYNCED` only after that explicit acknowledgment (Section 13.2).

---

## 14. Idempotency (required)

Every completed test result receives a stable `client_event_id` (a UUID), generated on the device before the first synchronization attempt. The **same** `client_event_id` is reused for every retry of that result — it is never regenerated on retry.

The database enforces this at the schema level, in addition to the application-level check below:

```
UNIQUE (client_event_id)
```

This database-level constraint is the final protection against duplicate records caused by concurrent or repeated requests (e.g. two near-simultaneous retries racing each other) — it is required in addition to, not instead of, the application-level idempotency handling.

```
Result arrives at the Express API
        ↓
Does client_event_id already exist?
        ├── YES → return idempotent success, do not create another result
        └── NO  → insert the result
```

This protects against the classic double-submit failure mode: server write succeeds, network drops before the response reaches the client, client retries — without idempotency this would create a duplicate `test_result`.

---

## 15. Student Admission, Profile & Access

Student admission is **admin-controlled**; students never self-register.

### 15.1 Admission flow

```
Admin (React Admin) → "Add Student" form → Express API
        ↓
Validate student information
        ↓
Resize/compress official photo (Section 16)
        ↓
Upload optimized photo → Supabase Storage (private)
        ↓
Receive storage path → create student_profile with photo_path
        ↓
Assign batch_id
        ↓
Create student_access record (status = PENDING)
        ↓
Student authentication later linked at first login (Section 17)
```

The form never connects the browser directly to PostgreSQL or Storage — the Express API is always the boundary. Supabase PostgreSQL remains the **primary structured database** for student records; no separate/parallel student-information store is introduced.

### 15.2 Student profile vs. student access

```
student_profile
----------------
id
student_id / PRN
name
email               -- only if required by client
mobile              -- only if required by client
institute_id
batch_id
photo_path
course_info         -- only if required by client
created_at
updated_at

student_access
----------------
id
student_profile_id
auth_user_id
status                  -- PENDING | ACTIVE | EXPIRED | REVOKED
access_granted_at
access_expiry_at
revoked_at
created_at
updated_at
```

Do not duplicate the full profile inside `student_access`, and do not collect any personal field the client hasn't explicitly required.

### 15.3 Offline access expiry

Server-side `student_access` status (Section 15.2) is authoritative whenever the app is online. Offline, the app relies on the entitlement state it last confirmed:

```
Last confirmed online: ACTIVE, access_expiry_at = <date>
        ↓
App goes offline
        ↓
Client checks the cached access_expiry_at before starting a NEW test
        ├── still within validity → new test allowed
        └── past access_expiry_at  → new test blocked per policy;
                                      already-completed local results
                                      may still be viewed/synced later
```

This is a **soft, client-side-clock-dependent control** — a modified client or a rolled-back device clock can defeat it. The real backstop is server-side re-validation: on the next successful sync (Section 13), the backend re-checks `student_access` and any pending results are still accepted (they were earned honestly), but no further test-taking is authorized going forward if the account is `EXPIRED`/`REVOKED`. Document this tradeoff explicitly rather than implying real-time offline revocation is possible — it is not, without connectivity.

---

## 16. Student Admission Photo

- The binary is **never** stored in PostgreSQL — only `student_profile.photo_path` (a Supabase Storage reference).
- The bucket is **private**; access is only through authorized backend-controlled mechanisms — never a public URL.
- **Maximum photo size: 10 KB.** Implementation must verify the compressed result remains recognizable for admin identity verification during testing — if 10 KB proves visually inadequate for reliable verification, this is a concrete, testable tradeoff to revisit, not a target to blow past by default.
- Never trust frontend-only compression — the Express API validates and normalizes the final image server-side.

```
Admin → React Admin → Express API
      → validate → resize/compress (≤10 KB) → Supabase Storage
      → store photo_path in student_profile
```

Admin viewing a photo always goes through the Express API (verify `ADMIN` role → controlled access → Storage → display) — never a direct/public Storage URL.

---

## 17. First-Login Authorization Workflow

A one-time (or as-needed) authorization step — not a per-login approval.

```
Student → Supabase Auth → Express API
        ↓
Check student_access record
        ↓
Authorization required? (unlinked identity, or status not yet ACTIVE)
        ↓ YES
Create authorization_request (status = PENDING)
        ↓
Admin Panel: pending authorization list → admin compares against
official admission record → APPROVE (status = ACTIVE, link auth_user_id)
                             or REJECT
```

Subsequent logins: `Supabase Auth → Express API → student_access = ACTIVE → app opens`, with **no repeated manual approval** for an already-ACTIVE student.

```
authorization_request
----------------------
id
student_profile_id
auth_user_id
requested_at
status          -- PENDING | APPROVED | REJECTED
reviewed_at
reviewed_by
```

References the existing `student_profile` — never duplicates it. The admin panel's pending list and detail/verification screen (photo, name, ID, institute, batch, admission details) are unchanged from prior design and remain valid.

---

## 18. Batch Management

`batch` is retained as a first-class organizational entity, primarily to help teachers locate and assist students efficiently during face-to-face doubt solving, and to support admission management and batch-level performance analysis. It is also reused as the simple audience mechanism for Admin Broadcast Announcements (Section 20) — no separate grouping architecture is introduced for that purpose.

```
batch
------
batch_id
batch_name
institute_id
capacity
status
created_at
updated_at

student_profile.batch_id   -- reference only, never duplicate batch_name
```

**Capacity enforcement:** the admin defines capacity; the backend — not just the frontend — enforces `current_students >= capacity` → `FULL`.

**Full-batch policy remains a deliberate open client decision** (waitlist, offer another batch, admin increases capacity, reject/defer admission) — never auto-resolved by the system without client confirmation.

No teacher profile or teacher-assignment database is introduced to support batches — teachers do not require extensive stored profile information in V1 (Section 19).

---

## 19. Teacher Module — Face-to-Face Support Tool

Primarily designed to support offline/face-to-face doubt resolution, not online chat or ticketing.

```
Student has difficulty understanding a question
        ↓
Student approaches the teacher in person
        ↓
Teacher → Teacher Portal → search student / select batch
        ↓
Teacher navigates to the student's relevant test/result
        ↓
Teacher looks up the flagged question_id(s) from wrong_question_ids
        ↓
Teacher views question text, correct answer, explanation, section/topic
(Section 19.1 — question-content lookup)
        ↓
Teacher explains the concept face-to-face
```

No chat system, no online doubt ticketing, no teacher profile table, no teacher-batch assignment mapping, and no teacher qualification/schedule/contact/HR data in V1. Teacher identity comes entirely from Supabase Auth with role `TEACHER`. If a future requirement genuinely requires restricting teachers to specific batches, a minimal mapping is introduced then — not preemptively.

### 19.1 Question-content lookup (resolving the bundled-vs-web gap)

The question bank is bundled only inside the Flutter student app (Section 9) — the React Teacher app has no local copy, and nothing about that changes here. Teachers still need to see the actual question text, correct answer, and explanation for a flagged `question_id`, so a narrow, deliberate exception applies:

```
Admin CSV/XLSX import (Section 9.2)
        ↓
Generates the bundled SQLite asset for the next Flutter release (bulk, all ~30,000 questions)
        │
        └── ALSO writes a lightweight, read-only question-content
            lookup store (same content, keyed by question_id) that
            the Express API can query on demand
        ↓
Teacher Portal requests a specific question_id (from wrong_question_ids)
        ↓
Express middleware verifies TEACHER/ADMIN role → returns that single question's
content (text, options, correct answer, explanation, section, topic)
```

This is **not** a reintroduction of Section 9.3's removed download/entitlement design: there is no bulk distribution of the question bank to a web client, no offline caching requirement, and no attempt to keep content secret from an authorized teacher. It is a small, authenticated, per-question read used only to render one question at a time inside the Teacher Portal — architecturally closer to any other admin/teacher lookup endpoint than to the mass-distributed bundled question bank. The underlying content store can be as simple as a `question_content` table populated by the same import pipeline, or a read-through cache over the same source files used to build the bundle — either is acceptable; it is explicitly out of scope to encrypt, version-lock, or gate this lookup beyond normal role-based authorization.

---

## 20. Admin Broadcast Announcements

Admin Broadcast Announcements are a **confirmed V1 product requirement**. Administrators create and publish announcements that students can access online (Section 5.1 — announcements require connectivity). This is a broadcast/information feature only.

```
announcement
------------
id
institute_id
title
message
audience_type        -- ALL_STUDENTS | BATCH
audience_batch_id     -- required only when audience_type = BATCH (FK → batch)
status                -- DRAFT | PUBLISHED
published_at
created_by
created_at
updated_at
```

`audience_type` / `audience_batch_id` reuse the existing `batch` entity (Section 18) — no new grouping or segmentation architecture is introduced for this feature, and no priority levels, read receipts, or advanced audience targeting are added since none are required elsewhere in the current design.

**Explicitly out of scope for announcements:** replies, comments, chat, discussion threads, and real-time messaging infrastructure. Announcements are one-way.

Conceptual flow:

```
Admin (React) → Express API → announcement stored in PostgreSQL
        ↓ (on publish)
Optional notification event → notification module (Section 22) → FCM → student device
```

Students retrieve announcements directly from the Express API, filtered by their institute and batch membership, regardless of whether an FCM push notification was delivered. **FCM is a convenience notification mechanism, not the authoritative data source** — a missed push must never make a published announcement inaccessible.

---

## 21. Study Materials / Notes

Study Materials / Notes are a **confirmed V1 product requirement**. A dedicated `study_material` module owns this responsibility (Section 6) — it is not folded into `announcement`, which stays focused on short broadcast messages, not file management.

Administrators upload study materials for students. Supported formats are the practical document types appropriate for this product: PDF, DOC/DOCX, PPT/PPTX. This is document distribution only — not a document editing or collaboration system.

### 21.1 Storage architecture

Actual files are never stored in PostgreSQL:

```
Supabase Storage    → the actual file (private bucket)
Supabase PostgreSQL → material metadata only
Express API          → authorization and controlled access boundary
```

```
study_material
--------------
id
institute_id
title
description       -- optional
file_path          -- Supabase Storage object reference
file_type          -- PDF | DOC | DOCX | PPT | PPTX
status             -- DRAFT | PUBLISHED
uploaded_by
created_at
updated_at
```

Only metadata with an identified V1 purpose is stored: identifying the material (`title`), describing it where useful (`description`), locating the file (`file_path`, `file_type`), controlling availability (`status`), and ownership/audit (`uploaded_by`, `created_at`, `updated_at`). There is no version-history table and no per-student download tracking. Study materials are visible to all students in the institute in V1 — if per-batch targeting for materials is ever required, it can reuse the same `audience_type`/`audience_batch_id` pattern already established for announcements (Section 20) rather than inventing a new mechanism.

### 21.2 Access flow

**Admin (upload):**

```
Admin (React) → Express API validates administrator authorization
        → controlled file storage operation → Supabase Storage
        → material metadata stored in PostgreSQL
```

**Student (access):**

```
Flutter App → Online → request available materials
        → Express API validates student authorization (Section 10.1)
        → return authorized material metadata/access
        → student accesses/downloads the material when needed
```

The Flutter application must not become an unrestricted direct Supabase Storage client. The Express API remains the authorization boundary — the same pattern already used for student photos (Section 16).

### 21.3 Online-only material access

Study materials are **not** part of the offline test-execution reliability mechanism (Section 5). For V1:

| Capability | Behavior |
|---|---|
| Test Execution | Offline-capable |
| Completed Result Persistence | Local-first |
| Result Synchronization | Online |
| Announcements | Online |
| Study Materials | Online |

Do **not** implement: offline material synchronization, automatic downloading of all materials, background download queues, complex document versioning, DRM, or encryption-key-management systems. If a student has no connectivity, study materials are simply unavailable until connectivity returns — the same as announcements. Keep material access intentionally simple.

---

## 22. Notification Integration

The existing FCM notification architecture (`notification` module, Section 6) is reused for these new features — a second notification system is never introduced. New event sources feed the same pipeline:

- a new announcement is published (Section 20)
- a new study material is published (Section 21)

```
announcement / study_material published
        ↓
In-process domain event/handler (same event-based pattern as Section 2/6)
        ↓
notification module → FCM → student device
```

Notification delivery is never required for data correctness. If a notification is missed:
- the announcement must remain accessible online (Section 20).
- the study material must remain discoverable online (Section 21).

FCM is a convenience layer on top of authoritative server-side data, never the source of truth.

---

## 23. Single-Institute V1 Scope

This system is built and deployed for **one institute** in V1. `institute_id` exists on `batch` and `student_profile` as a plain organizational field — it is **not** a multi-tenant isolation boundary, and no per-tenant data-isolation infrastructure (row-level security by tenant, per-institute schema separation, tenant-aware query filtering, etc.) is implemented in V1.

This document must not describe the system as a fully implemented multi-tenant SaaS platform. If multi-institute support becomes a real future requirement, it is designed and built deliberately at that time — including the isolation guarantees a second paying customer would reasonably expect — rather than assumed to already exist because a field happens to be named `institute_id`.

---

## 24. Explicitly Removed / Not Built in V1

The following are **fully removed or intentionally not introduced**. None of these should appear elsewhere in this document, in code, or in future planning without a new, explicit requirement re-introducing them:

- **Device-bound authorization:** device fingerprinting, hardware/MAC/IMEI-based auth, device slots, device registration/revocation, or any `Student → Device → Attempt` chain. Model is simply `Student → Result`.
- **Typing functionality:** typing sessions/passages, raw keystroke capture, WPM/accuracy scoring, `TypingScoringStrategy`. V1 is MCQ-only.
- **Online doubt/chat system:** `doubt_requests`, `teacher_responses`, real-time chat, online tutoring, or any AI chatbot. Teacher support is face-to-face only (Section 19).
- **Teacher HR/profile infrastructure:** teacher profile tables, qualification/schedule/contact data, teacher-batch assignment mapping (unless explicitly required later).
- **Question-bank DRM/security theater:** encryption (AES-256-GCM or otherwise), key-management infrastructure, private-Storage runtime distribution, download-after-authorization, short-lived download URLs, and "entitlement as a security boundary" framing for the bundled question bank (Section 9.3).
- **Detailed per-answer/per-question event storage** as a default model — only the compact `test_result` (Section 11) is stored by default.
- **Continuous/aggressive background synchronization, or any always-running background service** — sync is trigger-based (Section 13.1), not always-on.
- **Direct client-to-database access** — no client ever connects directly to Supabase PostgreSQL; the Express API is always the boundary (Section 26).
- **Custom cryptography** anywhere in the system.
- **Permanent public URLs** for student photos, study materials, or exports — everything sensitive lives in private buckets behind controlled access.
- **Per-login manual approval for ACTIVE students** — only first-login/non-ACTIVE states trigger the authorization workflow (Section 17).
- **Full multi-tenant SaaS isolation** — not implemented in V1 (Section 23).
- **Microservices, Kafka/message queues, and enterprise-grade observability infrastructure** — this remains a modular monolith (Section 27) with lightweight, right-sized operational tooling (Section 28).
- **Complex archival systems** (SQLite archive files, ZIP bundles, custom backup formats) — the XLSX export (Section 29) is sufficient for V1 and is explicitly *not* a database backup strategy (Section 30).
- **Announcement/study-material discussion features:** replies, comments, chat, discussion threads, or real-time messaging/WebSocket infrastructure attached to announcements or study materials (Sections 20, 21) — these remain one-way broadcast/distribution features only.
- **Study-material protection infrastructure:** DRM, encryption/key-management systems, complex document version history, offline material synchronization, automatic/background downloading of all materials, or background download queues (Section 21.3).
- **Score-integrity infrastructure for internal results:** server-side score reconstruction/replay or high-security anti-cheating mechanisms for `PRACTICE`/`EXAM` results (Section 12.5) — revisited only if results later affect official certification.
- **Advanced conflict resolution** for synchronization — not needed given the append-only, idempotent, single-writer-per-result model (Sections 13, 14).
- **Advanced/complex audience segmentation** for announcements or study materials — only "all students" or a single existing `batch` is supported (Section 20).

---

## 25. Data Retention, Export & Purge Lifecycle

A typical course runs roughly **6 months**. The system does not retain detailed operational data indefinitely.

```
Student active → dynamic application data stored
        ↓
Course completed → generate XLSX export → notify admin
        ↓
10-day download window (reminders at Day 5, Day 8)
        ↓
15-day safety retention period (final warnings Day 13, Day 14)
        ↓
Eligible for purge (Day 15)
```

| Day | Event |
|---|---|
| 0 | Course completed; XLSX generated; admin notified it's ready |
| 5 | Reminder: 5 days remain to download |
| 8 | Reminder: 2 days remain to download |
| 10 | Download window expires; admin notified |
| 13 | Final warning: purge in 2 days |
| 14 | Final warning: purge tomorrow |
| 15 | Detailed operational data eligible for purge; admin notified after success |

**XLSX is sufficient for V1** — easy for the admin to open, easy to implement, and per-student data is compact given the compact `test_result` model (Section 11). No SQLite archive files, ZIP archives, or other archival formats are introduced in this iteration; a richer archive format is a possible future enhancement only if real requirements justify it.

### 25.1 Export safety rule (mandatory)

Automatic deletion never occurs simply because an export process *started*. Data becomes eligible for purge only after:

```
Export successfully generated
        +
Export verified as successful
        +
Required download window completed
        +
Safety retention period completed
```

```
Course completed → generate export
        ├── failed    → retain data, retry, notify admin
        └── succeeded → start the retention countdown
```

The purge action itself is logged, and the purge process is idempotent — a failed purge must never corrupt remaining student records.

### 25.2 What survives a purge

The minimum retained record covers identification, compliance, and re-enrollment needs — e.g. `student_id`, `name`, `institute_id`, batch history if required, `photo_path` if required, `course_status`, `course_completed_at`. Detailed operational results are what gets purged. Exact permanent-retention fields follow client/legal requirements.

**Announcements and study materials are institute-level content, not per-student operational data** — they are not part of this per-student purge lifecycle. Their lifecycle (e.g. archiving an old announcement, removing an outdated material) is an ordinary admin content-management action, not an automated purge policy in V1.

---

## 26. Security Model & API Boundary

```
Flutter        → Node.js + Express API → Supabase PostgreSQL
React Admin    → Node.js + Express API → Supabase PostgreSQL
React Teacher  → Node.js + Express API → Supabase PostgreSQL
```

Supabase Auth is called directly by clients for authentication itself (login/session), but every application-level authorization decision is still enforced by Express middleware and application services (Section 10). Backend is authoritative for role, access status, student identity, authorization status, and batch capacity — never trusted from the client.

The Express API surface covers: auth/session validation, student admission, student profile, student access, batch management, authorization requests, admin student management, content authoring endpoints (question-bank/blueprint import for the release pipeline — Section 9.2), test-result sync, progress reads, announcements (admin create/publish, student retrieval — Section 20), study materials (admin upload/publish, student retrieval — Section 21), teacher student search, teacher result review, completed-course export, and the retention/purge lifecycle. Raw PostgreSQL is never exposed to Flutter or React.

### 26.1 API versioning (explicit rule)

Every endpoint is exposed under a versioned path, `/api/v1/...`, from the very first release — not retrofitted later. The rule is simple and non-negotiable:

```
/api/v1/...   ← every current client uses this, unchanged, indefinitely
/api/v2/...   ← only created for a genuine breaking change
```

Additive, backward-compatible changes (new optional field, new endpoint) are made to `v1` in place. A version bump to `v2` happens only for a true breaking change, and `v1` stays alive until every client in the field has migrated off it. This is what allows Admin, Teacher, and Student clients to evolve independently without a coordinated release. See Section 31 for the full client-replaceability rationale this rule supports.

### 26.2 Server-side payload validation (mandatory, never trust the client)

Every incoming request is validated server-side, regardless of what validation the client already performed — client-side validation is a UX convenience, never a security or correctness boundary. This applies in particular to:

- **Test-result sync payloads:** required fields present; `test_mode` is a known enum value; `correct_count + wrong_count == total_questions`; `score` is consistent with `correct_count` (a basic consistency check only — Section 12.5 — never independent score reconstruction); `wrong_question_ids` size matches `wrong_count`; the server-derived `student_id` (Section 10.1) matches the resolved JWT identity, and any client-supplied `student_id` is rejected if it disagrees; `student_access` is in a state permitted to submit new results per policy (Section 15.3 offline-expiry policy still applies at sync time).
- **Admission/admin forms:** required admission fields present per client configuration (Section 15.2); photo meets format/size constraints (Section 16) independent of any client-side compression already applied.
- **Content authoring uploads (CSV/XLSX):** schema/column validation, duplicate `question_id` detection, and blueprint section counts summing correctly (Section 12.3), before a build asset is ever generated.
- **Study material uploads:** administrator authorization, supported file type (Section 21), and required metadata present before the file is stored.
- **Authorization decisions:** an admin action (`APPROVE`/`REJECT`, batch capacity changes) is re-validated against current server-side state, not merely trusted from whatever the admin UI last displayed.

An invalid payload is rejected with a clear 4xx response and is never partially persisted — validation failures do not leave the database in an inconsistent intermediate state.

### 26.3 API error handling

Controllers and services throw a small structured `ApiError`; the central Express error middleware translates it to the consistent response contract below. It must not expose database URLs, stack traces in production, secrets, or internal implementation details.

```json
{
  "success": false,
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found"
  }
}
```

Zod validation errors map to a clear 400 response. Authentication maps to 401, authorization to 403, missing resources to 404, unique/idempotency conflicts to an appropriate 409 or idempotent success response, and documented business-rule errors to 4xx responses. Unexpected failures are logged server-side and return a generic 500 response.

---

## 27. Backend/Client Load Split (why this scales without proportional server cost)

```
STUDENT DEVICE                    EXPRESS API                  SUPABASE
-----------------                 -------------                ------------
Question bank access              Authorization                Authentication
Test generation                   Business rules                PostgreSQL persistence
Test execution                    Admin APIs                    Student photos (Storage)
Score calculation                 Teacher APIs                  Study materials (Storage)
Local result storage              Announcements                 Centralized application data
Offline queue                     Study materials
                                   Result synchronization
                                   Validation
                                   Idempotency
```

Increasing student activity does not proportionally increase live server traffic, because the server primarily receives one compact result per completed test — never a live stream of question/answer interactions during the test itself (Section 12).

---

## 28. Minimum Operational Readiness

Enterprise infrastructure is not introduced for V1, but the following lightweight, right-sized practices are mandatory before production deployment:

### Secrets
Supabase service-role credentials exist **only** in backend secrets/environment variables — never in Flutter, React, client-side code, or committed to Git. If exposure is suspected, rotate/revoke the credential immediately.

`config/env.ts` validates required configuration at startup. Conceptual variables include `DATABASE_URL`, Supabase JWT verification configuration, `SERVER_PORT`, and `NODE_ENV`; actual values never appear in this document, source control, screenshots, or logs.

### Logging
The Express API provides structured logs, request/correlation IDs, server-side error logging, and meaningful synchronization-failure logging (Section 13/14) — failed syncs must be diagnosable from logs alone, not just "it didn't sync."

### Health
A basic health-check endpoint is exposed for uptime checks.

### Monitoring
At minimum, monitor: application uptime, repeated backend errors, repeated sync failures, Supabase database usage, Supabase Storage usage, and other relevant Supabase project quotas (Section 30). No enterprise observability stack is required for V1.

### Database migrations
Drizzle Kit migrations are the single source of schema truth. Concrete rules, not just a tool choice:

- Every schema change is a new, immutable, versioned migration file — an already-applied migration is never edited after the fact; a mistake is fixed with a new forward migration, not a rewrite of history.
- Migrations run through the documented deployment/startup command in **every** environment (dev, pilot/staging, production) so schema drift between environments cannot silently occur; production migration execution is an explicit release step, not hidden application startup behavior.
- A migration that drops a column/table or otherwise destroys data requires a manual review step before it is applied to production — no destructive migration reaches production purely because it reached dev first.

### Development vs. production separation
- **Separate Supabase projects** for development/pilot and production — never a single shared project for both. This is what prevents a local bug or test data from ever touching real student records.
- **Separate configuration per environment** (`NODE_ENV=development`, `staging`, `production`) for database connection details, Supabase keys, logging verbosity, and any feature flags.
- Production secrets are never present in local/dev configuration files and are never committed to Git (this is the same rule as the Secrets subsection above, applied specifically to the dev/prod boundary).
- Flutter builds point at the dev backend by default; a build-time flag/flavor switches a release build to production — there is no runtime toggle a student could accidentally trigger.

---

## 29. Backup & Recovery

A complex disaster-recovery architecture is not built for V1. Before production deployment, explicitly verify the backup and recovery capabilities available on the selected Supabase plan (point-in-time recovery, backup frequency/retention) and confirm they meet the institute's actual risk tolerance.

**The XLSX export lifecycle (Section 25) is an archival/retention optimization for completed courses — it must never be described or relied upon as a complete database backup strategy.** It covers a narrow, already-completed slice of data on a fixed schedule; it does not substitute for platform-level backup of the live database.

---

## 30. Storage & Capacity Planning

- **PostgreSQL stays lean:** no bulk question-bank storage, no image/document binaries, no per-answer event storage, no chat records — only structured dynamic data (student, access, batch, compact test_result, announcements, study-material metadata, audit metadata) plus the narrow `question_content` teacher-lookup store (Section 19.1), which holds the same ~30,000 rows as the bundled bank but is used only for single-question authenticated reads, not distribution.
- **PostgreSQL maintenance:** after large purges, space is not necessarily reclaimed immediately (VACUUM/maintenance mechanics apply) — monitor actual database size rather than assuming instant reclamation.
- **Supabase Free-tier constraints are planning estimates, not guarantees** — verify actual plan limits (PostgreSQL size, Storage size, MAU, egress) before deployment and monitor usage against them (Section 28).
- **Student capacity is a rough planning range, not a guaranteed number** — validate against real usage and treat approaching any quota as a trigger to upgrade the Supabase plan tier, which is the default low-effort scaling response (Section 31).
- **Photo storage** at ≤10 KB/photo stays small even at scale (10,000 students ≈ 100 MB), consuming the Storage quota, not the PostgreSQL quota.
- **Study material storage** adds to the Supabase Storage quota (not PostgreSQL) and scales with content volume rather than student count — monitor it the same way photo storage is monitored (Section 28). No maximum-file-size policy is fixed yet (Section 37).
- **Egress stays low** because the question bank is bundled with the app (zero runtime download traffic per student), photos are small, exports are only downloaded by admins when needed, and study materials are downloaded on demand rather than pushed to every student automatically.

---

## 31. Client Replaceability

The real module boundary between any client (Flutter, React, or a future replacement) and the backend is the **versioned REST API contract**, not the client's implementation language.

A client is replaceable exactly to the degree it depends only on:
1. The versioned REST endpoints (`/api/v1/...`) and their DTO shapes.
2. The sync contract (Section 13/14): client-generated `client_event_id`, idempotent POST semantics.
3. The Supabase Auth-issued JWT contract Express authentication middleware validates (Section 10).

Practices that keep this true: treat an OpenAPI spec as the source of truth (updated as a per-module deliverable, not an afterthought); version the API and never break a version in place; never branch backend logic on client type — if a rule seems to depend on the client, it usually actually depends on a data field, and should be modeled that way.

---

## 32. Future Scaling Path (not built now — mapping only)

Do not provision any of this in V1.

| Trigger | Response |
|---|---|
| Approaching PostgreSQL/Storage/MAU/egress quota on the current Supabase plan | Upgrade the Supabase plan tier first — the default, low-effort path |
| Sustained real need to leave Supabase (cost, compliance, data residency) | Because the backend's data-access layer stays provider-agnostic (Section 7), migrate PostgreSQL to another managed/self-hosted provider without touching business logic |
| Backend compute becomes the bottleneck | Move the container to a managed compute platform, independent of the database decision above |
| Genuine multi-institute requirement emerges | Design real tenant isolation deliberately at that time (Section 23) — not assumed to already exist |
| Faster question-bank content updates needed without a full app release | Reconsider a lightweight content-update mechanism then, with a clear-eyed cost/benefit call — not the encrypted-download design removed in Section 9.3 |
| Study materials need per-batch targeting or delivery confirmation | Reuse the audience pattern already built for announcements (Section 20) rather than designing a new one |

No migration or new capability is undertaken speculatively; each is triggered by an observed, real constraint.

---

## 33. Build Order (the working checklist)

```
[ ] 1.  Project foundation
       - Node.js + TypeScript + Express skeleton, separate dev and production Supabase
         projects provisioned (Section 28)
       - Drizzle schema and migrations against Supabase PostgreSQL
       - openapi.yaml skeleton under /api/v1 (Section 26.1)
[ ] 2.  Supabase Auth integration (client SDK + JWT issuance)
[ ] 3.  Express authentication middleware: Supabase JWT verification, role resolution
[ ] 4.  Role model (STUDENT / TEACHER / ADMIN)
[ ] 5.  Supabase PostgreSQL schema (Section 8 entities)
[ ] 6.  Supabase Storage buckets (photos, study materials, exports) — private
[ ] 7.  Student admission (admin form → Express API → PostgreSQL)
[ ] 8.  Student photo upload + resize/compress pipeline (≤10 KB)
[ ] 9.  Student access / entitlement model
[ ] 10. Batch management + capacity enforcement
[ ] 11. Authorization request workflow
[ ] 12. Admin authorization panel (React)
[ ] 13. Content module: CSV/XLSX question-bank import + validation
[ ] 14. Bundled SQLite question-bank asset generation for app builds
[ ] 15. Bundled exam blueprint asset
[ ] 16. Flutter local SQLite/Drift integration (bundled question bank)
[ ] 17. Shared TestGenerator (Dart, fully local)
[ ] 18. Practice Mode
[ ] 19. Exam Mode (25-question blueprint)
[ ] 20. Local test_result generation (compact model, Section 11), client-
        calculated scoring (Section 12.5)
[ ] 21. Sync queue + trigger-based Sync Service, with the failure-safety
        rule and capped retry/backoff (Section 13.1–13.3)
[ ] 22. Sync endpoint: server-derived identity resolution (Section 10.1),
        server-side payload validation (Section 26.2), and idempotent
        client_event_id handling with a DB-level UNIQUE constraint
        (Section 14)
[ ] 23. Progress/analytics reads (from test_result)
[ ] 24. Teacher authentication (Supabase Auth, TEACHER role)
[ ] 25. Teacher batch/student search
[ ] 26. Teacher result reviewer + single-question content lookup (Section 19.1)
[ ] 27. Admin announcements (create/publish, audience: all students or a
        batch) + student-facing announcement retrieval (Section 20)
[ ] 28. Study material module: metadata schema + Supabase Storage upload
        pipeline (admin) + student-facing retrieval/access endpoint
        (Section 21)
[ ] 29. Notifications (FCM, event-driven), triggered from announcement and
        study-material publish events (Section 22)
[ ] 30. Completed-course XLSX export
[ ] 31. 10-day admin download window
[ ] 32. 15-day purge lifecycle (with export-safety rule)
[ ] 33. Operational readiness: secrets, logging, health endpoint, monitoring
[ ] 34. Backup/recovery verification against chosen Supabase plan
[ ] 35. Flutter Android testing
[ ] 36. Flutter Windows testing
[ ] 37. Security testing
[ ] 38. Pilot deployment
[ ] 39. Production hardening
```

Each numbered step should end with a working, testable slice — not a partial module. Don't start step N+1 until step N's service interface is stable.

### 33.1 Three-month delivery priority

The checklist is sequenced into these delivery phases; secondary modules do not displace a working core workflow.

1. **Foundation:** Node.js, TypeScript, Express, environment validation, Drizzle connection/migrations, Zod, structured errors, and JWT authentication middleware.
2. **Core admin backend:** admin, students, batches, authorization requests, and only the dashboard APIs already required by the React applications.
3. **Student access foundation:** student identity, authentication/authorization, and confirmed device/access rules.
4. **Test-result sync:** `POST /api/v1/results/sync`, idempotency, durable persistence, and offline retry verification.
5. **Secondary features:** announcements, notifications, and study materials only after the core workflows work.
6. **Hardening:** integration tests, failure scenarios, authentication tests, offline-sync tests, build/demo preparation, and pilot deployment.

### 33.2 Lightweight V1 testing and CI

- **Unit tests:** critical service/domain rules such as access-status transitions, batch capacity, and sync-state/idempotency decisions.
- **Integration tests:** the high-value Express routes, including authentication/authorization middleware, Zod rejection, result sync acknowledgement, and PostgreSQL `UNIQUE(client_event_id)` behavior.
- **Manual end-to-end checks:** admin admission/authorization workflows; student authorization; completed result saved with no network; retry after ambiguous failure; duplicate `client_event_id` submitted safely.
- **Minimal CI:** TypeScript type-check, lint, automated tests, and production build on each change. A complex deployment pipeline is not required for V1.

---

## 34. Final Student Lifecycle (end-to-end)

```
ADMISSION
Admin enters student details → uploads official photo → photo compressed
(≤10 KB) → Storage → photo_path in PostgreSQL → student assigned to batch
→ student_access record created (PENDING)

FIRST LOGIN
Supabase Auth → Express API → student/access validation
→ authorization_request if required → admin reviews → APPROVE → ACTIVE

PRACTICE / EXAM
Bundled local question bank + blueprint → TestGenerator (fully local)
→ student completes test → local score calculated (Section 12.5) →
compact test_result saved locally (sync_status = PENDING) → shown to
student immediately

SYNC
Sync Service checks pending records on trigger (Section 13.1)
→ sends compact test_result to Express API → JWT validated, student
identity resolved server-side (Section 10.1) → idempotency check
→ Supabase PostgreSQL → local sync_status = SYNCED

TEACHER SUPPORT
Teacher login → select batch → select student → open result
→ see wrong_question_ids/topics → explain face-to-face

ANNOUNCEMENTS & STUDY MATERIALS (online)
Student opens app online → Express API returns published announcements
and available study materials for the student's institute/batch →
student reads the announcement / opens the material when needed
(Sections 20, 21)

COURSE COMPLETION
Course completed → XLSX generated → admin notified → 10-day download
window → reminders → Day 13/14 warnings → Day 15 purge → detailed
operational data deleted → minimal required student record retained
```

---

## 35. Final Target Architecture

```
                    ┌─────────────────────┐
                    │   FLUTTER STUDENT   │
                    │       APPLICATION   │
                    │                     │
                    │ Bundled Question DB │
                    │ Local Test Engine   │
                    │ Local Results DB    │
                    │ Offline Sync Queue  │
                    │ (Cubit: transient)  │
                    │ (Drift: durable)    │
                    └──────────┬──────────┘
                               │
                     Only for auth/sync/API
                               │
                               ▼
                    ┌─────────────────────┐
                    │ NODE.JS + EXPRESS   │
                    │                     │
                    │ Authorization       │
                    │ Business Rules      │
                    │ Admin APIs          │
                    │ Teacher APIs        │
                    │ Announcements       │
                    │ Study Materials     │
                    │ Result Sync         │
                    │ Validation          │
                    │ Idempotency         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      SUPABASE       │
                    │                     │
                    │ Auth                │
                    │ PostgreSQL          │
                    │ Private Photo &     │
                    │ Study-Material Store│
                    │ (temp XLSX exports) │
                    └─────────────────────┘
```

---

## 36. Summary of What This Document Enforces

- **Offline capability is scoped, not absolute:** only test execution, answer evaluation, score calculation, and completed-result persistence are offline-capable; login, sync, announcements, and study materials require connectivity (Section 5).
- **Interrupted tests are abandoned by design (confirmed V1 policy):** only a completed test is durably persisted; in-progress state is transient Cubit state, safe to lose on crash, force-close, or restart (Section 5.3).
- **Cubit vs. Drift is a hard boundary:** Cubit owns disposable UI/session state, Drift owns durable data, and the Repository is the only bridge between them — UI/Cubit never coordinate sync logic directly (Section 4).
- **Test execution is 100% local:** question selection, generation, scoring, and wrong-answer identification never touch the server (Section 12) — server load stays flat as student activity grows (Section 27).
- **The question bank is a bundled app asset, not a runtime-secured download** — the earlier encryption/entitlement-download design was real complexity solving a problem (content secrecy) that bundling makes unsolvable anyway, so it's removed rather than half-built (Section 9).
- **Test results are compact by default:** one row per completed test, question IDs only, no per-answer table, unless a real future requirement justifies more (Section 11).
- **Client-calculated scoring is a confirmed, bounded V1 decision:** acceptable because no `PRACTICE`/`EXAM` result feeds official certification or a high-stakes outcome; server-side reconstruction is revisited only if that changes (Section 12.5).
- **The client is never authoritative for student identity:** every write/read of student-owned data resolves `student_id` server-side from the validated JWT, and a mismatched client-supplied `student_id` is rejected (Section 10.1).
- **Idempotent sync:** every result carries a `client_event_id`, enforced `UNIQUE` at the database level; duplicate submissions are a no-op, not a duplicate record (Section 14).
- **Authentication vs. authorization stays separate:** Supabase Auth answers identity, Express middleware and application services answer what an authenticated user may do (Section 10).
- **Admission, photos, batches, and authorization are admin-controlled and backend-mediated** — never direct-to-database from a client (Section 26).
- **Announcements and study materials are online-only broadcast/distribution features:** no chat, replies, offline sync, DRM, or complex versioning; FCM is a convenience layer, never the source of truth (Sections 20, 21, 22).
- **Data retention is bounded:** completed courses are exported with a firm download window and a verified-success-gated purge; announcements/study materials are institute-level content outside this per-student lifecycle (Section 25).
- **Operational readiness is lightweight but real:** secrets, logging, health, monitoring, database migrations, and dev/production environment separation are explicit V1 deliverables, not enterprise infrastructure (Section 28); backup/recovery is verified against the actual Supabase plan, and the XLSX export is never mistaken for a backup strategy (Section 29).
- **The API is versioned from day one** (`/api/v1/...`) and every incoming payload is validated server-side regardless of client-side checks (Sections 26.1, 26.2) — the client is never the trust boundary.
- **Sync failures are safe by design:** a failed sync never loses or corrupts a local result; `FAILED` is reserved for genuine non-retryable rejections, ordinary network problems stay/return to `PENDING`, retries use a simple capped backoff, and idempotency makes safe retries possible (Sections 13.2, 13.3, 14).
- **Question-bank content is traceable even though it's bundled:** every result is stamped with the question-bank version that produced it, so a content defect discovered later can be traced to affected results (Section 9.5).
- **This is single-institute V1, honestly labeled as such** — no premature multi-tenant SaaS claims (Section 23).
- **Premature optimization is explicitly rejected** (Section 24) — the system remains a modular monolith sized for a solo developer and a first production iteration, with a clear, low-drama path to scale when a real trigger appears (Section 32).

---

## 37. Remaining Client Decisions & Open Risks

**Remaining client decisions (do not hard-code until confirmed):**
- Full-batch policy when a requested batch is at capacity (Section 18).
- Exact fields required at admission (email/mobile/course info).
- Exact exam blueprint section weightage (must come from the client-approved document).
- Exact export column set for the completed-course XLSX (Section 25).
- Whether teacher-batch restriction is ever required (Section 19).
- Whether/when multi-institute support becomes a real requirement (Section 23) — if so, isolation is designed then, not assumed now.
- **Not decided — requires product decision:** maximum study material file size / accepted file-size range (Section 21). Follow the same validate-before-assuming approach already used for the 10 KB photo limit (Section 16) rather than picking an arbitrary number.
- **Not decided — requires product decision:** whether announcements or study materials ever need per-student read-tracking or delivery confirmation (Sections 20, 21). Not built by default per the anti-over-engineering principle (Section 2); only introduced if explicitly required later.

**Remaining technical risks:**
- The bundled question bank can be extracted by a sufficiently determined user — accepted and documented rather than "solved" with DRM (Section 9.3).
- Offline revocation cannot be enforced in real time without connectivity — a soft, client-side-clock-dependent control backstopped by server re-validation on next sync.
- Supabase Free-tier quotas are planning estimates, not guarantees, and must be validated against real usage before relying on them for a pilot of meaningful size (Section 30).
- 10 KB photo compression must be validated for actual admin-verification usability during implementation, not assumed adequate by default (Section 16).
- PostgreSQL space reclamation after purges is not immediate and requires active monitoring (Section 30).
- Backup/recovery guarantees depend entirely on the selected Supabase plan and must be explicitly verified before production (Section 29).
- A question-bank content defect (e.g. a wrong answer key) can only be fixed by a new app release, not a hot patch — version tracking (Section 9.5) lets affected results be identified, but does not eliminate the release-cycle delay to fix the content itself. Acceptable for V1; revisit only if this becomes a recurring operational problem.
- Client-calculated scoring (Section 12.5) means a technically sophisticated student could tamper with a locally-calculated `PRACTICE`/`EXAM` score before sync; this is an accepted, documented V1 risk because no result affects official certification or a high-stakes outcome — it is not treated as an oversight, and is revisited only if that ceases to be true.
- Node.js/Express provides less framework-enforced structure than Spring, so module boundaries and bootstrap dependency composition must be reviewed consistently. The route → middleware → controller → service → repository convention in Sections 3 and 7.1 keeps this explicit.
- TypeScript types do not validate untrusted runtime input; Zod validation is mandatory before controller/service logic (Sections 7 and 26.2).
- Async errors can bypass handlers if they are not forwarded correctly; controllers use a shared async wrapper and the central Express error middleware in Section 26.3.
