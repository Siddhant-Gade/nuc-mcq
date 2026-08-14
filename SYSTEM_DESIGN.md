# SYSTEM DESIGN — MSCIT Typing & Skill Assessment Platform

**Purpose of this document:** This is the implementation blueprint. It is written to be followed step by step, module by module, in the order listed in Section 10. Every module has explicit boundaries, responsibilities, and dependencies so the monolith stays loosely coupled and highly cohesive even as it grows. Read Sections 1–4 once for principles, then use Section 10 as the working checklist during actual build.

---

## 1. System Context

```
┌──────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Student      │     │  Student      │     │  Teacher / Admin    │
│  Mobile App   │     │  Laptop App   │     │  Web App (React)    │
│  (Flutter,    │     │  (Flutter     │     │                     │
│   Kotlin      │     │   Windows)    │     │                     │
│   native calc)│     │               │     │                     │
└──────┬───────┘     └──────┬───────┘     └──────────┬──────────┘
       │  REST/HTTPS         │  REST/HTTPS             │  REST/HTTPS
       └──────────┬──────────┴──────────────┬──────────┘
                   ▼                         ▼
         ┌──────────────────────────────────────────┐
         │          SPRING BOOT MONOLITH             │
         │  (Servlet Filters → Controllers →         │
         │   Services → Repositories → PostgreSQL)   │
         └──────────────────────────────────────────┘
                             │
                             ▼
                       PostgreSQL
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
              Backups              (Future: AWS
              (local/R2)            migration, Sec. 12)
```

Two client types, one backend contract. Both mobile and laptop clients are offline-first and talk to the exact same REST API — there is no separate "laptop API." The web app (teacher/admin) is online-only by nature (office use), so it doesn't need offline design.

---

## 2. Design Principles (applied throughout, not optional)

### Loose coupling / high cohesion — how it's enforced, not just stated
- **Package-by-feature, not package-by-layer.** Each module (`auth`, `student`, `device`, `sync`, etc.) is a Java package containing its own controller, service, repository, entity, DTO, and mapper. Nothing outside a module touches another module's repository or entity directly.
- **Modules talk to each other only through a public service interface.** If the `Sync` module needs student data, it depends on `StudentService` (an interface), never `StudentRepository`. This is the mandatory rule — a module's repository classes are package-private.
- **One facade service per module.** External callers (controllers, other modules) call exactly one entry-point service class per module. Internal helper classes stay package-private.
- **No circular module dependencies.** Draw the dependency graph before coding each module (Section 10 lists them in dependency order — build in that order and this stays true automatically).

### SOLID, applied concretely
- **Single Responsibility:** a service class does one module's business logic — `SyncService` never validates student eligibility itself, it calls `StudentService.isEligible(studentId)`.
- **Open/Closed:** scoring logic (typing WPM/accuracy, MCQ scoring) is behind a `ScoringStrategy` interface, so adding a new test type later doesn't modify existing scoring code.
- **Liskov Substitution:** any `NotificationSender` implementation (FCM now, email later) must be swappable without callers knowing which one is active.
- **Interface Segregation:** don't create one giant `StudentService` interface with 30 methods if only 5 are used cross-module — expose a narrower `StudentLookupService` interface for cross-module reads if needed.
- **Dependency Inversion:** controllers depend on service interfaces, services depend on repository interfaces (Spring Data JPA repositories are already interfaces) — never `new` a concrete class directly; let Spring inject it.

### Domain model discipline
Avoid an anemic domain model (entities that are just getters/setters with all logic in services). Where genuine business rules exist on an entity (e.g., "a device can only transition ACTIVE → REVOKED, never the reverse without re-registration"), put that rule as a method on the entity itself (`device.revoke()`), not scattered across service classes.

---

## 3. Layering Within Each Module

```
Controller   ── HTTP concerns only (request/response, status codes, validation triggers)
    │
Service      ── business logic, orchestration, transaction boundaries (@Transactional)
    │
Repository   ── Spring Data JPA interface, one per aggregate root
    │
Entity       ── JPA entity + domain rules that belong to it
```

DTOs cross the controller boundary; entities never leave the service layer. Mapping between DTO ↔ entity happens in a dedicated Mapper class (MapStruct recommended) per module — keeps controllers and services thin.

---

## 4. Servlet Layer — Where It Actually Lives

Spring Boot's `DispatcherServlet` (itself a `javax.servlet.http.HttpServlet`) is the single front controller — this is already "Servlet" under the hood and is not reimplemented. Where raw Servlet API is used explicitly and deliberately in this system:

**Servlet `Filter` chain** (registered as Spring beans, run before any controller):

```
Request
   ↓
1. CorrelationIdFilter      -- assigns a request ID for logging/tracing
   ↓
2. JwtAuthenticationFilter  -- validates access token, sets SecurityContext
   ↓
3. TenantContextFilter      -- extracts institute_id from JWT claims,
                               binds it to a request-scoped TenantContext
   ↓
4. RateLimitFilter          -- basic per-IP/per-student rate limiting on /sync, /auth
   ↓
DispatcherServlet → Controller
```

`TenantContextFilter` is the mechanism that makes the Section 5 tenant-isolation rule automatic — every repository query downstream reads the current institute from `TenantContext.get()` rather than trusting a client-supplied value, which is what makes tenant isolation enforceable rather than optional-and-forgettable.

---

## 5. Tenant Isolation (mandatory from first commit — see prior README, unchanged here)

```
JWT → institute_id → TenantContextFilter → TenantContext (request-scoped)
                                                   ↓
                                    Every repository query filters by it
```

Implementation detail: use a Spring Data JPA `@Filter` (Hibernate filter) enabled per-session on `institute_id`, OR a base `TenantAwareRepository` that all module repositories extend, which injects the `WHERE institute_id = :tenantId` clause automatically. Pick the Hibernate `@Filter` approach — it's harder to accidentally bypass than remembering to extend a base class.

---

## 6. Module Map (build order = dependency order, see Section 10)

| Module | Owns | Depends on |
|---|---|---|
| `institute` | institutes table, subscription status | — (foundation) |
| `auth` | users, JWT issuance/refresh, password hashing | `institute` |
| `student` | student profiles, PRN, approval status | `institute`, `auth` |
| `teacher` | teacher profiles | `institute`, `auth` |
| `device` | device slots (MOBILE/LAPTOP), activation | `student`, `auth` |
| `question` | theory MCQs, typing passages, explanations | `institute` |
| `assessment` | tests, test_questions, scoring strategy | `question` |
| `attempt` | attempts, answers, typing_sessions | `assessment`, `student`, `device` |
| `sync` | sync_records, idempotent ingestion | `attempt`, `device` |
| `attendance` | attendance records | `student` |
| `admin` | admin-facing orchestration (approval, entitlement) | `student`, `device`, `institute` |
| `teacherportal` | wrong-answer analysis, reporting reads | `attempt`, `question`, `student` |
| `notification` | FCM dispatch | `student`, `device` |

Each row's "Depends on" is a **compile-time dependency on that module's public service interface only** — never a shortcut through the repository.

---

## 7. Entitlement / Activation Flow — "Download ≠ Access"

This is the core admin-control mechanism you described: installing the app from the Play Store must not, by itself, grant usage. Access is additionally **time-boxed to 1 year from approval**, with the admin able to revoke early or renew at any time.

### Access status model

```
student
-----------------
...
access_status        -- PENDING_APPROVAL | ACTIVE | EXPIRED | REVOKED
access_granted_at     -- set when admin first approves
access_expiry_at      -- access_granted_at + 1 year (or reset on renewal)
revoked_at             -- set only when admin explicitly revokes; null otherwise
```

`EXPIRED` is not something the admin sets directly — it is a **computed state**: whenever access is checked (activation, login, or sync), the server evaluates:

```
effective_status =
    if revoked_at is not null           → REVOKED
    else if now() > access_expiry_at    → EXPIRED
    else                                 → access_status  (normally ACTIVE)
```

This keeps expiry automatic and consistent without a background job needing to sweep the table — the check happens at the moment access actually matters (Section 11 covers the offline case).

### Activation flow

```
Student downloads app (Play Store)
        ↓
App requires: Student ID / PRN + Institute code, entered once
        ↓
POST /auth/activate  { prn, institute_code, device_fingerprint }
        ↓
Spring Boot: student module
        ↓
   Does this PRN exist under this institute?
        │
        ├── NO  → 403, "not a registered student"
        │
        └── YES → compute effective_status (above)
                        │
                        ├── PENDING_APPROVAL → 403, "pending admin approval"
                        ├── REVOKED           → 403, "access revoked, contact institute"
                        ├── EXPIRED           → 403, "access expired, contact institute"
                        │
                        └── ACTIVE → register device (fills MOBILE or
                                      LAPTOP slot per Section 5 of the README)
                                      ↓
                                     Issue access + refresh JWT
                                     (JWT includes access_expiry_at as a claim,
                                      so the client can show "expires on <date>"
                                      without an extra API call)
                                      ↓
                                     App unlocked, offline session begins
```

### Admin actions (React web app)

A simple screen — search/list students by PRN, view status, and four actions:

| Action | Effect |
|---|---|
| **Approve** | First-time approval. Sets `access_status = ACTIVE`, `access_granted_at = now()`, `access_expiry_at = now() + 1 year`, `revoked_at = null` |
| **Renew** | Extends an active or recently-expired student. Sets `access_expiry_at = now() + 1 year`, `revoked_at = null`. Available any time — before or after expiry — so a student doesn't need re-approval from scratch each year, just a renewal click |
| **Revoke** | Immediate cutoff regardless of remaining time. Sets `revoked_at = now()`. Reversible — admin can re-approve/renew later, which clears `revoked_at` |
| **Reject** | For students who never should have been approved (PENDING_APPROVAL → stays rejected, distinct from revoke since there's no prior valid access to speak of) |

This is the entire admin surface for entitlement; it does not need to be more complex than this for V1.

`payment_status` remains a manually-set field for V1 (admin marks paid after receiving payment offline/via whatever channel the institute already uses) — no payment gateway integration in V1. In practice, **Approve** is the action an admin takes once both payment and identity are confirmed; the two checks aren't separate gates in the flow above, they're just admin judgment before clicking Approve.

---

## 8. Mobile Client Architecture (Flutter + Kotlin native module)

### Layering (Clean Architecture, mirrors backend's module boundaries)

```
Presentation   ── Flutter widgets, state management (Riverpod or Bloc)
     │
Domain         ── use cases, entities (pure Dart, no Flutter/platform imports)
     │
Data           ── repositories (implements domain interfaces),
                   local (Drift/SQLite) + remote (REST client) data sources
```

### Where Kotlin comes in
Flutter (Dart) handles UI, navigation, and orchestration. For performance-sensitive **local-only** calculations — precise keystroke timing capture, WPM/accuracy computation during an active typing test — implement a native Kotlin module and call it via a Flutter **Platform Channel** (`MethodChannel`):

```
Flutter (Dart)                     Android (Kotlin)
─────────────                      ─────────────────
TypingTestScreen                   TypingEngine.kt
     │                                    │
     │  MethodChannel("typing_engine")    │
     ├────── keystroke event ────────────►│
     │                                    │  computes timing delta,
     │                                    │  running WPM, accuracy
     │◄───── result stream ───────────────┤
     ▼                                    ▼
UI updates live                    (no network, no DB — pure compute)
```

This keeps sub-millisecond keystroke timing off the Dart VM (which can have GC pauses affecting timing precision) while everything else — navigation, sync, local DB — stays in Dart/Flutter for cross-platform reuse with the Windows client.

### OS-level considerations (Android)
- **Background sync:** use `WorkManager` with a connectivity constraint (`NetworkType.CONNECTED`) to flush the sync outbox when internet becomes available, even if the app isn't in the foreground. This is the correct Android-native mechanism — don't rely on the app being open for sync to happen.
- **Local storage encryption:** Android Keystore for the offline session token; SQLCipher (or Drift's built-in encryption extension) for the local database, since personal devices may be shared within a household (per README Section 8).
- **Battery/Doze mode:** `WorkManager` already respects Doze constraints correctly — don't fight the OS with a foreground service just for sync; sync is not urgent enough to justify the battery cost or the permission friction.

---

## 9. Laptop Client Architecture (Flutter Windows)

Shares the entire Domain and most of the Data layer with the mobile app (this is why both being Flutter matters — one Dart codebase for business logic, two platform-specific presentation/native layers).

### Key difference from Android: background execution
Windows has no `WorkManager` equivalent for a Flutter app that isn't running. Be honest about this constraint rather than assuming parity:
- Sync triggers **only while the app is open**, on a connectivity-change listener (`connectivity_plus` package) plus a periodic timer (e.g., every 2 minutes while foregrounded).
- No true background sync when the app is closed. This is an acceptable tradeoff given laptop usage is already the secondary, lower-volume path (per README Section 1) — don't over-engineer background execution for the minority device.

### Native performance module equivalent
Where Android uses a Kotlin platform channel, Windows can either (a) keep the typing-timing computation in pure Dart — timing precision requirements are the same regardless of platform, and Windows doesn't have Dart-VM GC pauses that are as disruptive as Android's, so pure Dart is likely sufficient here — or (b) use a small C++ platform channel only if profiling later shows a real problem. **Default to pure Dart for Windows; don't build a native module speculatively.**

---

## 9.5 Client Replaceability — Designing So a Future Swap Doesn't Break the System

You asked specifically: if the Flutter Windows laptop client is replaced with React later, how do we make sure nothing else breaks? The honest answer is that **the client's implementation language was never the real module boundary — the REST API contract is.** The backend already doesn't know or care whether a request came from Flutter, React, or anything else. This section makes that boundary explicit and enforced, so it stays true as the system grows, instead of being true by accident.

### The actual seam: the API contract, not the codebase

```
┌────────────────────┐        ┌────────────────────┐
│  ANY CLIENT         │        │  BACKEND            │
│  (Flutter Windows,  │        │  (Spring Boot)       │
│   React, future     │───────►│                      │
│   native app, etc.) │  REST  │  Doesn't know or care │
│                     │◄───────│  what the client is  │
└────────────────────┘        └────────────────────┘
        implements                    exposes
     the contract below           the contract below
```

A client is "replaceable" exactly to the degree that it only depends on:
1. The **versioned REST endpoints** (`/api/v1/...`) and their request/response DTO shapes
2. The **sync contract** (Section 7 of the original README / Section 11 below): client-generated `client_event_id` UUIDs, `PENDING → SYNCING → ACK'd → SYNCED` lifecycle, idempotent POST semantics
3. The **auth contract**: activation flow (Section 7 above), access + refresh JWT, `access_expiry_at` claim

None of these three things mention Flutter anywhere. That's intentional and is what makes the swap safe *if you don't let it drift*.

### How to keep it safe — three concrete practices

**1. Treat the OpenAPI spec as the source of truth, not the code.**
Maintain `/api-contract/openapi.yaml` describing every endpoint, DTO, and status code. Generate the Spring Boot controller stubs and any client-side API bindings from it (springdoc-openapi on the backend; openapi-generator for whichever client). When Flutter Windows is retired, the React client is generated against the exact same spec — there is no re-interpretation, no "what did the old client actually expect" archaeology.

**2. Version the API and never break a version in place.**
```
/api/v1/sync         ← Flutter Windows client uses this, unchanged, forever
/api/v2/sync         ← only created if a genuinely breaking change is needed
```
If React needs something v1 doesn't support, add it as an additive, backward-compatible change to v1 first (new optional field, new endpoint) — this covers the vast majority of real cases. Only bump to v2 for a true breaking change, and keep v1 alive until every client in the field has migrated off it. This means you can develop and roll out the React client **before** decommissioning Flutter Windows, with both running against the same backend simultaneously during transition — nobody's laptop breaks on cutover day.

**3. Never branch backend logic on client type.**
Do not write code like `if (request.clientType == "flutter_windows")`. If a business rule seems to depend on which client is calling, it usually means the rule actually depends on `device_type` (`MOBILE`/`LAPTOP`, already a data field per Section 5) or a capability flag, not the client's implementation technology. Keep it that way — it's what makes the backend genuinely indifferent to what replaces Flutter Windows.

### One important caution specific to this swap

Section 1 ruled out a browser-only PWA for the laptop client specifically because personal laptops have unreliable internet, and a browser PWA can't reliably guarantee offline-first behavior. **If "switch to React" means a React web app in a browser, that reintroduces the exact problem Section 1 avoided.** If the goal is React for developer-experience reasons while keeping offline-first intact, the correct target is **React inside a desktop shell (Electron or Tauri)** with a real local database (SQLite via `better-sqlite3`, or IndexedDB with a sync-outbox wrapper) — not a plain browser tab. Flag this decision explicitly whenever the swap actually happens; it's a product requirement, not just an implementation detail.

### General principle: the same rule applies to any module, not just this one

This is really the same loose-coupling rule from Section 2, applied to the client boundary instead of a backend module boundary. Whenever you replace **any** module — backend or client — follow this sequence:

```
1. Identify the interface/contract the module exposes
   (a service interface for backend modules, the REST+sync contract for clients)
2. Confirm nothing depends on the module's internals — only on that contract
3. Build the replacement behind the same contract
4. Run both side by side if possible (e.g. v1 API serving both old and new client)
5. Cut over
6. Remove the old implementation only after the cutover is confirmed stable
```

Because the backend modules (Section 6) already only expose service interfaces to each other, and clients already only depend on the versioned REST contract, this sequence works the same way whether you're swapping the laptop client, replacing the notification module's FCM implementation, or eventually re-platforming the admin web app.



Follow in this exact order. Each module should be functionally complete (entity, repository, service, controller, tests) before moving to the next, since later modules depend on earlier ones' service interfaces.

```
[ ] 0. Foundation
      - Spring Boot project skeleton, PostgreSQL connection, Flyway/Liquibase migrations
      - Servlet Filter chain skeleton (CorrelationId, empty Jwt/Tenant filters)
      - Docker Compose (app + Postgres), Nginx, Let's Encrypt on VPS

[ ] 1. institute module
      - institutes table, subscription_status field
      - Single seed row for pilot institute

[ ] 2. auth module
      - users table, Argon2id/BCrypt hashing
      - JWT issuance (access + refresh), TenantContextFilter now reads real claims
      - Login, refresh, logout endpoints

[ ] 3. student module
      - students table (PRN, approval_status, payment_status)
      - Admin-facing list/search/approve endpoints (backs the React admin screen)

[ ] 4. teacher module
      - teachers table, linked to auth/users

[ ] 5. device module
      - devices table, MOBILE/LAPTOP slot enforcement, ACTIVE/REVOKED states
      - /auth/activate endpoint (Section 7 flow) — depends on student + auth

[ ] 6. question module
      - questions (MCQ), typing_passages, explanations
      - Admin/content-seeding endpoints (can be simple CSV import for V1)

[ ] 7. assessment module
      - tests, test_questions
      - ScoringStrategy interface + MCQScoring + TypingScoring implementations

[ ] 8. attempt module
      - attempts, answers, typing_sessions
      - client_event_id (UUID) field present from the start (needed by sync)

[ ] 9. sync module
      - sync_records, idempotent /sync endpoint
      - PENDING → SYNCING → ACK'd → SYNCED lifecycle enforced server-side

[ ] 10. attendance module
      - attendance table, simple check-in on first activity per day

[ ] 11. admin orchestration
      - Approve/renew/revoke/reject flows wired to student + device modules
        (Section 7: access_status, access_granted_at, access_expiry_at, revoked_at)
      - Revocation/expiry-takes-effect-on-next-sync logic (checked in sync
        module, not device module, since that's where an offline device next
        talks to the server). Every /sync request re-evaluates effective_status
        (Section 7) for the calling student before accepting the payload —
        a REVOKED or EXPIRED student's queued offline results still get
        synced/saved (they earned that data honestly), but no further
        attempts are accepted until the admin renews or re-approves

[ ] 12. teacherportal module
      - Wrong-answer analysis queries (read-heavy, joins attempt + question)
      - Test history by student

[ ] 13. notification module
      - FCM integration, triggered on approval/suspension events

[ ] 14. React admin/teacher web app
      - Login, student approval screen, device status, teacher analysis views
      - Calls the REST API built above — no new backend logic introduced here

[ ] 15. Flutter Android app
      - Domain + Data layers (shared with Windows client later)
      - Presentation: login/activation, practice screens, sync status indicator
      - Kotlin platform channel for typing engine

[ ] 16. Pilot testing (mobile only)

[ ] 17. Flutter Windows app
      - Reuse Domain + Data layers from step 15
      - Windows-specific presentation + connectivity-based sync triggering
```

Each numbered step should end with a working, testable slice — not a partial module. Don't start step N+1 until step N's service interface is stable, since everything downstream depends on it.

---

## 11. Quiz / Assessment Logic — Detail

```
ScoringStrategy (interface)
     ├── MCQScoringStrategy      -- correct/incorrect against answer key,
     │                              returns score + list of wrong question IDs
     └── TypingScoringStrategy   -- WPM, accuracy%, error count from
                                     Kotlin-computed raw keystroke data
```

On attempt submission:
```
Client submits attempt (with client_event_id UUID)
        ↓
attempt module: persist attempt + answers locally first (already synced
by the time this runs server-side; local persistence happens on-device
before sync per Section 8/9)
        ↓
Server (on sync): idempotency check via client_event_id
        ↓
   New?  → run ScoringStrategy → persist score, wrong_question_ids
   Dup?  → return prior result, no recompute
        ↓
teacherportal module later reads: attempt → wrong_question_ids → question.explanation
                                    (stored explanation, no AI call — per README)
```

---

## 12. Future AWS Migration Path (not built now — mapping only)

Do not provision any of this in V1. This section exists so the eventual migration is a mapping exercise, not a redesign, because the monolith's module boundaries and the Servlet filter chain already isolate the pieces that would move.

| Current (single VPS) | AWS equivalent (when migration triggers are met) |
|---|---|
| Spring Boot on VPS, Docker Compose | ECS (Fargate) or Elastic Beanstalk running the same container image |
| PostgreSQL on VPS | RDS for PostgreSQL (same schema, no code change) |
| Nginx reverse proxy | ALB (Application Load Balancer) |
| Let's Encrypt | ACM (Certificate Manager) |
| Cloudflare DNS | Route 53 (or keep Cloudflare in front of ALB) |
| R2/VPS snapshots | S3 (+ lifecycle rules for backup retention) |
| Firebase FCM | Unchanged — FCM is independent of hosting |
| Single-server rate limiting | API Gateway or WAF rate rules, if needed |

**Migration triggers** (don't move until at least one is true — matches the cost discipline established throughout this project):
- Sustained VPS CPU/RAM above ~70% at peak for multiple weeks running
- More than ~10–15 institutes onboarded (if B2B resumes) with real concurrent load
- A specific institute contractually requires AWS-hosted infrastructure (data residency, uptime SLA)
- Sync volume genuinely saturates a single Postgres instance (rare before very large scale)

Because tenant isolation, module boundaries, and the idempotent sync design are already correct from V1, this migration is infrastructure-only — no application code changes to business logic are anticipated.

---

## 13. Summary of What This Document Enforces

- **Loose coupling:** modules communicate only via public service interfaces; repositories are module-private; tenant filtering is automatic via Hibernate `@Filter`, not manually repeated per query.
- **High cohesion:** package-by-feature, one facade service per module, domain rules live on entities where they belong.
- **Servlet usage:** explicit, idiomatic — Filters for auth/tenant/rate-limiting, not a redundant hand-rolled layer under Spring MVC.
- **Offline-first correctness:** identical domain/data layer shared between Android and Windows Flutter clients; native Kotlin only where Dart's timing precision is genuinely insufficient.
- **Entitlement control:** download-then-activate flow ensures Play Store install alone never grants access.
- **Scaling posture:** AWS mapping is ready but deliberately not built until a real trigger is hit — this document's own migration table is a boundary condition, not an assumption.
- **Client replaceability:** clients (mobile, laptop, web) depend only on the versioned REST + sync contract, never on backend internals or each other — the laptop client's implementation language (Flutter Windows today, possibly React/Electron later) can change without touching backend code, as long as the contract in Section 9.5 is respected.
