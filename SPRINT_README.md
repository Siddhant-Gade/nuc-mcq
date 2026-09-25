# SPRINT PROCESS — Reference Document

**This document governs how sprints are planned, delegated, implemented, and reviewed for this project.**
It is a process contract, not architecture — the architecture itself lives in `system_design.md`, which remains the single source of truth. If anything here ever appears to conflict with `system_design.md`, `system_design.md` wins, and the conflict must be raised explicitly (see "Conflict Handling" below) rather than silently resolved either way.

Read this file at the start of every sprint-planning or sprint-review session, before opening `system_design.md`.

---

## 1. Roles

| Role | Responsibility |
|---|---|
| **Claude** | Architecture, sprint planning, code review, security review, requirement validation. Not the implementation agent. |
| **OpenCode coding models** | Implementation, debugging, test generation, per the model routing table below. |

Claude's job is: **PLAN → DELEGATE → VERIFY → REVIEW.** Claude does not generate implementation code unless explicitly asked to, does not redesign the architecture unless a conflict is found and explicitly raised, and does not expand sprint scope.

---

## 2. Source of Truth

`system_design.md` is the primary architectural source of truth.

Before planning or reviewing any sprint:
1. Read the relevant section(s) of `system_design.md`.
2. Identify the current development phase (see Section 4 below).
3. Identify dependencies on previously completed sprints (see Section 9, Sprint Log).
4. Do not silently redesign the architecture.
5. Do not introduce technology not justified by an actual requirement.

### Conflict handling

If a new requirement conflicts with `system_design.md`:
- Clearly identify the conflict.
- Explain the impact.
- Propose the smallest reasonable change.
- Do not silently modify the architecture. `system_design.md` is only updated after the conflict and proposed change are explicitly surfaced and agreed.

---

## 3. Development Philosophy

```
Small Sprint
    ↓
Small Feature
    ↓
Precise Tasks
    ↓
Implementation
    ↓
Automated Tests
    ↓
Manual Verification
    ↓
Architecture Review
    ↓
Git Commit
    ↓
Next Sprint
```

Rules:
- Every sprint must produce a working, testable increment.
- Do not build the entire application structure in advance.
- Do not create unused infrastructure.
- Do not implement future features before they are needed.
- Prefer vertical slices (Frontend → API → Business Logic → Database → Tests) for feature work. Foundation/infrastructure sprints (e.g., Sprint 1) are a deliberate, narrow exception — they exist to make the first real vertical slice possible, and must stay minimal for exactly that reason.

---

## 4. Development Order (Phases)

```
PHASE 1  Admin + Backend + Supabase Foundation
PHASE 2  Student Mobile Application
PHASE 3  Teacher Module
PHASE 4  Integration + Security + Production Readiness
```

The admin and authorization foundation must exist before student test functionality is built. This order may only change via an explicit, approved requirement change — never silently.

---

## 5. Core Architectural Rules (do not violate without approval)

Architecture shape:

```
Flutter → Spring Boot → Supabase
```

**Do not introduce**, unless explicitly required and approved in `system_design.md`:
- Microservices
- Kafka / RabbitMQ / any message queue
- Redis
- Kubernetes
- Separate analytics infrastructure
- Custom DRM or question-bank encryption
- Dynamic question-bank download/streaming infrastructure

The architecture must remain right-sized for: a solo developer, a single institute, a V1 deployment, and cost-efficient operation. See `system_design.md` Section 21 ("Explicitly Removed / Not Built in V1") for the authoritative, full list.

### Question bank rule (recap of `system_design.md` Section 9)

The question bank is bundled inside the Flutter application. Do not create question download APIs, question streaming, question DRM, remote decryption systems, or a question-bank CDN. Question-bank version tracking follows `system_design.md` Section 9.5 exactly. The one narrow, approved exception is the `question_content` single-question teacher-lookup endpoint (Section 19.1) — this is not a reopening of the removed bulk-distribution design and must not be expanded beyond a single-question authenticated read.

### Offline-first rule (recap of `system_design.md` Sections 5 & 13)

For all student test functionality:

```
Test Completed
    ↓
Always Save Locally First
    ↓
sync_status = PENDING
    ↓
Show Result
    ↓
Synchronize Later
```

**Prohibited pattern:**
```
IF INTERNET AVAILABLE
    Save remotely
ELSE
    Save locally
```

Synchronization must:
- Never delete local data before server confirmation.
- Use idempotency protection (`client_event_id`).
- Prevent duplicate server records.
- Retry safely with capped backoff (Section 13.3).
- Handle application restart.
- Handle network interruption without data loss (Section 13.2 — sync failure safety rule).

### Data minimization rule (recap of Section 11)

Do not store unnecessary test-interaction data. Store only the compact `test_result` model approved in `system_design.md`. Do not introduce one database row per question answer unless a future requirement explicitly justifies it and the architecture is updated accordingly first.

---

## 6. AI Implementation Model Strategy

Model routing is maintained in `models_to_use.txt` at the project root — check that file for the current list, since available models change over time. As of this writing:

| Task | First Choice | Alternative |
|---|---|---|
| Frontend React | Qwen Coder | Kimi / GLM coding model |
| Flutter | Qwen Coder | GLM coding model |
| Spring Boot | DeepSeek reasoning/coding | Qwen Coder |
| SQL / PostgreSQL | DeepSeek | Qwen Coder |
| Testing | A different model from implementation | GLM / Kimi / Qwen |
| Debugging | DeepSeek | GLM |
| Large refactoring | Claude review + strong coding model | Kimi |
| Architecture | Claude | — |
| Security / architecture review | Claude | — |

Do not depend on any one specific provider or model being permanently available — treat this table as guidance, not a hard binding, and re-check `models_to_use.txt` if a listed model is unavailable.

---

## 7. Sprint Planning Rule

Never generate a vague instruction such as "Implement Sprint N." Every sprint is broken into small, sequential, independently implementable and reviewable tasks (e.g., migration → entity → repository → service → controller → frontend integration → tests → manual verification).

### Task size rule

A task must be small enough that a coding agent can implement it without redesigning unrelated parts of the system. Prefer 5–8 narrow tasks over 1–2 broad ones.

---

## 8. Required Output Format for Every Sprint

Every sprint plan must include all of the following sections, in this order:

1. **Sprint Goal** — one concise sentence describing what must work after the sprint.
2. **User-Visible Outcome** — what the developer can actually demonstrate.
3. **Sprint Scope** — Frontend / Backend / Database / Supabase / Testing, explicitly listed.
4. **Explicit Non-Goals** — mandatory; prevents scope expansion by coding agents.
5. **Dependencies** — required previous sprints, existing APIs/tables/config. If a dependency is missing, stop and report it — never invent a workaround.
6. **Implementation Tasks** — each task includes: Task Number, Task Name, Purpose, Files/Modules Expected to Change, Technology Involved, Recommended Model Type, Implementation Instructions, Acceptance Criteria.
7. **Database Changes** — tables, columns, indexes, constraints, migrations. If none, explicitly state "NO DATABASE CHANGE REQUIRED." All schema changes are migration-based, always — no manual production schema edits, ever.
8. **API Contract** — per endpoint: method, path, purpose, authn/authz requirement, request body, validation rules, success response, failure responses. No ambiguity permitted.
9. **Frontend Contract** — per screen/component: purpose, inputs, API dependencies, loading/error/success/empty states. No polish beyond what the sprint requires.
10. **Backend Contract** — controller/service/repository/validation/authorization responsibilities, explicitly separated. No business logic in controllers.
11. **Security Requirements** — authn, authz, input validation, file validation, data exposure risks, secret handling — scoped to what this sprint actually touches, not generic enterprise boilerplate.
12. **Automated Tests** — unit, integration, edge cases, negative tests, critical failure scenarios (duplicate request, invalid payload, unauthorized request, DB failure, network failure) as relevant to the sprint.
13. **Manual Verification Checklist** — exact, executable steps, no interpretation required.
14. **Definition of Done** — feature works, tests pass, manual verification passes, no architecture violations, no committed secrets, docs updated, review completed.
15. **Git Commit Boundary** — suggested logical commit sequence; never one giant commit per sprint.

---

## 9. Sprint Log (living tracker — update after every sprint)

| Sprint | Name | Phase | Status | Notes |
|---|---|---|---|---|
| 1 | Project Foundation & Environment Setup | Phase 1 | **In Progress** | Decisions locked: Maven, Java 21, Supabase DEV project exists, dev/prod environment separation confirmed as required. Supabase PROD project not yet confirmed to exist — non-blocking for Tasks 1–2 (profile skeleton only requires prod *config shape*, not live prod credentials); must be resolved before Sprint 30+ (production hardening) per system_design.md Section 30. Task 1 delegated below. |

> Update this table (status + one-line notes) at the end of every sprint review, before starting the next sprint's planning. Never start planning Sprint N+1 until Sprint N's row says **Done**.

### Sprint status values
- `Planned` — task list written, not yet started.
- `In Progress` — at least one task implemented, sprint not yet reviewed complete.
- `Blocked` — cannot proceed; blocker must be named in Notes.
- `In Review` — implementation complete, undergoing Code Review Mode (Section 10 below).
- `Done` — Definition of Done fully met, committed, architecture review passed.

---

## 10. Code Review Mode

After any sprint's implementation is submitted, review against this checklist and classify every finding as **BLOCKER / HIGH / MEDIUM / LOW / SUGGESTION**:

1. Does the implementation satisfy the sprint's stated requirement — no more, no less?
2. Does it follow `system_design.md`?
3. Did the coding model introduce unnecessary abstractions?
4. Did it introduce unauthorized dependencies (see Section 5's "do not introduce" list)?
5. Did it introduce security issues?
6. Are all database changes migration-based?
7. Is business logic in the correct layer (never in controllers)?
8. Are offline-first rules respected (Section 5 recap above)?
9. Are the tests meaningful, not superficial?
10. Is there scope creep beyond the sprint's Explicit Non-Goals list?

Do not request refactors for stylistic preference alone. Priority order when findings conflict: **Correctness > Security > Maintainability > Architecture compliance.**

---

## 11. Response Behavior (standing rules for every sprint session)

- Be decisive.
- Do not redesign the architecture unless a real conflict is found and explicitly raised.
- Do not expand scope beyond what the current sprint's goal requires.
- Do not generate implementation code unless explicitly requested — default mode is PLAN/REVIEW, not IMPLEMENT.
- Always check the Sprint Log (Section 9) before proposing the next sprint, and update it after reviewing the current one.

---

## 12. Full Sprint 1 Plan (reference copy)

The complete Sprint 1 plan ("Project Foundation & Environment Setup") was generated in full using the format in Section 8 above. Rather than duplicating ~500 lines here, this file tracks its **status** (Section 9) and its **key decisions**, so future sessions have the essential context without needing the entire conversation history:

**Sprint 1 key decisions to preserve:**
- Health endpoint: `GET /api/v1/health` → `{ "status": "UP", "database": "UP" | "DOWN" }`, public, no auth.
- Spring profiles: `dev` and `prod`, credentials via environment variables only, never committed.
- Flyway baseline migration: `V1__baseline.sql`, trivial/empty — no business tables yet.
- Module package skeleton created empty, matching `system_design.md` Section 6's module map exactly (`auth`, `institute`, `batch`, `student`, `studentaccess`, `content`, `result`, `sync`, `progress`, `teacherportal`, `admin`, `announcement`, `notification`, `export`).
- Swagger/OpenAPI UI enabled in `dev`, disabled in `prod`.
- Explicit non-goals: no Supabase Auth yet, no business modules yet, no frontend yet, no CI/CD yet, no Docker yet.
- Open blockers before implementation can start: Maven vs. Gradle, Java version, and confirmation that dev + prod Supabase projects exist.

If the full Sprint 1 task-by-task plan is needed again in a future session, request it regenerated from `system_design.md` Section 30 (Build Order, Step 1) plus this file's "key decisions" — it is fully reproducible from those two sources.
