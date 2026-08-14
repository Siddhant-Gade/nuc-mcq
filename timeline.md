# 🗓️ Project Timeline — MSCIT Typing & Skill Assessment Platform
**Team Size:** 3 Developers (Dev A · Dev B · Dev C)  
**Start Date:** 2026-08-14  
**First Deliverable (Demo-able App):** 2026-08-21 (end of Sprint 1)  
**Methodology:** Agile — 1-week sprints, daily standups, end-of-sprint demo + retrospective

---

## 👥 Developer Role Assignments

| Developer | Primary Domain | Secondary Domain |
|---|---|---|
| **Dev A** | Backend (Spring Boot) — Foundation, Auth, Student, Device | DevOps (Docker, VPS, CI/CD) |
| **Dev B** | Backend (Spring Boot) — Assessment, Attempt, Sync, TeacherPortal | Backend QA + OpenAPI spec |
| **Dev C** | Frontend — React Admin Web App + Flutter Android App | Flutter Windows App |

> **Note:** Role boundaries are soft — any dev can pick up unblocked tasks from another lane when their own lane stalls. Update the daily standup board when you do this.

---

## 🏁 Sprint 0 — Pre-Sprint Setup (Day 1–2: Aug 14–15)

> **Goal:** Every dev has a running local environment and commits to `main` by Aug 15 EOD. No features — just scaffolding and tooling alignment.

| Task | Owner | Acceptance Criteria |
|---|---|---|
| Create GitHub repo, branch strategy (`main` protected, feature branches, PRs required) | Dev A | Repo live, branch rules set |
| Spring Boot project skeleton (Web, JPA, Security, Actuator, Validation) | Dev A | `mvn spring-boot:run` starts on port 8080 |
| PostgreSQL + Docker Compose setup (app + postgres containers) | Dev A | `docker compose up` starts both; `/actuator/health` returns 200 |
| Flyway migration setup + first V1 migration (empty baseline) | Dev A | Migration runs cleanly on fresh DB |
| Servlet Filter chain skeleton (CorrelationIdFilter, stub JwtFilter, stub TenantFilter, stub RateLimitFilter) | Dev A | Filters registered; request logs show correlation IDs |
| OpenAPI / springdoc-openapi baseline (`/api-docs` endpoint live) | Dev B | Swagger UI accessible at `/swagger-ui.html` |
| Document Hibernate `@Filter` tenant isolation pattern with a code example | Dev B | `TENANT_ISOLATION.md` committed |
| React admin app scaffolding (Vite + React + React Router + Axios service layer) | Dev C | `npm run dev` starts; blank home page renders |
| Flutter Android project scaffold (Riverpod, Drift/SQLite, Dio HTTP client) | Dev C | App compiles, blank screen runs on emulator |
| Agree on: PR template, commit convention (Conventional Commits), `.env.example` | All | Files committed to repo |

---

## 🚀 Sprint 1 — First Deliverable (Aug 17–21) ★

> **Goal:** A working end-to-end slice — an admin logs into the React web app, views students, and a student can activate the Flutter app. Backend deployed to VPS over HTTPS.  
> **Demo:** Friday Aug 21 — show this flow live.

### Backend — Dev A

| # | Task | Module | Acceptance Criteria |
|---|---|---|---|
| 1 | `institute` entity + repository + service + Flyway migration | `institute` | Table exists; seed row for pilot institute inserts on startup |
| 2 | `auth` — `users` table, Argon2id/BCrypt hashing, login endpoint | `auth` | `POST /api/v1/auth/login` returns access + refresh JWT |
| 3 | JWT issuance with `institute_id` claim; `JwtAuthenticationFilter` reads real claims | `auth` | Authenticated requests populate `SecurityContext`; unauthenticated get 401 |
| 4 | `TenantContextFilter` reads `institute_id` from JWT, binds to `TenantContext` | `auth` | Every downstream query auto-scopes to tenant |
| 5 | `student` — `students` table (PRN, `access_status`, `access_granted_at`, `access_expiry_at`, `revoked_at`) + Flyway | `student` | Migration runs cleanly |
| 6 | Admin student endpoints: create student, list/search by PRN, get by ID | `student` | Endpoints respond correctly; Postman collection committed |
| 7 | Deploy to VPS: Docker Compose + Nginx + Let's Encrypt | DevOps | HTTPS live at domain; `/actuator/health` returns 200 from internet |

### Backend — Dev B

| # | Task | Module | Acceptance Criteria |
|---|---|---|---|
| 1 | `device` — devices table (MOBILE/LAPTOP slots, ACTIVE/REVOKED states), Flyway migration | `device` | Migration runs |
| 2 | `POST /api/v1/auth/activate` — full entitlement flow (PRN + institute_code + fingerprint → status check → device slot → JWT) | `device` + `student` | All 5 status paths (not found, PENDING, REVOKED, EXPIRED, ACTIVE) return correct HTTP codes |
| 3 | `RateLimitFilter` — basic in-memory per-IP limiting on `/auth/**` and `/sync` | `auth` | Rapid-fire requests receive 429 |
| 4 | Integration tests for activate endpoint (happy path + all rejection paths) | `device` | Tests pass in CI |
| 5 | OpenAPI spec updated with all Sprint 1 endpoints; generate client stubs for React | All | `openapi.yaml` committed; React API service stubs generated |

### Frontend — Dev C

| # | Task | Component | Acceptance Criteria |
|---|---|---|---|
| 1 | React: Login page → `POST /api/v1/auth/login` → store JWT in memory | React Admin | Admin can log in |
| 2 | React: Student list page — search by PRN, paginated table, status badge | React Admin | Page loads data from live API |
| 3 | React: Student detail page — Approve / Reject / Revoke / Renew buttons (stub wiring, real in Sprint 2) | React Admin | Buttons render; toast on click |
| 4 | Flutter: Activation screen — PRN + institute code form → `POST /auth/activate` → store JWT in Android Keystore | Flutter Android | Student can activate on emulator against VPS |
| 5 | Flutter: Home screen — shows student name + access expiry date from JWT claim | Flutter Android | Correct name + date displayed |

### Sprint 1 — Definition of Done ✅

- [ ] Admin logs into React web app hitting the live VPS over HTTPS
- [ ] Admin sees and searches the student list
- [ ] Student enters PRN + institute code in Flutter app and activates
- [ ] App shows student name and expiry date after activation
- [ ] All code merged via reviewed PRs
- [ ] CI pipeline runs on every PR (build + tests green)

---

## 🔧 Sprint 2 — Entitlement Controls + Assessment Foundation (Aug 24–28)

> **Goal:** Admin fully manages student access. Question bank and assessment structure exist. Flutter caches content offline.

### Backend — Dev A

| # | Task | Module |
|---|---|---|
| 1 | Admin entitlement actions: Approve, Reject, Revoke, Renew — full `access_status` state machine | `admin` / `student` |
| 2 | `effective_status` computed at request time (revoked_at + expiry check) — used in `/auth/activate` and `/sync` | `student` |
| 3 | `teacher` module — teachers table, teacher login, link to `users` | `teacher` |
| 4 | `question` module — MCQ questions table, `typing_passages` table, explanations field | `question` |
| 5 | Question admin endpoints: seed via CSV import for V1 | `question` |

### Backend — Dev B

| # | Task | Module |
|---|---|---|
| 1 | `assessment` module — `tests`, `test_questions` tables; `ScoringStrategy` interface + `MCQScoringStrategy` + `TypingScoringStrategy` stubs | `assessment` |
| 2 | Assessment admin endpoints: create test, assign questions to test | `assessment` |
| 3 | `attempt` module — `attempts`, `answers`, `typing_sessions` tables; `client_event_id` UUID field from day 1 | `attempt` |
| 4 | Integration tests for all Sprint 2 endpoints | All |
| 5 | OpenAPI spec updated; regenerate client stubs | All |

### Frontend — Dev C

| # | Task | Component |
|---|---|---|
| 1 | React: wire Approve/Reject/Revoke/Renew to real API; optimistic UI + toast feedback | React Admin |
| 2 | React: Device status panel on student detail page (slots occupied, fingerprint, last seen) | React Admin |
| 3 | Flutter: persist student profile + JWT to Drift local DB (SQLCipher encrypted) on activation | Flutter Android |
| 4 | Flutter: Practice screen — fetch test list from API, cache locally in Drift | Flutter Android |
| 5 | Flutter: MCQ test flow — display questions, record answers locally, mark attempt complete | Flutter Android |

### Sprint 2 — Definition of Done ✅

- [ ] Admin can approve/reject/revoke/renew students from React UI (changes persist)
- [ ] Test list visible in Flutter app (from local cache)
- [ ] Student completes an MCQ test; attempt stored in Drift DB
- [ ] Sprint 2 backend endpoints pass integration tests

---

## ⌨️ Sprint 3 — Typing Engine + Sync Pipeline + Scoring (Aug 31–Sep 4)

> **Goal:** Typing test runs natively on Android. Offline attempts sync to server and get scored.

### Backend — Dev A

| # | Task | Module |
|---|---|---|
| 1 | `sync` module — `sync_records` table, `POST /api/v1/sync` endpoint | `sync` |
| 2 | Idempotency check via `client_event_id` (new vs. duplicate detection) | `sync` |
| 3 | Re-evaluate `effective_status` on every sync request before accepting payload | `sync` + `student` |
| 4 | `PENDING → SYNCING → ACK'd → SYNCED` lifecycle enforced server-side | `sync` |
| 5 | `attendance` module — auto check-in on first activity per day | `attendance` |

### Backend — Dev B

| # | Task | Module |
|---|---|---|
| 1 | Wire `ScoringStrategy` into sync pipeline — run `score()` on new attempt ingestion | `attempt` + `assessment` |
| 2 | `TypingScoringStrategy` — WPM, accuracy%, error count from raw keystroke data | `assessment` |
| 3 | `MCQScoringStrategy` — total score + list of wrong question IDs | `assessment` |
| 4 | `teacherportal` module (read-only) — test history by student, wrong-answer analysis (attempt → wrong_question_ids → question.explanation) | `teacherportal` |
| 5 | Add indexes: `attempts(student_id, assessment_id)`, `sync_records(client_event_id)` | DB |

### Frontend — Dev C

| # | Task | Component |
|---|---|---|
| 1 | Flutter: `TypingEngine.kt` — Kotlin native module for keystroke timing capture + live WPM/accuracy | Flutter Android (Kotlin) |
| 2 | Flutter: Typing test screen — integrates `TypingEngine` via `MethodChannel("typing_engine")`; live WPM + accuracy display | Flutter Android |
| 3 | Flutter: WorkManager sync job with `NetworkType.CONNECTED` — flushes PENDING attempts when online (background-capable) | Flutter Android |
| 4 | Flutter: Sync status indicator on home screen (last synced, pending count) | Flutter Android |
| 5 | React: Teacher analysis view — wrong-answer breakdown table per test per student | React Admin |

### Sprint 3 — Definition of Done ✅

- [ ] Student completes typing test on Android; WPM/accuracy computed natively by Kotlin engine
- [ ] Offline attempts sync to server when internet becomes available (app may be backgrounded)
- [ ] Server rejects duplicate sync payloads (idempotency test passes)
- [ ] Teacher sees wrong-answer breakdown in React app
- [ ] Revoked/expired student's sync is accepted but no new attempts are allowed

---

## 🪟 Sprint 4 — Flutter Windows + Notifications + Pilot-Ready Hardening (Sep 7–11)

> **Goal:** Laptop client works end-to-end. Push notifications live. System is production-pilotable.

### Backend — Dev A

| # | Task | Module |
|---|---|---|
| 1 | `notification` module — FCM integration, triggered on Approve/Revoke events | `notification` |
| 2 | Admin API: force-revoke a specific device slot | `device` |
| 3 | Security hardening: input validation on all endpoints; structured JSON error responses (no 500 HTML pages) | All |
| 4 | Smoke load test (locust or k6) — confirm VPS handles expected concurrent load | DevOps |

### Backend — Dev B

| # | Task | Module |
|---|---|---|
| 1 | OpenAPI spec v1 finalized — every endpoint documented; generate final client stubs | All |
| 2 | End-to-end integration test: attempt → sync → score → teacherportal read | All |
| 3 | Automated PostgreSQL backup to Cloudflare R2 (or VPS snapshots); restore drill | DevOps |

### Frontend — Dev C

| # | Task | Component |
|---|---|---|
| 1 | Flutter Windows: scaffold app reusing Domain + Data layers from Android | Flutter Windows |
| 2 | Flutter Windows: connectivity-based sync trigger (`connectivity_plus` + 2-minute periodic timer while foregrounded) | Flutter Windows |
| 3 | Flutter Windows: typing timing in pure Dart (no native channel needed per SYSTEM_DESIGN §9) | Flutter Windows |
| 4 | Flutter Android: FCM token registration on activation; receive + display push notifications | Flutter Android |
| 5 | React: Admin dashboard home — pending approvals count, expiry-soon alerts, recent activity | React Admin |

### Sprint 4 — Definition of Done ✅

- [ ] Flutter Windows app activates, takes MCQ + typing tests, syncs to server
- [ ] Admin approving a student triggers FCM push notification on student's Android device
- [ ] No endpoint returns unstructured 500; all errors are structured JSON
- [ ] Automated DB backup runs and restores successfully in test
- [ ] Full end-to-end flow (teacher manages → student activates → tests → syncs → teacher reviews) works on both Android + Windows

---

## 🧪 Sprint 5 — Pilot Testing + Bug Fixes (Sep 14–18)

> **Goal:** Real-world pilot with actual students at one institute. No new features — collect and fix real bugs.

| Task | Owner |
|---|---|
| Deploy to pilot institute: onboard 1 teacher account, seed questions/tests via CSV | Dev A |
| Monitor VPS metrics during pilot (CPU, RAM, DB connections, error rate) | Dev A |
| Collect and triage crash reports from pilot Flutter app; fix P0/P1 bugs and redeploy | Dev C |
| React admin UX polish from teacher feedback (filters, sorting, export) | Dev C |
| Verify sync idempotency in real-world conditions (intermittent mobile data, mid-sync disconnect) | Dev B |
| Fix any scoring bugs surfaced during pilot | Dev B |
| Security audit pass: verify every new endpoint enforces tenant isolation | All |

### Sprint 5 — Definition of Done ✅

- [ ] Pilot completed without data loss
- [ ] P0 bugs (crash, wrong score, data loss) fixed and deployed within sprint
- [ ] Teacher can view/export student performance summary
- [ ] All known P1 bugs triaged with owners assigned

---

## 📦 Sprint 6 — Windows Polish + Documentation + v1.0.0 (Sep 21–25)

> **Goal:** Windows client at feature parity with Android. Docs complete. Tag `v1.0.0`.

| Task | Owner |
|---|---|
| Flutter Windows: UI polish (window sizing, keyboard shortcuts, Windows-specific UX) | Dev C |
| Flutter Windows: graceful offline-at-launch (show cached tests; show "offline" banner) | Dev C |
| Backend: address any remaining endpoint gaps from pilot feedback | Dev A / Dev B |
| Write `RUNBOOK.md` (how to deploy, rotate secrets, add institute, restore from backup) | Dev A |
| Write `DEVELOPER_GUIDE.md` (module map, how to add a module, filter chain, OpenAPI workflow) | Dev B |
| Final regression test pass across all features | All |
| Tag `v1.0.0` release on GitHub; archive sprint boards | All |

---

## 📅 Timeline at a Glance

```
Week    Dates            Sprint       Key Deliverable
─────────────────────────────────────────────────────────────────────────────────────
W1      Aug 14–15        Sprint 0     Scaffolding + tooling + all devs running locally
W1      Aug 17–21        Sprint 1 ★   Admin login + student list + Flutter activation (FIRST DEMO)
W2      Aug 24–28        Sprint 2     Entitlement controls + MCQ flow + offline cache
W3      Aug 31–Sep 4     Sprint 3     Typing engine (Kotlin) + sync pipeline + scoring
W4      Sep 7–11         Sprint 4     Flutter Windows + FCM + pilot-ready
W5      Sep 14–18        Sprint 5     Pilot with real institute + bug fixes
W6      Sep 21–25        Sprint 6     Polish + docs + v1.0.0 tag
─────────────────────────────────────────────────────────────────────────────────────
```

---

## 📋 Post-V1 Backlog (Do NOT build in V1)

> Log here so nothing gets forgotten. Prioritize after pilot learnings.

- [ ] Payment gateway integration (currently admin manually marks paid)
- [ ] AWS migration (triggers defined in SYSTEM_DESIGN.md §12)
- [ ] Email/SMS notification fallback (currently FCM only)
- [ ] Student self-registration portal
- [ ] Multi-language question support
- [ ] Advanced analytics dashboard (cohort progress, class-level wrong-answer heatmap)
- [ ] B2B multi-institute self-service onboarding

---

## 🔄 Agile Ceremonies

| Ceremony | When | Duration | Who |
|---|---|---|---|
| **Daily Standup** | Every weekday 9:30 AM | 15 min max | All 3 devs |
| **Sprint Planning** | Every Monday morning | 1 hour | All 3 devs |
| **Sprint Demo** | Every Friday EOD | 30 min | All 3 devs (+ stakeholders) |
| **Sprint Retrospective** | Every Friday after demo | 30 min | All 3 devs |
| **PR Review SLA** | Within 4 working hours of opening | — | Any available dev |

### Standup Format
```
✅ Done yesterday:
🔨 Doing today:
🚧 Blockers:
```

---

## 🛠️ Tech Stack Quick Reference

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.x, Spring Security, Spring Data JPA (Hibernate) |
| Database | PostgreSQL 16, Flyway migrations |
| Auth | JWT (access + refresh), Argon2id/BCrypt |
| Tenant Isolation | Hibernate `@Filter` on `institute_id` |
| API Contract | OpenAPI 3.x (springdoc), versioned at `/api/v1/` |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx + Let's Encrypt (VPS) |
| Admin Web App | React (Vite), React Router, Axios (service layer) |
| Mobile App | Flutter (Dart), Riverpod, Drift/SQLite (SQLCipher), WorkManager |
| Typing Engine | Kotlin native (`TypingEngine.kt` via `MethodChannel("typing_engine")`) |
| Windows App | Flutter Windows (shared Domain + Data layer from Android) |
| Notifications | Firebase Cloud Messaging (FCM) |
| CI/CD | GitHub Actions (build + tests on every PR) |
| Future Cloud | AWS ECS / RDS (not in V1 — triggers in SYSTEM_DESIGN.md §12) |

---

## 🚦 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Kotlin platform channel takes longer than estimated | Medium | High | Dev C spikes it Sprint 0 day 2; fallback to pure Dart timing if needed |
| VPS/SSL issues block Sprint 1 demo | Medium | High | Dev A starts VPS Sprint 0 day 1; use ngrok as temporary fallback for demo |
| Drift + SQLCipher on Windows is non-trivial | Low | Medium | Dev C validates Windows SQLCipher in Sprint 3 (before Sprint 4 depends on it) |
| Sync idempotency edge cases in real network conditions | Medium | Medium | Integration tests Sprint 3; manual network-cut test before pilot |
| Sprint 1 velocity overestimated | High | Medium | Sprint 1 scope is the *minimum* demo-able slice — cut React polish before cutting the activate flow |

---

*Last updated: 2026-08-14 · Review and update at each Sprint Planning session.*
