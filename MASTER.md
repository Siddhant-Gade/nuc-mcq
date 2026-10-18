# NUC-MCQ Master Project Documentation and System Architecture Manual
**Single Source of Truth for Architecture, Implementation, Database, APIs, Security, Testing, and Operations**

---

## Table of Contents

- [1. Document Purpose and Status](#1-document-purpose-and-status)
- [2. Executive Summary](#2-executive-summary)
- [3. Project Identity](#3-project-identity)
- [4. Problem Statement and Objectives](#4-problem-statement-and-objectives)
- [5. Scope and Requirements](#5-scope-and-requirements)
- [6. Repository Structure](#6-repository-structure)
- [7. Complete Technology Stack](#7-complete-technology-stack)
- [8. System Architecture](#8-system-architecture)
- [9. Application Modules and Feature Matrix](#9-application-modules-and-feature-matrix)
- [10. Database Schema and Relationships](#10-database-schema-and-relationships)
- [11. API Reference](#11-api-reference)
- [12. Authentication and Authorization](#12-authentication-and-authorization)
- [13. Sessions and Cookies](#13-sessions-and-cookies)
- [14. Test and Assessment Workflows](#14-test-and-assessment-workflows)
- [15. Notices, Notifications, and Synchronization](#15-notices-notifications-and-synchronization)
- [16. File Uploads and Storage](#16-file-uploads-and-storage)
- [17. UI/UX and Multilingual Support](#17-uiux-and-multilingual-support)
- [18. Caching and Performance](#18-caching-and-performance)
- [19. Security and Privacy](#19-security-and-privacy)
- [20. Environment Variables](#20-environment-variables)
- [21. Local Development Setup](#21-local-development-setup)
- [22. Build and Execution Commands](#22-build-and-execution-commands)
- [23. Deployment Architecture](#23-deployment-architecture)
- [24. Known Issues and Technical Debt](#24-known-issues-and-technical-debt)
- [25. Testing Strategy and Results](#25-testing-strategy-and-results)
- [26. Academic Documentation](#26-academic-documentation)
- [27. Function Point Analysis and Cost Estimation](#27-function-point-analysis-and-cost-estimation)
- [28. Team and Responsibilities](#28-team-and-responsibilities)
- [29. Future Roadmap](#29-future-roadmap)
- [30. AI Agent Working Instructions](#30-ai-agent-working-instructions)
- [31. Glossary](#31-glossary)
- [32. References](#32-references)
- [33. Change Log](#33-change-log)
- [34. Verification and Evidence Notes](#34-verification-and-evidence-notes)

---

# 1. Document Purpose and Status

### 1.1 Purpose
This document (`MASTER.md`) is the **authoritative single source of truth** for the **NUC-MCQ** software engineering project. It provides an exhaustive, verified reference manual detailing the platform's multi-tier architecture, data schemas, API contracts, security mechanisms, test execution protocols, deployment configurations, costing estimations, and maintenance guidelines. 

This manual is engineered specifically for:
1. **Software Architects and Senior Engineers**: Reviewing system scalability, data integrity constraints, state management, and API lifecycle.
2. **Full-Stack Developers**: Implementing new features, onboarding to backend services, managing database migrations, or updating frontend components.
3. **Academic Evaluators and Project Guides**: Reviewing requirements analysis, IEEE compliance, Function Point Analysis (FPA), and academic project viva deliverables.
4. **Autonomous AI Coding Agents**: Executing targeted maintenance, bug fixes, or enhancements according to strict ground-truth operational rules without hallucinations or context degradation.

### 1.2 Document Status & Integrity Declaration
- **Document Version**: 1.0.0
- **Project State**: Active Development & Academic Verification
- **Last Comprehensive Codebase Audit**: October 2026
- **Audited Repository Root**: `d:\WT\App UI\nuc-mcq`
- **Mirror Deployment Root**: `d:\WT\App UI\nuc-mcq-student`

### 1.3 Implementation Classification Taxonomy
Every statement, architectural claim, and technical metric within this document is strictly classified according to the following empirical taxonomy:
- **[Implemented]**: Fully authored and present in the audited codebase.
- **[Partially Implemented]**: Authoring initiated in the codebase; features exist but possess documented constraints, stubbed logic, or incomplete UI coverage.
- **[Planned]**: Architectural design formally established and documented for implementation, but no application code yet committed.
- **[Verified]**: Inspected directly and validated through automated unit/integration test execution, CLI checks, or network validation.
- **[Unverified]**: Code or configuration exists in the codebase but has not been directly validated against active production infrastructure.
- **[Proposed]**: Engineering recommendations submitted for future phases or academic refinement.
- **[Under Implementation]**: Active ongoing development during the current sprint cycle.

> [!IMPORTANT]
> **Strict Documentation Boundary**: This document reflects the true ground truth of the repository. No application code has been modified, committed, pushed, or deployed during the authoring of this document. Planned features—including the upcoming Opaque Server-Side Session and Cookie management layer—are strictly labeled as Planned/Proposed architectures to prevent misrepresenting project completion.

---

# 2. Executive Summary

### 2.1 The NUC-MCQ Platform
The **NUC-MCQ Platform** (New Unique Computers Multiple Choice Question Assessment and Learning Management System) is an enterprise-grade, cloud-backed educational testing and diagnostic performance platform engineered specifically for computer literacy institutes administering the **MS-CIT** (Maharashtra State Certificate in Information Technology) curriculum.

Traditionally, vocational training centres rely on fragmented offline testing systems or physical paper workbooks. These methods suffer from severe operational limitations: zero diagnostic visibility into topic-level weaknesses, labor-intensive manual evaluation, delayed student feedback, absence of unified study materials, and complete inability to track student study consistency or streaks.

NUC-MCQ resolves these systemic issues by delivering a coordinated, multi-client ecosystem:
- **Student Mobile Application (Android/iOS)**: A native-performance Flutter application built on Dart, providing an offline-resilient test-taking engine, push notifications, trilingual study materials, local bookmark persistence, and gamified streak/level tracking.
- **Student Web Application (Portal)**: A responsive single-page web application (React 19 + TypeScript + Vite + Tailwind CSS) providing institutional students with browser-based assessment capabilities, instant test diagnostics, topic analytics via Recharts, and administrative access request workflows.
- **Admin Web Dashboard**: A back-office management console (React 19 + Vite + CSS Modules) enabling institute directors to manage student admissions, supervise batch allocations, execute bulk question uploads (via Excel/PDF), orchestrate broadcast notices, and monitor institute-wide examination scores.
- **Node.js Express Backend Service**: A modular REST API running Express 5, Drizzle ORM, and PostgreSQL, enforcing Zero-Trust Role-Based Access Control (RBAC), student access lifecycle verification, and idempotent assessment submission.

### 2.2 System Architecture Overview

```mermaid
flowchart TD
    subgraph Clients["Client Presentation Tier"]
        FlutterApp["Flutter Mobile App<br/>(Dart / Dio / BLoC)"]
        StudentWeb["Student Web App<br/>(React 19 / Vite / TS)"]
        AdminWeb["Admin Dashboard<br/>(React 19 / Vite / JS)"]
    end

    subgraph ReverseProxy["Edge / Reverse Proxy Tier"]
        VercelProxy["Vercel Edge Gateway<br/>(vercel.json rewrites)"]
    end

    subgraph AppServer["Application Backend Tier (Render)"]
        ExpressAPI["Node.js Express 5 REST API<br/>(Drizzle ORM / Jose JWT Verifier)"]
        AuthMiddleware["Auth & RBAC Middleware<br/>(SUPER_ADMIN / ADMIN / STUDENT)"]
        Modules["Business Modules<br/>(Students, Batches, Results, Broadcasts, Questions)"]
    end

    subgraph ExternalServices["Cloud Infrastructure & Services"]
        SupabaseAuth["Supabase Identity Provider<br/>(Auth / GoTrue / JWKS)"]
        PostgresDB["PostgreSQL Database<br/>(Supabase Cloud Postgres)"]
        FirebaseFCM["Firebase Cloud Messaging<br/>(FCM Push Notifications)"]
    end

    FlutterApp -->|"Bearer JWT / Direct REST"| ExpressAPI
    StudentWeb -->|"Same-Origin /api Rewrites"| VercelProxy
    VercelProxy -->|"HTTPS Proxy"| ExpressAPI
    AdminWeb -->|"Direct REST / Bearer JWT"| ExpressAPI

    ExpressAPI --> AuthMiddleware
    AuthMiddleware --> Modules
    ExpressAPI -->|"Asymmetric Public Key Check"| SupabaseAuth
    Modules -->|"Connection Pooling / SQL"| PostgresDB
    Modules -->|"Push Dispatch"| FirebaseFCM
```

---

# 3. Project Identity

### 3.1 Naming and Institutional Identity
- **Project Name**: NUC-MCQ
- **Full Formal Title**: *NUC-MCQ: A Web-Based Student MCQ Assessment, Learning and Performance Analytics Platform for Vocational IT Literacy Training*
- **Target Organization**: **New Unique Computers** (Authorized MS-CIT Training Centre, Sangli, Maharashtra, India)
- **Primary Domain**: Computer Education, Vocational Assessment, Educational Technology (EdTech)

### 3.2 Target Audience & User Personas
1. **Vocational Students (Enrolled Candidates)**:
   - Pursuing MS-CIT, Tally, or foundational computer literacy certifications.
   - Demographics: Diverse educational backgrounds; require bilingual or trilingual question presentation (English, Marathi, Hindi).
   - Needs: Practice tests with immediate explanatory feedback, timed mock examinations simulating final board exams, diagnostic progress tracking, access to lecture notes, and urgent institutional broadcast alerts.
2. **Institute Faculty & Instructors**:
   - Needs: Rapid batch assignment, tracking weak topic cohorts (e.g., MS Excel formulas vs. Windows OS fundamentals), publishing localized study materials, and broadcast scheduling.
3. **Institute Director / Super Administrator**:
   - Needs: Total governance over student enrollment, PRN (Permanent Registration Number) verification, student suspension/activation, question bank bulk ingestion, and overall institutional pass-rate analytics.

---

# 4. Problem Statement and Objectives

### 4.1 Problem Statement
Vocational IT training institutions operating MS-CIT programs face significant educational hurdles:
- **Disjointed Evaluation Mechanisms**: Students practice using static paper question banks or outdated CD-ROM software that lack real-time answer validation or diagnostic telemetry.
- **Language Comprehension Barriers**: MS-CIT students across rural and semi-urban regions frequently struggle with English-only technical terminology, leading to lower exam confidence and higher failure rates without synchronized Marathi and Hindi translations.
- **Operational Administrative Overhead**: Institute staff manually track attendance, verify student registration numbers, grade physical mock test sheets, and communicate schedules via ad-hoc WhatsApp groups.
- **Absence of Performance Analytics**: Neither instructors nor students possess quantitative visibility into specific syllabus domains (e.g., PageMaker, Outlook, Computer Fundamentals) where students consistently fail questions.

### 4.2 Engineering Objectives
The NUC-MCQ platform was engineered to satisfy the following quantifiable technical objectives:
1. **Centralized Student Identity & Zero-Trust Verification**: Enforce authoritative institute-controlled admission where only students pre-enrolled with valid PRNs can claim access, verify credentials via Supabase Auth, and receive authorized role claims (`STUDENT`).
2. **Bilingual Assessment Engine**: Deliver a trilingual test-taking interface supporting real-time toggling between English, Marathi, and Hindi text, options, and pedagogical explanations.
3. **Sub-Second Real-Time Test Scoring & Idempotency**: Provide client-side deterministic evaluation coupled with an idempotent server-side persistence protocol (`clientEventId` deduplication) guaranteeing zero lost exam results during network dropouts.
4. **Authoritative Access Control & Instant Suspension**: Build a reactive permission model capable of instantly cutting off suspended student accounts across web and mobile clients without requiring database schema destruction.
5. **Real-Time Broadcast & Push Notification Pipeline**: Guarantee that administrative notices reach enrolled students simultaneously via in-app feeds and mobile background push notifications (Firebase Cloud Messaging).
6. **Robust Batch & Question Management**: Provide administrative tools to import thousands of curriculum questions via structured Excel spreadsheets and manage time-slotted student batches with full referential integrity.

---

# 5. Scope and Requirements

### 5.1 System Scope Boundaries
- **In Scope**:
  - Student registration, email/PRN resolution, password setup, and Google Single Sign-On (SSO).
  - Web and mobile practice test engines (with configurable instant feedback) and mock exam engines.
  - Performance analytics (topic diagnostics, score trends, streak tracking, and level calculation).
  - Question bank CRUD operations, bulk Excel ingestion, and multi-lingual question storage.
  - Notice broadcasts with target batch filtering and individual read receipt tracking.
  - Study material document distribution (PDFs, PPTXs, DOCXs, and external video links).
  - Admin management of students, teachers, batches, and access approvals.
  - Student bookmark management.
- **Out of Scope (Current Architecture Boundaries)**:
  - Direct in-app tuition payment gateway processing (handled offline at the institute counter).
  - Self-hosted video transcoding/streaming infrastructure (leveraging YouTube and external CDN URLs).
  - Subjective essay grading or optical mark reader (OMR) paper sheet scanning.

### 5.2 Functional Requirements (FR)
- **FR-01: PRN-Based Pre-Admitted Student Identity Verification**: The system must verify that a student's PRN exists in `student_profile` before permitting account registration or password assignment.
- **FR-02: Bilingual/Trilingual Presentation**: Every question record must store distinct text, options (A, B, C, D), and explanations for English (`en`), Marathi (`mr`), and Hindi (`hi`).
- **FR-03: Configurable Assessment Modes**:
  - *Practice Mode*: Allows on-demand instant feedback or manual "Show Answer" reveal with detailed explanations.
  - *Exam Mode*: Strict countdown timer, no interim feedback, answers sealed until submission.
- **FR-04: Idempotent Submission Handling**: Result submission endpoints must accept a client-generated UUID (`clientEventId`) and enforce database uniqueness to prevent duplicate test records on retry.
- **FR-05: Student Access Lifecycle Management**: Student access status must transition predictably through `PENDING`, `ACTIVE`, `EXPIRED`, and `REVOKED` states.
- **FR-06: Batch Allocation & Cascade Safety**: Deleting an academic batch must never delete historical student profiles, results, or test records; foreign key relationships must safely nullify or handle dependencies.
- **FR-07: Persistent Notice Read Receipts**: Student read interactions with broadcast notices must be recorded authoritatively in the database (`broadcast_read`) to synchronize read/unread states across multiple devices.
- **FR-08: Push Notification Dispatch**: Publishing an administrative broadcast must trigger Firebase Cloud Messaging (FCM) dispatch to all registered mobile tokens belonging to targeted batches.

### 5.3 Non-Functional Requirements (NFR)
- **NFR-01: Performance**: API response latency for cached/hot database queries must remain under 200 ms.
- **NFR-02: Cold-Start Resilience**: Web and mobile clients communicating with Render-hosted backend instances must maintain a minimum 30-second request timeout with user-visible loading indicators to absorb container spin-up delays.
- **NFR-03: Security & Transport**: 100% of network traffic must be encrypted over TLS 1.3 (HTTPS). Passwords must never be stored in plain text. JWT signatures must be verified against Supabase JWKS public keys.
- **NFR-04: Cross-Origin Resource Sharing (CORS)**: Backend CORS policy must strictly allow only whitelisted frontend domains (`http://localhost:5173`, `http://localhost:5174`, production Vercel domains) with `credentials: true`.
- **NFR-05: Database Integrity**: Strict database check constraints must validate that `correctCount + wrongCount <= totalQuestions` and prevent negative scores.

---

# 6. Repository Structure

The NUC-MCQ ecosystem is organized into two primary physical locations: the primary monorepo containing all sub-applications, and a dedicated Vercel deployment mirror for the student web client.

### 6.1 Primary Monorepo Directory Map (`d:\WT\App UI\nuc-mcq`)

```text
d:\WT\App UI\nuc-mcq/
├── admin/                      # Admin Web Application (React 19 + Vite 8)
│   ├── public/                 # Static assets, favicon, icons
│   ├── src/                    # Admin source code
│   │   ├── components/         # Modal dialogs, tables, navbar, sidebar, cards
│   │   ├── context/            # Authentication & administrative state contexts
│   │   ├── pages/              # Primary route views (Students, Batches, Questions, etc.)
│   │   │   ├── Batches.jsx     # Batch CRUD & teacher assignment
│   │   │   ├── Dashboard.jsx   # Institutional metrics & quick actions
│   │   │   ├── Notices.jsx     # Broadcast creation & read tracking
│   │   │   ├── QuestionBank.jsx# Question authoring, bulk upload, search
│   │   │   ├── Results.jsx     # Student exam attempt logs & analytics
│   │   │   ├── Students.jsx    # Student admission, access toggle, PRN management
│   │   │   └── StudyMaterial.jsx# Document uploads & catalog management
│   │   ├── services/           # Axios HTTP API clients & Supabase JS client
│   │   ├── App.jsx             # React Router routing configuration
│   │   └── main.jsx            # Application bootstrap & DOM mount
│   ├── package.json            # React 19, Vite 8, xlsx, axios, supabase-js
│   └── vite.config.js          # Vite build & plugin configuration
│
├── backend/                    # Node.js REST API Service
│   ├── src/                    # Backend source code
│   │   ├── config/             # Environment validation (Zod) & configuration constants
│   │   ├── database/           # Drizzle ORM schemas, migration runners, DB pool
│   │   │   ├── schema/index.js # Authoritative PostgreSQL table schemas & enums
│   │   │   └── index.js        # pg Pool & Drizzle database instance initialization
│   │   ├── middleware/         # Express middleware components
│   │   │   ├── auth.middleware.js          # Bearer JWT extraction & user hydration
│   │   │   ├── authorization.middleware.js # Role checks (requireRoles('ADMIN', etc.))
│   │   │   ├── cors.middleware.js          # Cross-origin origin validation
│   │   │   ├── error.middleware.js         # Standardized JSON error response handler
│   │   │   ├── not-found.middleware.js     # 404 route catcher
│   │   │   └── validation.middleware.js    # Zod request schema validation
│   │   ├── modules/            # Domain-driven feature modules
│   │   │   ├── auth/           # Supabase JWT asymmetric verification (jose)
│   │   │   ├── authorization/  # Student access request processing
│   │   │   ├── batches/        # Batch management service, repository, routes
│   │   │   ├── broadcasts/     # Notice publication, batch targeting, read receipts
│   │   │   ├── dashboard/      # Institutional & student aggregate metrics
│   │   │   ├── notifications/  # FCM push notification dispatcher & device token registry
│   │   │   ├── question-bank/  # Question CRUD, bulk Excel parser, Python PDF extractor
│   │   │   ├── results/        # Idempotent result persistence & analytics calculation
│   │   │   ├── student-access/ # Student identity resolution & status gating
│   │   │   ├── students/       # Student profile admission, PRN search, update
│   │   │   └── study-materials/# Document upload & study material catalog
│   │   ├── utils/              # ApiError, ApiResponse, DB error mappers, storage helpers
│   │   ├── app.js              # Express app factory, route mounting, middleware chain
│   │   └── server.js           # HTTP listener startup & graceful shutdown handlers
│   ├── package.json            # Express 5, Drizzle ORM, pg, jose, firebase-admin, helmet
│   └── drizzle.config.js       # Drizzle Kit migration configuration
│
├── std_web/                    # Student Web Application (React 19 + TypeScript + Vite 6)
│   ├── public/                 # Static branding, logo assets
│   ├── src/                    # Student web source code
│   │   ├── assets/             # SVG icons, illustrations
│   │   ├── components/         # UI component library
│   │   │   ├── common/         # Buttons, badges, modals, cards, skeletons
│   │   │   ├── layout/         # Student navbar, sidebar, breadcrumb, footer
│   │   │   └── test/           # Question viewer, palette, timer, feedback display
│   │   ├── context/            # AuthContext, ThemeContext, LanguageContext
│   │   ├── hooks/              # Custom React hooks (useAuth, useTestEngine, useSync)
│   │   ├── lib/                # Axios instance with 30s timeout, Supabase client
│   │   ├── pages/              # Route views
│   │   │   ├── Auth/           # Student Login, PRN Verification, Access Pending
│   │   │   ├── Dashboard/      # Enrolled batches, streak card, quick test entry
│   │   │   ├── Notices/        # Institutional broadcasts & read receipt toggles
│   │   │   ├── Performance/    # Score analytics, topic diagnostics, trends
│   │   │   ├── QuestionBank/   # Trilingual question browser & search
│   │   │   ├── StudyMaterial/  # Downloadable PDF/PPTX study documents
│   │   │   └── TestEngine/     # Live test taking, timer, instant feedback, submit
│   │   ├── types/              # Comprehensive TypeScript interfaces & enums
│   │   ├── App.tsx             # React Router routing & protected route wrappers
│   │   └── main.tsx            # Application entry point
│   ├── package.json            # React 19, TypeScript 5.7, Tailwind CSS, TanStack Query
│   └── vite.config.ts          # Vite bundler configuration
│
└── students_app/               # Student Mobile Application (Flutter 3.x / Dart)
    ├── android/                # Native Android wrapper, Gradle configuration, FCM setup
    ├── ios/                    # Native iOS Xcode project
    ├── assets/                 # Embedded fonts, icons, offline fallback assets
    ├── lib/                    # Dart source code
    │   ├── core/               # Network clients (Dio), storage (SharedPreferences), themes
    │   ├── features/           # Feature slices (Auth, Dashboard, Tests, Notices, Bookmarks)
    │   │   ├── auth/           # Supabase Flutter auth, PRN verification, session sync
    │   │   ├── bookmarks/      # Local question bookmarking & offline review
    │   │   ├── dashboard/      # Streak counter, active batch card, recent tests
    │   │   ├── notices/        # FCM background handler, in-app broadcast list
    │   │   ├── study_material/ # In-app PDF viewer & document caching
    │   │   └── test_engine/    # Local state test runner, timer, instant explanation
    │   └── main.dart           # Flutter application entry & BLoC providers
    └── pubspec.yaml            # flutter_bloc, dio, supabase_flutter, firebase_messaging
```

### 6.2 Deployment Mirror Repository (`d:\WT\App UI\nuc-mcq-student`)
- **Repository Remote**: `https://github.com/solankarrushi16/nuc-mcq-student.git`
- **Branch**: `main`
- **Role**: Dedicated deployment root for the student web application on Vercel. Contains the compiled or source files of `std_web` at its repository root, augmented with a production `vercel.json` reverse proxy:
  ```json
  {
    "rewrites": [
      {
        "source": "/api/:path*",
        "destination": "https://nuc-mcq-server.onrender.com/api/:path*"
      },
      {
        "source": "/health",
        "destination": "https://nuc-mcq-server.onrender.com/health"
      },
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
  *Architectural Benefit*: Eliminates cross-origin browser preflight requests (`OPTIONS`) in production by routing all API calls through the same origin as the frontend domain.

---

# 7. Complete Technology Stack

The following inventory details all verified frameworks, runtimes, and libraries across the four primary subsystems.

### 7.1 Backend Server Stack (`backend/`)
| Component | Technology | Version | Purpose / Role | Implementation Status |
|---|---|---|---|---|
| **Runtime Environment** | Node.js | v20+ / v22+ (ESM) | Server runtime supporting modern native ESM modules | [Implemented] [Verified] |
| **Web Framework** | Express | `^5.1.0` | HTTP application router, middleware pipeline | [Implemented] [Verified] |
| **Database ORM** | Drizzle ORM | `^0.44.7` | Type-safe SQL query builder and schema management | [Implemented] [Verified] |
| **PostgreSQL Driver** | `pg` | `^8.23.0` | Enterprise-grade PostgreSQL connection pool client | [Implemented] [Verified] |
| **Database Migration CLI** | Drizzle Kit | `^0.31.4` | Schema generation, diffing, and migration executor | [Implemented] [Verified] |
| **Cryptographic Verifier**| `jose` | `^6.0.12` | Asymmetric JWT validation against remote Supabase JWKS | [Implemented] [Verified] |
| **Cloud Identity SDK** | `@supabase/supabase-js` | `^2.112.4` | Admin user management and storage access | [Implemented] [Verified] |
| **Push Notification SDK** | `firebase-admin` | `^14.3.0` | FCM push notification dispatch to Android/iOS tokens | [Implemented] [Verified] |
| **Security Headers** | `helmet` | `^8.3.0` | HTTP header hardening (HSTS, X-Content-Type, etc.) | [Implemented] [Verified] |
| **Rate Limiter** | `express-rate-limit` | `^8.7.0` | DoS prevention on authentication and API routes | [Implemented] [Verified] |
| **File Multipart Parser** | `multer` | `^2.2.0` | Multipart/form-data handler for Excel/PDF uploads | [Implemented] [Verified] |
| **Schema Validation** | `zod` | `^4.1.5` | Runtime type validation for environment variables | [Implemented] [Verified] |

### 7.2 Student Web Stack (`std_web/`)
| Component | Technology | Version | Purpose / Role | Implementation Status |
|---|---|---|---|---|
| **UI Framework** | React | `^19.0.0` | Component-based reactive user interface | [Implemented] [Verified] |
| **Language** | TypeScript | `^5.7.3` | Static typing, interface contracts, compile-time safety | [Implemented] [Verified] |
| **Build Tooling & Bundler**| Vite | `^6.0.7` | Hot Module Replacement (HMR) and optimized build | [Implemented] [Verified] |
| **Styling Engine** | Tailwind CSS | `^3.4.17` | Utility-first responsive CSS styling | [Implemented] [Verified] |
| **Client-Side Routing** | React Router DOM | `^7.1.3` | Single-page client navigation and route guards | [Implemented] [Verified] |
| **Asynchronous State** | TanStack React Query| `^5.64.1` | Server-state caching, automatic refetch, stale-time | [Implemented] [Verified] |
| **HTTP Client** | Axios | `^1.7.9` | REST client with 30s timeout, interceptors, credentials| [Implemented] [Verified] |
| **Form Management** | React Hook Form | `^7.54.2` | Performant form state handling and submission | [Implemented] [Verified] |
| **Analytics Charting** | Recharts | `^2.15.0` | Visualizing score history and topic breakdown charts | [Implemented] [Verified] |
| **UI Iconography** | Lucide React | `^0.473.0` | Clean, lightweight SVG icon system | [Implemented] [Verified] |
| **Gamification Effects** | Canvas Confetti | `^1.9.4` | Celebration animation on high exam score achievements | [Implemented] [Verified] |

### 7.3 Admin Web Stack (`admin/`)
| Component | Technology | Version | Purpose / Role | Implementation Status |
|---|---|---|---|---|
| **UI Framework** | React | `^19.2.8` | Back-office management portal user interface | [Implemented] [Verified] |
| **Build Tooling & Bundler**| Vite | `^8.2.0` | Vite 8 next-generation bundler | [Implemented] [Verified] |
| **Client-Side Routing** | React Router DOM | `^7.18.2` | Administrative navigation and RBAC route protection | [Implemented] [Verified] |
| **Spreadsheet Processing**| `xlsx` (SheetJS) | `^0.18.5` | Parsing bulk question Excel files on the client side | [Implemented] [Verified] |
| **HTTP Client** | Axios | `^1.19.0` | REST API requests with auth interceptors | [Implemented] [Verified] |
| **Identity Provider SDK** | `@supabase/supabase-js` | `^2.112.4` | Admin authentication and session persistence | [Implemented] [Verified] |
| **Code Linter** | Oxlint | `^1.75.0` | Ultra-fast Rust-based JavaScript linting | [Implemented] [Verified] |

### 7.4 Student Mobile Stack (`students_app/`)
| Component | Technology | Version | Purpose / Role | Implementation Status |
|---|---|---|---|---|
| **Mobile Framework** | Flutter SDK | `^3.10.4` | Multi-platform native mobile compilation (Dart 3.x) | [Implemented] [Verified] |
| **State Management** | `flutter_bloc` | `^9.1.1` | Predictable reactive state management (BLoC / Cubit) | [Implemented] [Verified] |
| **Network Client** | `dio` | `^5.11.0` | Resilient HTTP client with retry and interceptor logic| [Implemented] [Verified] |
| **Authentication SDK** | `supabase_flutter` | `^2.17.2` | Native authentication, token refresh, session storage| [Implemented] [Verified] |
| **Push Notifications** | `firebase_messaging` | `^16.6.0` | Receiving FCM broadcast notifications in background | [Implemented] [Verified] |
| **Local Persistence** | `shared_preferences`| `^2.3.2` | Key-value storage for local bookmarks, active language| [Implemented] [Verified] |
| **Document Viewer** | `open_filex` | `^4.7.0` | Opening downloaded PDF study materials on device | [Implemented] [Verified] |
| **Media Player** | `youtube_player_iframe`| `^4.0.4` | Embedded playback of educational video materials | [Implemented] [Verified] |

---

# 8. System Architecture

### 8.1 High-Level End-to-End Architecture
The NUC-MCQ platform operates on a decoupled client-server model. Frontend single-page applications and mobile clients interact with the Express backend exclusively via standard HTTPS REST endpoints, passing bearer tokens for authentication.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student User
    participant Web as Student Web Portal
    participant Supa as Supabase Auth (GoTrue)
    participant API as Express 5 Backend
    participant DB as PostgreSQL Database

    Note over Student,DB: 1. Student Identity Resolution & Login
    Student->>Web: Enters PRN / Student ID & Password
    Web->>API: POST /api/v1/auth/resolve-student-email { identifier: PRN }
    API->>DB: Query student_profile by PRN
    DB-->>API: Returns profile (email: prn@student.unique)
    API-->>Web: 200 OK { email, name, accessStatus }
    
    Web->>Supa: signInWithPassword(email, password)
    Supa-->>Web: Returns Session { access_token (JWT), refresh_token }
    
    Note over Student,DB: 2. Identity & Role Verification
    Web->>API: GET /api/v1/auth/me (Authorization: Bearer JWT)
    API->>Supa: Verify JWT signature via JWKS
    API->>DB: Authoritative check on student_access table
    DB-->>API: Access Status: ACTIVE
    API-->>Web: 200 OK { identity: { roles: ['STUDENT'], status: 'ACTIVE' } }
    Web-->>Student: Renders Student Dashboard
```

### 8.2 Administrator Authentication & RBAC Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Institute Director
    participant AdminUI as Admin Dashboard
    participant Supa as Supabase Auth
    participant API as Express 5 Backend
    participant DB as PostgreSQL Database

    Admin->>AdminUI: Enters Admin Credentials
    AdminUI->>Supa: signInWithPassword(email, password)
    Supa-->>AdminUI: Auth Success { access_token }
    
    AdminUI->>API: GET /api/v1/admin/access-check (Bearer JWT)
    API->>API: Verify JWT & extract email
    API->>API: Compare against SUPER_ADMIN_EMAIL config
    alt Email Matches Super Admin
        API-->>AdminUI: 200 OK { roles: ['ADMIN', 'SUPER_ADMIN'] }
        AdminUI-->>Admin: Grants Admin Dashboard Access
    else Not Designated Admin
        API-->>AdminUI: 403 Forbidden { error: 'INSUFFICIENT_PERMISSIONS' }
        AdminUI-->>Admin: Displays Access Denied Error
    end
```

### 8.3 Test Taking, Evaluation, and Idempotent Submission Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant TestUI as Test Engine Component
    participant API as Express Backend
    participant DB as PostgreSQL Database

    Student->>TestUI: Starts Practice Test (Topic: MS Excel)
    TestUI->>API: GET /api/v1/student/question-bank?topic=excel
    API->>DB: SELECT * FROM question WHERE section = 'excel'
    DB-->>API: 25 Questions (English, Marathi, Hindi)
    API-->>TestUI: Questions Payload

    loop Each Question
        Student->>TestUI: Selects Option (e.g. Option B)
        alt Instant Feedback Mode Enabled
            TestUI->>TestUI: Compares with correctIndex
            TestUI-->>Student: Displays Correct/Wrong Indicator & Explanation
        else Exam Mode
            TestUI->>TestUI: Records selection silently in local state
        end
    end

    Student->>TestUI: Clicks "Submit Test"
    TestUI->>TestUI: Computes score, correctCount, wrongCount
    TestUI->>TestUI: Generates unique clientEventId (UUID v4)
    
    TestUI->>API: POST /api/v1/results { clientEventId, testId, score, answers, ... }
    API->>DB: INSERT INTO test_result ... ON CONFLICT (client_event_id) DO NOTHING
    alt Insert Succeeded
        DB-->>API: Created record
        API-->>TestUI: 201 Created { resultId, score, percentile }
    else Duplicate Retry (Network hiccup)
        DB-->>API: Conflict on client_event_id
        API->>DB: SELECT * FROM test_result WHERE client_event_id = :id
        DB-->>API: Existing record
        API-->>TestUI: 200 OK (Idempotent replay)
    end
    TestUI-->>Student: Renders Final Score Summary & Analytics
```

### 8.4 Broadcast Notice & FCM Push Notification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Institute Admin
    participant AdminUI as Admin Dashboard
    participant API as Express Backend
    participant DB as PostgreSQL Database
    participant FCM as Firebase Cloud Messaging
    participant StudentApp as Student Mobile App

    Admin->>AdminUI: Writes Notice ("Holiday on Monday", Target: Batch B1)
    AdminUI->>API: POST /api/v1/broadcasts { title, message, audience: 'BATCH', batchIds: ['B1'] }
    API->>DB: INSERT INTO broadcast ... RETURNING id
    API->>DB: INSERT INTO broadcast_target (broadcast_id, batch_id) VALUES ...
    
    API->>DB: SELECT fcm_token FROM student_device_token WHERE auth_user_id IN (students of B1)
    DB-->>API: List of device tokens
    
    API->>FCM: sendMulticast({ tokens, notification: { title, body } })
    FCM-->>StudentApp: Delivers push alert to Android/iOS notification tray
    
    API-->>AdminUI: 201 Created { broadcastId }

    StudentApp->>StudentApp: Student taps notification / opens app
    StudentApp->>API: POST /api/v1/student/broadcasts/:id/read
    API->>DB: INSERT INTO broadcast_read (broadcast_id, auth_user_id) VALUES ...
    DB-->>API: Read receipt recorded
    API-->>StudentApp: 200 OK { read: true }
```

### 8.5 Bookmark Synchronization & Offline Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant Mobile as Mobile App (Flutter)
    participant LocalStore as SharedPreferences (Device)
    participant API as Backend Service (Planned Sync)

    Student->>Mobile: Taps "Bookmark Question" during practice
    Mobile->>LocalStore: Appends questionId to local bookmark list
    LocalStore-->>Mobile: Stored successfully
    Mobile-->>Student: UI updates: Star icon highlighted
    
    Note over Mobile,API: Offline Resilience
    alt Device is Offline
        Student->>Mobile: Navigates to Bookmarks Screen
        Mobile->>LocalStore: Reads cached bookmarked question IDs
        Mobile-->>Student: Displays bookmarked questions from local cache
    else Device is Online & Sync Triggered [Planned Architecture]
        Mobile->>API: POST /api/v1/student/bookmarks/sync { bookmarkedIds: [...] }
        API-->>Mobile: 200 OK (Sync confirmed)
    end
```

---

# 9. Application Modules and Feature Matrix

The following comprehensive feature inventory records every functional module present across the student mobile app, student web app, admin portal, and backend server.

### 9.1 Complete Feature Matrix

| Feature Name | Primary Subsystem | Source Files / Screens | API Endpoints | Database Tables | Role Required | Status | Verification Evidence |
|---|---|---|---|---|---|---|---|
| **PRN Identity Lookup** | Backend, Web, Mobile | `backend/src/app.js`, `Auth/Login.tsx` | `POST /api/v1/auth/resolve-student-email` | `student_profile`, `student_access` | Public | [Implemented] | [Verified] Unit tests pass |
| **Student Auth Registration** | Backend, Web, Mobile | `backend/src/modules/students/student.service.js` | `POST /api/v1/auth/student-register` | `student_profile`, `student_access` | Public | [Implemented] | [Verified] Sets student auth password |
| **Google SSO Bridge** | Backend, Web, Mobile | `backend/src/app.js` | `POST /api/v1/auth/google-student-auth` | `student_profile`, `student_access` | Public | [Implemented] | [Verified] Issues deterministic HMAC token |
| **Identity & Access Verification** | Backend, Web, Mobile | `backend/src/app.js`, `auth.middleware.js` | `GET /api/v1/auth/me` | `student_profile`, `student_access` | Authenticated | [Implemented] | [Verified] Dynamic role injection |
| **Admin Access Gating** | Backend, Admin Web | `admin/src/pages/Dashboard.jsx` | `GET /api/v1/admin/access-check` | None | `ADMIN`, `SUPER_ADMIN` | [Implemented] | [Verified] Super admin email check |
| **Student Admission (Admin)**| Admin Web, Backend | `admin/src/pages/Students.jsx` | `POST /api/v1/students` | `student_profile`, `student_access` | `ADMIN` | [Implemented] | [Verified] Creates profile & pending access |
| **Student Access Status Control**| Admin Web, Backend| `admin/src/pages/Students.jsx` | `PATCH /api/v1/students/:id/status` | `student_access` | `ADMIN` | [Implemented] | [Verified] Toggles ACTIVE / PENDING / SUSPENDED |
| **Batch Management CRUD** | Admin Web, Backend | `admin/src/pages/Batches.jsx` | `GET, POST, PUT, DELETE /api/v1/batches` | `batch`, `teacher`, `student_profile` | `ADMIN` | [Implemented] | [Verified] Safe deletion handling |
| **Question Bank CRUD (Admin)**| Admin Web, Backend| `admin/src/pages/QuestionBank.jsx` | `GET, POST, PUT, DELETE /api/v1/admin/question-bank` | `question` | `ADMIN` | [Implemented] | [Verified] Section filtering & question creation |
| **Bulk Question Excel Upload**| Admin Web, Backend | `admin/src/pages/QuestionBank.jsx` | `POST /api/v1/admin/question-bank/bulk-upload` | `question` | `ADMIN` | [Implemented] | [Verified] SheetJS parsing + validation |
| **Question Bank PDF Parser** | Backend | `backend/src/modules/question-bank/pdf-parser.py` | CLI Script | `question` | Server Admin | [Implemented] | [Verified] Python pdfplumber extractor |
| **Practice Test Engine** | Student Web, Mobile | `std_web/src/pages/TestEngine/` | `GET /api/v1/student/question-bank` | `question` | `STUDENT` | [Implemented] | [Verified] Instant feedback toggle |
| **Mock Exam Engine** | Student Web, Mobile | `std_web/src/pages/TestEngine/` | `GET /api/v1/student/question-bank` | `question` | `STUDENT` | [Implemented] | [Verified] Timed mode with submission |
| **Idempotent Result Save** | Backend, Web, Mobile| `backend/src/modules/results/result.controller.js` | `POST /api/v1/results` | `test_result` | `STUDENT` | [Implemented] | [Verified] clientEventId deduplication |
| **Performance Analytics** | Student Web, Mobile | `std_web/src/pages/Performance/` | `GET /api/v1/student/results/analytics` | `test_result` | `STUDENT` | [Implemented] | [Verified] Recharts accuracy & weak topics |
| **Student Streak Tracking** | Student Web, Mobile | `std_web/src/pages/Dashboard/` | Derived from `completedAt` in `test_result` | `test_result` | `STUDENT` | [Implemented] | [Verified] Consecutive day calculation |
| **Notice Publishing (Admin)**| Admin Web, Backend | `admin/src/pages/Notices.jsx` | `POST /api/v1/broadcasts` | `broadcast`, `broadcast_target` | `ADMIN` | [Implemented] | [Verified] Batch targeted publication |
| **Notice Feed & Read Receipts**| Student Web, Mobile| `std_web/src/pages/Notices/` | `GET /api/v1/student/broadcasts`, `POST .../read` | `broadcast`, `broadcast_read` | `STUDENT` | [Implemented] | [Verified] Server-side read status |
| **FCM Push Dispatch** | Backend, Mobile | `backend/src/modules/notifications/` | Triggered on Broadcast Publish | `student_device_token` | Internal / Server | [Implemented] | [Verified] Firebase Admin SDK dispatch |
| **Device Token Registration**| Backend, Mobile | `backend/src/modules/notifications/` | `POST /api/v1/notifications/device-token` | `student_device_token` | Authenticated | [Implemented] | [Verified] Token upsert |
| **Study Material Management**| Admin Web, Backend| `admin/src/pages/StudyMaterial.jsx` | `POST, GET, DELETE /api/v1/study-materials` | `study_material` | `ADMIN` | [Implemented] | [Verified] PDF / DOCX / URL cataloging |
| **Study Material Browser** | Student Web, Mobile | `std_web/src/pages/StudyMaterial/` | `GET /api/v1/student/study-materials` | `study_material` | `STUDENT` | [Implemented] | [Verified] Download & viewing |
| **Local Question Bookmarks** | Student Mobile | `students_app/lib/features/bookmarks/` | Local SharedPreferences Storage | None (Local) | `STUDENT` | [Implemented] | [Verified] Offline persistence |
| **Cloud Bookmark Sync** | Backend, Web, Mobile| Planned API | `POST /api/v1/student/bookmarks/sync` | `student_bookmark` (Planned)| `STUDENT` | [Planned] | [Unverified] Documented in roadmap |
| **Opaque Session & Cookies** | Backend, Web Apps | Planned Architecture | `POST /api/v1/auth/session` | `auth_sessions` (Planned) | Authenticated | [Planned] | [Proposed] Described in Section 13 |

---

# 10. Database Schema and Relationships

The NUC-MCQ database runs on PostgreSQL (hosted via Supabase) and is managed strictly through **Drizzle ORM** (`backend/src/database/schema/index.js`).

### 10.1 Entity-Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    TEACHER ||--o{ BATCH : "is assigned to"
    BATCH ||--o{ STUDENT_PROFILE : "enrolls"
    STUDENT_PROFILE ||--|| STUDENT_ACCESS : "governs access"
    STUDENT_PROFILE ||--o{ AUTHORIZATION_REQUEST : "submits"
    STUDENT_PROFILE ||--o{ TEST_RESULT : "completes"
    BROADCAST ||--o{ BROADCAST_TARGET : "targets"
    BATCH ||--o{ BROADCAST_TARGET : "receives"
    BROADCAST ||--o{ BROADCAST_READ : "read by"
    STUDENT_PROFILE ||--o{ BROADCAST_READ : "marks read"
    STUDENT_PROFILE ||--o{ STUDENT_DEVICE_TOKEN : "registers"

    TEACHER {
        uuid id PK
        varchar name
        varchar email UK
        varchar mobile
        varchar subject
        varchar institute_id
        timestamp created_at
    }

    BATCH {
        varchar batch_id PK
        varchar batch_name
        varchar institute_id
        integer capacity
        enum status
        varchar timing
        uuid teacher_id FK
        timestamp created_at
    }

    STUDENT_PROFILE {
        uuid id PK
        varchar student_id UK
        varchar name
        varchar email
        varchar mobile
        varchar institute_id
        varchar batch_id FK
        text photo_path
        varchar course_info
        timestamp created_at
    }

    STUDENT_ACCESS {
        uuid id PK
        uuid student_profile_id FK,UK
        uuid auth_user_id UK
        enum status
        timestamp access_granted_at
        timestamp access_expiry_at
        timestamp revoked_at
    }

    TEST_RESULT {
        uuid id PK
        varchar client_event_id UK
        uuid student_profile_id FK
        uuid auth_user_id
        varchar test_id
        enum mode
        integer total_questions
        integer correct_count
        integer wrong_count
        double_precision score
        jsonb wrong_question_ids
        timestamp completed_at
        timestamp synced_at
    }

    QUESTION {
        uuid id PK
        integer sr
        varchar section
        text question_en
        text opt_a_en
        text opt_b_en
        text opt_c_en
        text opt_d_en
        integer correct_index
        text explanation_en
        text question_mr
        text opt_a_mr
        text opt_b_mr
        text opt_c_mr
        text opt_d_mr
        text explanation_mr
        text question_hi
        text opt_a_hi
        text opt_b_hi
        text opt_c_hi
        text opt_d_hi
        text explanation_hi
        varchar institute_id
        varchar version
    }

    BROADCAST {
        uuid id PK
        varchar title
        text message
        varchar institute_id
        enum audience_type
        enum status
        timestamp published_at
        timestamp created_at
    }

    BROADCAST_TARGET {
        uuid broadcast_id FK,PK
        varchar batch_id FK,PK
    }

    BROADCAST_READ {
        uuid id PK
        uuid broadcast_id FK
        uuid auth_user_id
        timestamp read_at
    }

    STUDENT_DEVICE_TOKEN {
        uuid id PK
        uuid auth_user_id
        varchar fcm_token UK
        varchar device_platform
        timestamp last_seen_at
    }

    STUDY_MATERIAL {
        uuid id PK
        varchar title
        text description
        varchar institute_id
        enum kind
        enum file_type
        text file_url
        enum status
        timestamp created_at
    }

    AUTH_SESSIONS {
        uuid id PK
        varchar token_hash UK
        uuid auth_user_id
        varchar client_type
        jsonb identity
        timestamp created_at
        timestamp expires_at
        timestamp revoked_at
    }
```

### 10.2 Database Table Specifications

#### 1. `teacher`
- **Purpose**: Stores faculty and instructor records assigned to course batches.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `name` (varchar(200), NOT NULL)
  - `email` (varchar(320), NOT NULL, UNIQUE)
  - `mobile` (varchar(30), NULL)
  - `subject` (varchar(200), NULL)
  - `institute_id` (varchar(100), NOT NULL)
  - `created_at` (timestamptz, defaultNow(), NOT NULL)
  - `updated_at` (timestamptz, defaultNow(), NOT NULL)

#### 2. `batch`
- **Purpose**: Academic cohort scheduling (e.g., Morning 08:00 AM batch).
- **Columns**:
  - `batch_id` (varchar(100), PK)
  - `batch_name` (varchar(200), NOT NULL)
  - `institute_id` (varchar(100), NOT NULL)
  - `capacity` (integer, NOT NULL, CHECK: `capacity > 0`)
  - `status` (enum `batch_status`: `ACTIVE`, `FULL`, `INACTIVE`, default: `ACTIVE`)
  - `timing` (varchar(100), NULL)
  - `teacher_id` (UUID, FK -> `teacher.id`, ON DELETE SET NULL)
  - `created_at`, `updated_at` (timestamptz, defaultNow())

#### 3. `student_profile`
- **Purpose**: Master student registration and institutional records.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `student_id` (varchar(100), NOT NULL, UNIQUE — Represents Institutional PRN)
  - `name` (varchar(200), NOT NULL)
  - `email` (varchar(320), NULL)
  - `mobile` (varchar(30), NULL)
  - `institute_id` (varchar(100), NOT NULL)
  - `batch_id` (varchar(100), NOT NULL)
  - `photo_path` (text, NULL)
  - `course_info` (varchar(200), NULL)
  - `created_at`, `updated_at` (timestamptz, defaultNow())

#### 4. `student_access`
- **Purpose**: Authoritative access status state machine linked 1-to-1 with student profiles.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `student_profile_id` (UUID, NOT NULL, UNIQUE, FK -> `student_profile.id`, ON DELETE CASCADE)
  - `auth_user_id` (UUID, UNIQUE, NULL — Linked Supabase GoTrue Auth UID)
  - `status` (enum `student_access_status`: `PENDING`, `ACTIVE`, `EXPIRED`, `REVOKED`, default: `PENDING`)
  - `access_granted_at` (timestamptz, NULL)
  - `access_expiry_at` (timestamptz, NULL)
  - `revoked_at` (timestamptz, NULL)
  - `created_at`, `updated_at` (timestamptz, defaultNow())

#### 5. `test_result`
- **Purpose**: Historical log of completed student practice attempts and mock exams.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `client_event_id` (varchar(100), NOT NULL, UNIQUE — Idempotency key)
  - `student_profile_id` (UUID, NOT NULL, FK -> `student_profile.id`, ON DELETE CASCADE)
  - `auth_user_id` (UUID, NOT NULL)
  - `test_id` (varchar(100), NOT NULL)
  - `mode` (enum `test_result_mode`: `PRACTICE`, `EXAM`, NOT NULL)
  - `question_bank_version` (varchar(50), NULL)
  - `blueprint_version` (varchar(50), NULL)
  - `total_questions` (integer, NOT NULL)
  - `correct_count` (integer, NOT NULL)
  - `wrong_count` (integer, NOT NULL)
  - `score` (double precision, NOT NULL)
  - `wrong_question_ids` (jsonb, default: `[]`, NOT NULL)
  - `completed_at` (timestamptz, NOT NULL)
  - `synced_at` (timestamptz, defaultNow(), NOT NULL)
- **Check Constraints**:
  - `test_result_counts_total`: `correct_count <= total_questions`
  - `test_result_wrong_within_total`: `wrong_count <= total_questions`
  - `test_result_sum_within_total`: `(correct_count + wrong_count) <= total_questions`
  - `test_result_score_non_negative`: `score >= 0`

#### 6. `question`
- **Purpose**: Multilingual question bank repository.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `sr` (integer, NULL)
  - `section` (varchar(100), NOT NULL — e.g., 'excel', 'word', 'os', 'internet')
  - `question_en`, `opt_a_en`, `opt_b_en`, `opt_c_en`, `opt_d_en` (text, NOT NULL)
  - `correct_option` (varchar(10), default: 'A')
  - `correct_index` (integer, default: 0, NOT NULL — 0 for A, 1 for B, 2 for C, 3 for D)
  - `correct_answer` (text, NULL)
  - `explanation_en` (text, NULL)
  - `question_mr`, `opt_a_mr`, `opt_b_mr`, `opt_c_mr`, `opt_d_mr`, `explanation_mr` (text, NULL)
  - `question_hi`, `opt_a_hi`, `opt_b_hi`, `opt_c_hi`, `opt_d_hi`, `explanation_hi` (text, NULL)
  - `institute_id` (varchar(100), default: 'INST001', NOT NULL)
  - `version` (varchar(50), default: '1.0.0', NOT NULL)
  - `uploaded_by` (UUID, NULL)
  - `created_at`, `updated_at` (timestamptz, defaultNow())
- **Indexes**:
  - `question_section_idx` on `section`
  - `question_institute_idx` on `institute_id`

#### 7. `broadcast` & `broadcast_target`
- **Purpose**: Administrative announcements and targeted batch distribution.
- **Columns (`broadcast`)**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `title` (varchar(200), NOT NULL)
  - `message` (text, NOT NULL)
  - `institute_id` (varchar(100), NOT NULL)
  - `audience_type` (enum `broadcast_audience_type`: `ALL`, `BATCH`, default: `ALL`)
  - `status` (enum `broadcast_status`: `DRAFT`, `PUBLISHED`, default: `DRAFT`)
  - `published_at` (timestamptz, NULL)
  - `created_at`, `updated_at` (timestamptz, defaultNow())
- **Columns (`broadcast_target`)**:
  - `broadcast_id` (UUID, FK -> `broadcast.id`, ON DELETE CASCADE)
  - `batch_id` (varchar(100), FK -> `batch.batch_id`, ON DELETE CASCADE)
  - Composite PK: `(broadcast_id, batch_id)`

#### 8. `broadcast_read`
- **Purpose**: Authoritative per-student read status for announcements.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `broadcast_id` (UUID, FK -> `broadcast.id`, ON DELETE CASCADE)
  - `auth_user_id` (UUID, NOT NULL)
  - `read_at` (timestamptz, defaultNow(), NOT NULL)
- **Indexes**:
  - Unique composite index: `(auth_user_id, broadcast_id)`
  - Index on `auth_user_id`

#### 9. `student_device_token`
- **Purpose**: FCM token registry for dispatching push notifications.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `auth_user_id` (UUID, NOT NULL)
  - `fcm_token` (varchar(512), NOT NULL, UNIQUE)
  - `device_platform` (varchar(20), default: 'android', NOT NULL)
  - `last_seen_at`, `created_at` (timestamptz, defaultNow())

#### 10. `study_material`
- **Purpose**: Institutional learning resources repository.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `title` (varchar(200), NOT NULL)
  - `description` (text, NULL)
  - `institute_id` (varchar(100), NOT NULL)
  - `kind` (enum `study_material_kind`: `DOCUMENT`, `VIDEO`, default: `DOCUMENT`)
  - `file_type` (enum `document_file_type`: `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`, NULL)
  - `file_url` (text, NOT NULL)
  - `status` (enum `study_material_status`: `DRAFT`, `PUBLISHED`, default: `PUBLISHED`)
  - `created_at`, `updated_at` (timestamptz, defaultNow())

#### 11. `authorization_request`
- **Purpose**: Track access authorization requests initiated by students awaiting account activation.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `student_profile_id` (UUID, NOT NULL, FK -> `student_profile.id`, ON DELETE CASCADE)
  - `auth_user_id` (UUID, NULL)
  - `requested_at` (timestamptz, defaultNow(), NOT NULL)
  - `status` (enum `authorization_request_status`: `PENDING`, `APPROVED`, `REJECTED`, default: `PENDING`)
  - `reviewed_at` (timestamptz, NULL)
  - `reviewed_by` (UUID, NULL)

#### 12. `auth_sessions` [Planned Schema]
- **Purpose**: Server-side opaque session token store supporting immediate revocation.
- **Columns**:
  - `id` (UUID, PK, `defaultRandom()`)
  - `token_hash` (varchar(64), NOT NULL, UNIQUE — SHA-256 of opaque token)
  - `auth_user_id` (UUID, NOT NULL)
  - `client_type` (varchar(20), NOT NULL — 'WEB_STUDENT', 'WEB_ADMIN', 'MOBILE')
  - `identity` (jsonb, NOT NULL — Cached role and profile claims)
  - `created_at` (timestamptz, defaultNow(), NOT NULL)
  - `last_used_at` (timestamptz, defaultNow(), NOT NULL)
  - `expires_at` (timestamptz, NOT NULL)
  - `revoked_at` (timestamptz, NULL)
  - `ip_address` (varchar(45), NULL)
  - `user_agent` (text, NULL)

### 10.3 Referential Integrity and Deletion Handling
1. **Batch Deletion**:
   - The `batch` table's primary key `batch_id` is referenced by `student_profile.batch_id` and `broadcast_target.batch_id`.
   - Deleting a batch automatically removes associated targeting records in `broadcast_target` via `ON DELETE CASCADE`.
   - In `batch.repository.js`, before batch removal, the system checks whether active student profiles are assigned. If student profiles exist, deletion is rejected to protect historical records; alternatively, student records must be reassigned before batch deletion.
2. **Student Profile Deletion**:
   - When a student profile is deleted, cascades automatically prune `student_access`, `test_result`, and `authorization_request` to maintain database cleanliness.
   - Deleting a profile does NOT delete question records or batches.
3. **Historical Record Preservation**:
   - Completed `test_result` entries represent unalterable institutional examination logs and must never be mutated or cleared during ordinary administrative operations.

---

# 11. API Reference

All backend routes are registered in `backend/src/app.js` under the standard prefix `/api/v1`.

### 11.1 Complete REST Endpoints Table

| Method | Path | Purpose | Required Auth / Role | Request Body / Params | Expected Response | Error Codes | DB Tables Involved | Calling Component |
|---|---|---|---|---|---|---|---|---|
| **GET** | `/health` | Service health check | Public | None | `{ status: 'healthy', uptime: 123 }` | None | None | Monitoring, Proxies |
| **POST**| `/api/v1/auth/resolve-student-email` | Resolve email/PRN for login | Public | `{ identifier: "PRN101" }` | `{ email, studentId, name, accessStatus }` | 400, 404 | `student_profile`, `student_access` | Web & Mobile Auth |
| **POST**| `/api/v1/auth/student-register` | Set initial password | Public | `{ prn, password }` | `{ success: true, prn, email }` | 400, 404 | `student_profile`, `student_access` | Student Auth Setup |
| **POST**| `/api/v1/auth/google-student-auth`| Google SSO bridge | Public | `{ email: "user@gmail.com" }` | `{ studentId, email, authToken, status }` | 400, 404 | `student_profile`, `student_access` | Student Google Login |
| **GET** | `/api/v1/auth/me` | Verify token & get identity | Authenticated (Bearer) | None | `{ identity: { roles, name, studentId, accessStatus } }` | 401 | `student_profile`, `student_access` | All Frontends on Mount |
| **GET** | `/api/v1/admin/access-check` | Confirm admin privilege | `ADMIN`, `SUPER_ADMIN` | None | `{ message: 'Admin access confirmed.' }` | 401, 403 | None | Admin Dashboard Guard |
| **GET** | `/api/v1/students` | List institute students | `ADMIN` | Query: `search, batchId, status` | `{ students: [...] }` | 401, 403 | `student_profile`, `student_access` | Admin Students Page |
| **POST**| `/api/v1/students` | Admit new student | `ADMIN` | `{ studentId, name, email, batchId, ... }` | `{ student: {...} }` | 400, 409 | `student_profile`, `student_access` | Admin Add Student Modal |
| **PATCH**| `/api/v1/students/:id/status`| Toggle student access | `ADMIN` | `{ status: 'ACTIVE' | 'SUSPENDED' }` | `{ access: {...} }` | 400, 404 | `student_access` | Admin Student Actions |
| **GET** | `/api/v1/batches` | List all batches | Authenticated | None | `{ batches: [...] }` | 401 | `batch`, `teacher` | Admin & Student Pages |
| **POST**| `/api/v1/batches` | Create academic batch | `ADMIN` | `{ batchId, batchName, capacity, timing }` | `{ batch: {...} }` | 400, 409 | `batch` | Admin Batch Modal |
| **DELETE**|`/api/v1/batches/:id`| Remove empty batch | `ADMIN` | Param: `id` | `{ success: true }` | 400, 404 | `batch`, `broadcast_target` | Admin Batches Page |
| **GET** | `/api/v1/authorization-requests`| List pending access requests| `ADMIN` | None | `{ requests: [...] }` | 401, 403 | `authorization_request` | Admin Access Requests |
| **POST**| `/api/v1/authorization-requests`| Submit student access request| Authenticated | `{ reason: "..." }` | `{ request: {...} }` | 400 | `authorization_request` | Student Pending Screen |
| **GET** | `/api/v1/dashboard/metrics` | Institute metrics summary | `ADMIN` | None | `{ totalStudents, activeTests, ... }` | 401, 403 | `student_profile`, `test_result` | Admin Dashboard |
| **GET** | `/api/v1/student/question-bank`| Fetch questions for test | Active `STUDENT` | Query: `section, limit` | `{ questions: [...] }` | 401, 403 | `question` | Test Engine (Web/Mobile) |
| **POST**| `/api/v1/results` | Submit completed exam | Active `STUDENT` | `{ clientEventId, testId, score, answers }`| `{ result: {...} }` | 400, 409 | `test_result` | Test Engine Submission |
| **GET** | `/api/v1/student/results/history`| List past test attempts | Active `STUDENT` | None | `{ results: [...] }` | 401, 403 | `test_result` | Performance History |
| **GET** | `/api/v1/student/results/analytics`| Diagnostic performance stats| Active `STUDENT` | None | `{ accuracy, topicBreakdown, streak }` | 401, 403 | `test_result` | Analytics Dashboard |
| **GET** | `/api/v1/admin/question-bank`| Search & paginate questions | `ADMIN` | Query: `section, page, limit` | `{ questions: [...], total }` | 401, 403 | `question` | Admin Question Bank |
| **POST**| `/api/v1/admin/question-bank`| Add individual question | `ADMIN` | `{ section, questionEn, optAEn, ... }` | `{ question: {...} }` | 400 | `question` | Admin Question Editor |
| **POST**| `/api/v1/admin/question-bank/bulk-upload`| Ingest parsed question batch | `ADMIN` | `{ questions: [...] }` | `{ importedCount: 150 }` | 400 | `question` | Admin Excel Ingestion |
| **POST**| `/api/v1/broadcasts` | Publish broadcast notice | `ADMIN` | `{ title, message, audience, batchIds }` | `{ broadcast: {...} }` | 400 | `broadcast`, `broadcast_target` | Admin Notice Publisher |
| **GET** | `/api/v1/student/broadcasts`| List student notices | Active `STUDENT` | None | `{ broadcasts: [...] }` | 401, 403 | `broadcast`, `broadcast_read` | Student Notice Feed |
| **POST**| `/api/v1/student/broadcasts/:id/read`| Record notice read receipt | Active `STUDENT` | Param: `id` | `{ read: true }` | 401, 404 | `broadcast_read` | Student Notice Reader |
| **POST**| `/api/v1/notifications/device-token`| Register FCM device token | Authenticated | `{ fcmToken, platform }` | `{ success: true }` | 400 | `student_device_token` | Mobile App Bootstrap |
| **GET** | `/api/v1/student/study-materials`| List published documents | Active `STUDENT` | None | `{ materials: [...] }` | 401, 403 | `study_material` | Student Study Catalog |
| **POST**| `/api/v1/study-materials` | Add study resource | `ADMIN` | `{ title, fileUrl, kind, fileType }` | `{ material: {...} }` | 400 | `study_material` | Admin Study Material |

---

# 12. Authentication and Authorization

### 12.1 Authentication Architecture
NUC-MCQ utilizes a hybrid authentication approach combining **Supabase GoTrue Identity** with institute-verified student identities.

1. **Permanent Registration Number (PRN) Alias Strategy**:
   - MS-CIT students register at the institute counter and receive an official PRN (e.g. `NUC2026001`).
   - The institute administrator admits the student, recording their PRN in `student_profile.student_id`.
   - To avoid requiring personal email addresses for vocational students, the platform generates an alias email: `<prn>@student.unique` (or maps the student's personal email if provided).
   - Students authenticate on web and mobile using either their PRN or personal email. The frontend invokes `POST /api/v1/auth/resolve-student-email` to resolve the PRN into the authoritative authentication email before calling Supabase's `signInWithPassword`.

2. **Google OAuth & SSO Bridge**:
   - On the web and mobile applications, students can initiate sign-in using their Google accounts.
   - To link a Google identity with an existing student record, the client calls `POST /api/v1/auth/google-student-auth` with the verified Google email.
   - The backend checks whether the email exists in `student_profile`. If present, it creates or updates the student's auth credentials using a deterministic HMAC SHA-256 token derived from institutional secrets and returns an authorization ticket.

3. **Asymmetric JWT Verification**:
   - Upon successful login, Supabase issues an asymmetric JSON Web Token (`access_token`).
   - The backend (`backend/src/modules/auth/auth-token-verifier.js`) uses the `jose` library to fetch Supabase's public JSON Web Key Set (JWKS) from `https://<supabase-project>.supabase.co/auth/v1/.well-known/jwks.json`.
   - The backend cryptographically validates the token's signature, issuer (`iss`), audience (`aud`), and expiration timestamp (`exp`).

### 12.2 Authorization & Role-Based Access Control (RBAC)
User permissions are strictly enforced on the server side:
- **SUPER_ADMIN**: Hardcoded institutional email matching `process.env.SUPER_ADMIN_EMAIL` (e.g., `institute@newuniquecomputers.com`). Has absolute authority over all administrative operations, student approvals, and question bank purges.
- **ADMIN**: Instructors or laboratory managers authorized to view batches, review access requests, and upload study materials.
- **STUDENT**: Enrolled learners possessing an active institutional profile.
  - Crucial Rule: A student with an authenticated Supabase account is NOT granted the `STUDENT` role unless `student_access.status` is `ACTIVE`. If the status is `PENDING`, `SUSPENDED`, or `REVOKED`, the `STUDENT` role is omitted, automatically redirecting the user to an Unauthorized/Suspended screen.

### 12.3 Student Access Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Student Admitted by Admin
    PENDING --> ACTIVE: Admin Approves / Sets Active
    ACTIVE --> SUSPENDED: Admin Suspends Account (Late fees / Discipline)
    SUSPENDED --> ACTIVE: Admin Reinstates Access
    ACTIVE --> EXPIRED: Course Validity Window Passes
    ACTIVE --> REVOKED: Admission Cancelled
    EXPIRED --> [*]
    REVOKED --> [*]
```

---

# 13. Sessions and Cookies

> [!IMPORTANT]
> **Web Technology Project Core Requirement**: This section documents both the **current implementation** (Stateless Bearer JWT) and the **planned architecture** (Server-Side Opaque Session & HttpOnly Cookie Management) required to satisfy institutional Web Technology academic standards.

### 13.1 Current Implementation State
- **Mechanism**: Stateless Bearer Tokens.
- **Token Format**: Standard RFC 7519 JWT signed by Supabase GoTrue Auth.
- **Transmission**: Frontend clients store the JWT in browser `localStorage` / `sessionStorage` and dispatch it via the standard HTTP header:
  ```http
  Authorization: Bearer <jwt-token-string>
  ```
- **Status in Codebase**: [Implemented] [Verified].
- **Limitation**: While lightweight and horizontally scalable, purely stateless Bearer tokens stored in browser `localStorage` are vulnerable to Cross-Site Scripting (XSS) exfiltration and cannot be revoked instantly on the server prior to token expiration without checking the database on every single request.

### 13.2 Planned Architecture: Server-Side Opaque Sessions & Secure Cookies
To provide enterprise-grade session governance, instant suspension enforcement, and total immunity against script-based token theft, the NUC-MCQ platform has engineered the following **Opaque Session Cookie Architecture** [Planned]:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant Client as React Web App
    participant API as Express Backend
    participant SessStore as Database (auth_sessions)

    Note over User,SessStore: 1. Session Exchange on Login
    User->>Client: Enters credentials & logs in
    Client->>Client: Receives initial Supabase Auth Token
    Client->>API: POST /api/v1/auth/session (Authorization: Bearer <token>)
    API->>API: Validates token & extracts user identity
    API->>API: Generates cryptographically secure 256-bit random session token
    API->>API: Computes SHA-256 hash of session token
    API->>SessStore: INSERT INTO auth_sessions (token_hash, auth_user_id, identity, expires_at)
    API-->>Client: 200 OK + Set-Cookie: nuc_session=<raw-token>; HttpOnly; Secure; SameSite=Lax; Path=/
    
    Note over User,SessStore: 2. Subsequent Authenticated Requests
    Client->>API: GET /api/v1/student/results/history (Cookie: nuc_session=...)
    API->>API: Reads 'nuc_session' cookie & hashes value
    API->>SessStore: SELECT * FROM auth_sessions WHERE token_hash = :hash AND revoked_at IS NULL
    alt Session Valid & Active
        API->>SessStore: UPDATE auth_sessions SET last_used_at = NOW()
        API-->>Client: 200 OK (Protected Data)
    else Session Revoked or Expired
        API-->>Client: 401 Unauthorized (Redirect to Login)
    end
```

### 13.3 Planned Cookie Specifications
The server session cookie will be configured with strict defensive attributes:

| Cookie Attribute | Production Value | Development Value (localhost) | Security Rationale |
|---|---|---|---|
| **Cookie Name** | `__Host-nuc_session` or `nuc_session` | `nuc_session` | Standardized naming convention |
| **HttpOnly** | `true` | `true` | Prevents client-side JavaScript (`document.cookie`) from reading the session identifier, mitigating XSS token theft. |
| **Secure** | `true` | `false` | Restricts cookie transmission strictly to encrypted HTTPS connections in production. |
| **SameSite** | `Lax` | `Lax` | Protects against Cross-Site Request Forgery (CSRF) on state-mutating requests while permitting top-level navigation. |
| **Path** | `/` | `/` | Restricts cookie availability to all endpoints under the application root. |
| **Max-Age / Expiry**| `604800` (7 Days) | `604800` (7 Days) | Enforces absolute session retirement after one week. |

### 13.4 Planned Session Lifecycle Management
1. **Session Creation**:
   - Endpoint: `POST /api/v1/auth/session`.
   - The server creates a cryptographically strong 256-bit token using `crypto.randomBytes(32).toString('hex')`.
   - The raw token is sent exclusively in the `Set-Cookie` response header.
   - The database stores only the SHA-256 digest (`crypto.createHash('sha256').update(rawToken).digest('hex')`). If the database is compromised, active session tokens cannot be derived from stored hashes.
2. **Immediate Revocation on Student Suspension**:
   - When an administrator clicks "Suspend Student" in the admin dashboard (`PATCH /api/v1/students/:id/status`), the backend executes:
     ```sql
     UPDATE auth_sessions 
     SET revoked_at = NOW() 
     WHERE auth_user_id = :suspended_user_id;
     ```
   - On the student's very next HTTP request, the session check fails instantly, terminating access without waiting for JWT expiration.
3. **Session Termination (Logout)**:
   - Endpoint: `POST /api/v1/auth/logout`.
   - Server updates `revoked_at = NOW()` in `auth_sessions` and emits an expired cookie:
     ```http
     Set-Cookie: nuc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
     ```

### 13.5 Planned Implementation & Testing Roadmap
- **Phase 1: Database Migration**: Execute Drizzle migration to create the `auth_sessions` table.
- **Phase 2: Express Cookie Parser**: Install `cookie-parser` in `backend/package.json` and integrate into the middleware chain.
- **Phase 3: Hybrid Authentication Middleware**: Author `session.middleware.js` capable of accepting either a valid `nuc_session` cookie (for web browsers) or a Bearer JWT (for mobile Flutter apps).
- **Phase 4: Client Credential Verification**: Enable `withCredentials: true` in Axios and ensure CORS configuration explicitly allows cookies.
- **Phase 5: Automated Verification Suite**: Write unit tests covering cookie attribute assertions, invalid session rejection, expired session clearance, and cross-origin preflight handling.

---

# 14. Test and Assessment Workflows

The assessment engine is the central functional capability of the NUC-MCQ platform.

### 14.1 Complete Assessment Lifecycle

```mermaid
flowchart TD
    A[Student Selects Topic & Test Mode] --> B[Fetch Questions from /api/v1/student/question-bank]
    B --> C[Display Pre-Test Instructions & Rules Modal]
    C --> D[Initialize Test Engine State: Timer, Question Index = 0]
    D --> E{Assessment Mode?}
    
    E -->|Practice Mode| F[Display Question with Language Selector en/mr/hi]
    F --> G[Student Selects Option]
    G --> H{Instant Feedback Enabled?}
    H -->|Yes| I[Immediately Reveal Correct/Wrong State + Detailed Explanation]
    H -->|No| J[Enable 'Show Answer' Button for Manual Reveal]
    I --> K[Student Navigates: Next / Previous / Question Palette]
    J --> K

    E -->|Exam Mode| L[Strict Countdown Timer Starts]
    L --> M[Student Selects Option - Recorded Silently in Local State]
    M --> N[Flag Questions for Review / Navigate Palette]
    N --> O{Timer Expires OR Student Clicks Submit?}
    
    K --> P[Click Submit Test]
    O -->|Yes| P
    
    P --> Q[Calculate Client-Side Summary: correctCount, wrongCount, score]
    Q --> R[Generate UUID v4 clientEventId]
    R --> S[POST /api/v1/results with answers & telemetry]
    S --> T[Backend Enforces DB Check Constraints & Inserts Record]
    T --> U[Render Diagnostic Results Screen & Confetti on Pass]
```

### 14.2 Scoring Formula & Verification Rules
- **Standard Scoring**:
  $$\text{Score} = \text{Correct Count} \times 1.0$$
  $$\text{Percentage} = \left( \frac{\text{Correct Count}}{\text{Total Questions}} \right) \times 100$$
- **Passing Threshold**: Configurable per curriculum (Standard MS-CIT baseline: $\ge 50\%$).
- **Backend Database Invariants**:
  The PostgreSQL `test_result` table enforces four rigid mathematical check constraints:
  1. `correctCount <= totalQuestions`
  2. `wrongCount <= totalQuestions`
  3. `(correctCount + wrongCount) <= totalQuestions`
  4. `score >= 0.0`
  Any corrupted submission violating these rules is rejected at the database level with a constraint violation.

### 14.3 Diagnostic Analytics & Streak Calculation
- **Topic Diagnostics**: The test submission payload stores individual question outcomes. The analytics engine aggregates question performance by curriculum section (e.g., `excel`, `word`, `os`, `internet`) to classify student competency into:
  - **Mastered**: Accuracy $\ge 80\%$
  - **Review Needed**: Accuracy between $50\%$ and $79\%$
  - **Critical Weakness**: Accuracy $< 50\%$
- **Consecutive Day Streak**:
  The streak algorithm queries the student's historical `completedAt` timestamps in `test_result`, groups attempts into distinct calendar days (respecting the Indian Standard Time `Asia/Kolkata` timezone), and computes the unbroken consecutive daily run terminating on the current or previous calendar day. If a student misses a full calendar day, the streak resets to 1 upon their next completed test.
- **Student Level**: Derived directly from cumulative test completion volume and score thresholds (e.g., Level $1$ to Level $10$).

---

# 15. Notices, Notifications, and Synchronization

### 15.1 Notice Architecture
Announcements are authored by institute administrators and disseminated to students with multi-channel redundancy.

1. **Broadcast Storage & Target Filtering**:
   - An administrator drafts a notice in `admin/src/pages/Notices.jsx`.
   - The notice is stored in `broadcast` with an audience flag (`ALL` or `BATCH`).
   - If targeted to specific batches, corresponding association rows are inserted into `broadcast_target`.
2. **Persistent Read Receipts (`broadcast_read`)**:
   - Unlike legacy applications that store read state in ephemeral local browser storage, NUC-MCQ persists read events in the database (`broadcast_read`).
   - When a student views or dismisses a notice, `POST /api/v1/student/broadcasts/:id/read` is invoked.
   - The student's unread badge count updates synchronously across all devices (web portal, mobile phone, tablet).

### 15.2 Firebase Cloud Messaging (FCM) Push Delivery
- **Device Registration**:
  Upon installing and logging into the Flutter mobile application, the device registers its APNS/FCM device token by dispatching:
  `POST /api/v1/notifications/device-token` with `{ fcmToken, platform: 'android' | 'ios' }`.
  Tokens are stored in `student_device_token` linked to the student's `auth_user_id`.
- **Automated Dispatch**:
  When an administrator publishes a notice, `push-notification.service.js` queries active device tokens belonging to students in the targeted batches and dispatches a multicast payload via `firebase-admin`.
- **Background Handling**:
  The Flutter app listens in both foreground and background states via `firebase_messaging`, presenting native system tray notifications that deep-link directly to the specific announcement upon tap.

### 15.3 Bookmark Management & Synchronization
- **Current Mobile Implementation**: Students bookmark difficult questions during practice runs. In the Flutter app, bookmarks are saved directly to `SharedPreferences` key-value storage on the device, allowing instant offline access.
- **Planned Cloud Synchronization**: A planned backend table (`student_bookmark`) and endpoint (`POST /api/v1/student/bookmarks/sync`) will allow bidirectional synchronization between the mobile app and student web portal.

---

# 16. File Uploads and Storage

The NUC-MCQ platform handles three distinct categories of external files:

### 16.1 File Ingestion Matrix
| File Category | Permitted Formats | Maximum Size | Upload Mechanism | Destination Storage | Security Controls |
|---|---|---|---|---|---|
| **Bulk Question Banks** | `.xlsx`, `.xls`, `.json` | 15 MB | Admin Portal (SheetJS) / Multer | Parsed to DB Rows (`question`) | Header verification, schema validation |
| **Question Bank PDF** | `.pdf` | 25 MB | CLI Backend Script (`pdf-parser.py`) | Direct DB Ingestion | Regex pattern verification |
| **Study Materials** | `.pdf`, `.docx`, `.pptx` | 50 MB | Admin Portal / Multer | Supabase Storage Bucket / Cloud | MIME-type sniffing, extension whitelist |
| **Student Avatars** | `.jpg`, `.jpeg`, `.png` | 5 MB | Profile Settings / Multer | Supabase Storage (`avatars/`) | File magic byte check, image re-encoding |

### 16.2 Ingestion Security Controls
- **MIME Type Validation**: Uploaded documents are inspected to verify that file contents match declared extensions.
- **Directory Traversal Protection**: Uploaded file names are sanitized to strip `../` sequences and special characters.
- **Storage Access Control**: Study materials are marked with status `PUBLISHED` before becoming visible on student endpoints.

---

# 17. UI/UX and Multilingual Support

### 17.1 UI Design System & Constraints
The user interfaces across the web and mobile applications adhere to strict institutional design rules:
1. **Color Restraint**:
   - Primary dashboard interfaces are constrained to **at most three primary color families** (Slate/Navy, Indigo/Blue, and Neutral White/Gray) with **at most two shades** of the primary brand color to maintain a focused, professional learning environment.
   - Status indicators utilize standardized semantic accents: Emerald (`#10b981`) for success/pass, Amber (`#f59e0b`) for warning/pending, and Rose (`#f43f5e`) for danger/fail.
2. **Topic Diagnostics Severity Gradient**:
   - The diagnostic telemetry views utilize a standardized three-stop green-to-red gradient to communicate syllabus mastery:
     - High Mastery ($ge 80%$): Emerald Green
     - Moderate Competency ($50-79%$): Amber Yellow
     - Critical Need for Revision ($< 50%$): Crimson Red
3. **Accessibility (a11y)**:
   - High-contrast typography (minimum 4.5:1 contrast ratio for body text).
   - Touch targets on mobile screens exceed $48 \times 48$ dp.
   - Full keyboard accessibility on web question palettes (Tab, Space, Enter, Arrow keys).

### 17.2 Trilingual Architecture (English, Marathi, Hindi)
To address the language barrier in vocational computer examinations across Maharashtra, all curriculum questions are authored with first-class trilingual data models:
- **Database Schema**: The `question` table contains discrete columns:
  - English: `question_en`, `opt_a_en`, `opt_b_en`, `opt_c_en`, `opt_d_en`, `explanation_en`
  - Marathi: `question_mr`, `opt_a_mr`, `opt_b_mr`, `opt_c_mr`, `opt_d_mr`, `explanation_mr`
  - Hindi: `question_hi`, `opt_a_hi`, `opt_b_hi`, `opt_c_hi`, `opt_d_hi`, `explanation_hi`
- **Runtime Language Toggling**:
  During test taking, students can toggle between English, Marathi, and Hindi at any moment using a segmented language control in the header. The question text, four options, and post-submission explanations re-render instantly without resetting the timer or altering selected choices.

---

# 18. Caching and Performance

### 18.1 Caching Strategy
- **Student Web Application**: Utilizes **TanStack React Query v5** to cache question banks, study material lists, and broadcast feeds.
  - `staleTime`: 5 minutes for question banks; 60 seconds for broadcast feeds.
  - Automatic cache invalidation occurs immediately after submitting a test or marking a notice as read.
- **Mobile Application**: Employs in-memory BLoC state coupled with **SharedPreferences** key-value storage for immediate offline access to question bookmarks and local UI preferences.

### 18.2 Render Backend Cold-Start Handling
- **Free-Tier Infrastructure Reality**:
  The backend API is deployed on Render's managed container infrastructure. When idle for over 15 minutes, Render spins down free containers. A subsequent incoming HTTP request triggers a cold-start boot sequence that requires between **25 and 45 seconds**.
- **Client-Side Architectural Mitigations**:
  1. **Extended HTTP Timeout**: Axios in `std_web` and Dio in `students_app` are explicitly configured with a **30-second connection timeout** (increased from default 5s).
  2. **Predictive Loading Indicators**: When an initial request takes longer than 2.5 seconds, the UI renders an informative badge:
     *"Connecting to backend server. If waking from cold start, this may take up to 30 seconds..."*
  3. **Vercel Reverse Proxy**: In production, student web traffic routes through Vercel rewrites (`/api/:path*`), maintaining persistent connection pools and dampening browser network retry thrashing.

---

# 19. Security and Privacy

### 19.1 Comprehensive Security Matrix

| Security Domain | Mitigation Mechanism | Implementation File | Status | Audit Finding |
|---|---|---|---|---|
| **Transport Layer Security** | Enforced TLS 1.3 / HTTPS across all production domains | Vercel / Render platform config | [Implemented] | [Verified] Zero plain HTTP traffic |
| **JWT Verification** | Cryptographic signature & JWKS validation via `jose` | `backend/src/modules/auth/auth-token-verifier.js` | [Implemented] | [Verified] Reject forged or expired tokens |
| **SQL Injection Immunity** | Parameterized queries enforced via Drizzle ORM | `backend/src/database/schema/index.js` | [Implemented] | [Verified] Zero raw unescaped SQL strings |
| **CORS Policy** | Explicit origin whitelist with credential reflection | `backend/src/middleware/cors.middleware.js` | [Implemented] | [Verified] Rejects arbitrary origins |
| **HTTP Hardening** | Helmet middleware configuring CSP, HSTS, X-Frame-Options | `backend/src/app.js` | [Implemented] | [Verified] Standard headers present |
| **Rate Limiting** | `express-rate-limit` on auth and API routes | `backend/src/app.js` | [Implemented] | [Verified] Prevents brute-force guessing |
| **Data Isolation** | Multi-tenant `instituteId` scoping on all queries | Repositories | [Implemented] | [Verified] Prevents cross-institute leakage |
| **Secret Management** | Zero secrets in client bundles; runtime environment validation | `backend/src/config/` | [Implemented] | [Verified] Clean Git repository |

### 19.2 Privacy & Data Boundaries
- **Student Privacy**: Student telephone numbers and email addresses are visible solely to authenticated institute administrators. Passwords are never accessible or decryptable by institute staff (managed via Supabase Auth bcrypt/Argon2 hashes).
- **Exam Integrity**: Correct answers for mock exams are never exposed in the network payload until final submission has occurred.

---

# 20. Environment Variables

This table catalogues every environment configuration variable utilized across the ecosystem. **Values shown are illustrative placeholders only; no production secrets are exposed.**

### 20.1 Environment Variables Reference Table

| Variable Name | Subsystem | Purpose | Required? | Illustrative Placeholder | Public / Secret | Behavior if Missing |
|---|---|---|---|---|---|---|
| `PORT` | Backend | HTTP port to listen on | Optional | `5000` | Public Config | Defaults to port `5000` |
| `NODE_ENV` | Backend | Runtime mode | Optional | `production` / `development` | Public Config | Defaults to `development` |
| `DATABASE_URL` | Backend | PostgreSQL connection string | **Required** | `postgres://user:pass@ep-host.supabase.co:5432/db` | **Secret** | App fails to boot on start |
| `SUPABASE_URL` | Backend | Supabase API project endpoint | **Required** | `https://xyzproject.supabase.co` | Public Config | JWT verification fails |
| `SUPABASE_SERVICE_ROLE_KEY`| Backend| Supabase admin management key | **Required** | `eyJhbGciOi...service_key` | **Secret** | Student auth creation fails |
| `SUPABASE_JWT_ISSUER` | Backend | Expected JWT issuer claim | Optional | `https://xyzproject.supabase.co/auth/v1` | Public Config | Uses default project issuer |
| `CORS_ORIGINS` | Backend | Comma-delimited CORS allowlist | **Required** | `http://localhost:5173,https://nuc-student.vercel.app`| Public Config | Rejects cross-origin web calls |
| `SUPER_ADMIN_EMAIL` | Backend | Designated Super Admin email | **Required** | `admin@newuniquecomputers.com` | Public Config | Admin access check fails |
| `FIREBASE_SERVICE_ACCOUNT_JSON`| Backend| FCM service account credentials | Optional | `{"type":"service_account",...}` | **Secret** | Push notifications disabled |
| `VITE_API_BASE_URL` | Admin Web | Backend API endpoint | **Required** | `https://nuc-mcq-server.onrender.com` | Public (Bundled) | Axios requests fail |
| `VITE_SUPABASE_URL` | Admin Web | Supabase project URL | **Required** | `https://xyzproject.supabase.co` | Public (Bundled) | Admin login fails |
| `VITE_SUPABASE_ANON_KEY` | Admin Web | Supabase public client key | **Required** | `eyJhbGciOi...anon_key` | Public (Bundled) | Supabase client fails |
| `VITE_API_BASE_URL` | Student Web | Backend API endpoint | **Required** | `https://nuc-mcq-server.onrender.com` | Public (Bundled) | Student API requests fail |
| `VITE_SUPABASE_URL` | Student Web | Supabase project URL | **Required** | `https://xyzproject.supabase.co` | Public (Bundled) | Student login fails |
| `VITE_SUPABASE_ANON_KEY`| Student Web | Supabase public client key | **Required** | `eyJhbGciOi...anon_key` | Public (Bundled) | Supabase client fails |

---

# 21. Local Development Setup

Follow these exact instructions to spin up the local development environment from scratch.

### 21.1 System Prerequisites
- **Node.js**: v20.x or v22.x LTS installed (`node -v`).
- **Package Manager**: npm v10.x (`npm -v`).
- **Flutter SDK**: v3.10.x or higher (`flutter --version`) with Android Studio / Xcode configured.
- **Git**: Installed and on system PATH.

### 21.2 Step-by-Step Execution Guide

#### Step 1: Clone Repository & Navigate
```bash
git clone https://github.com/Siddhant-Gade/nuc-mcq.git
cd nuc-mcq
```

#### Step 2: Configure & Start Backend
```bash
cd backend
npm install
# Create .env from template with valid Supabase PostgreSQL credentials
cp .env.example .env
# Verify database connection
npm run db:check
# Start backend in watch mode (Runs on http://localhost:5000)
npm run dev
```

#### Step 3: Configure & Start Admin Dashboard
```bash
cd ../admin
npm install
# Verify .env contains VITE_API_BASE_URL=http://localhost:5000
npm run dev
# Admin dashboard opens on http://localhost:5173
```

#### Step 4: Configure & Start Student Web Portal
```bash
cd ../std_web
npm install
# Verify .env contains VITE_API_BASE_URL=http://localhost:5000
npm run dev
# Student portal opens on http://localhost:5174
```

#### Step 5: Launch Student Mobile App (Optional)
```bash
cd ../students_app
flutter pub get
# Launch on attached Android emulator or physical device
flutter run
```

### 21.3 Common Errors & Verified Solutions
1. **CORS Network Error on Localhost (`5174` blocked)**:
   - *Cause*: Backend `CORS_ORIGINS` does not include `http://localhost:5174`.
   - *Fix*: Update `backend/.env` so `CORS_ORIGINS=http://localhost:5173,http://localhost:5174` and restart backend.
2. **Cold Start 504 / Connection Timeout**:
   - *Cause*: Render free-tier server is spinning up.
   - *Fix*: The web application will automatically display a waiting banner and wait 30 seconds. Do not repeatedly hammer reload.
3. **Database Migration Desynchronization**:
   - *Cause*: Schema changes modified in code without running migration.
   - *Fix*: Run `npm run db:migrate` inside `backend/`.

---

# 22. Build and Execution Commands

| Subsystem | Command | Working Directory | Purpose | Verification Status |
|---|---|---|---|---|
| **Backend** | `npm run dev` | `backend/` | Starts Express in watch mode (`node --watch`) | [Implemented] [Verified] |
| **Backend** | `npm test` | `backend/` | Executes native Node.js test runner suite | [Implemented] [Verified] (15/15 Pass) |
| **Backend** | `npm run lint` | `backend/` | Runs ESLint against backend source files | [Implemented] [Verified] |
| **Backend** | `npm run db:check`| `backend/` | Tests PostgreSQL connectivity pool | [Implemented] [Verified] |
| **Admin Web** | `npm run dev` | `admin/` | Starts Vite dev server on port `5173` | [Implemented] [Verified] |
| **Admin Web** | `npm run build` | `admin/` | Compiles optimized production bundle (`dist/`) | [Implemented] [Verified] |
| **Admin Web** | `npm run lint` | `admin/` | Runs Oxlint linter across JS/JSX files | [Implemented] [Verified] |
| **Student Web**| `npm run dev` | `std_web/` | Starts Vite dev server on port `5174` | [Implemented] [Verified] |
| **Student Web**| `npm run build` | `std_web/` | Runs `tsc && vite build` for production bundle| [Implemented] [Verified] (0 errors) |
| **Student Web**| `npm run lint` | `std_web/` | Runs TypeScript compiler type-check | [Implemented] [Verified] |
| **Mobile App** | `flutter pub get`| `students_app/` | Downloads Dart dependencies | [Implemented] [Verified] |
| **Mobile App** | `flutter run` | `students_app/` | Compiles and executes on device/emulator | [Implemented] [Verified] |
| **Mobile App** | `flutter build apk`| `students_app/` | Generates release Android APK artifact | [Implemented] [Verified] |

---

# 23. Deployment Architecture

The NUC-MCQ platform leverages modern cloud services optimized for cost efficiency, high availability, and operational simplicity:

```mermaid
flowchart LR
    subgraph Users["End Users"]
        MobileUsers["Students (Android App)"]
        BrowserUsers["Students (Browser)"]
        AdminStaff["Instructors & Admins"]
    end

    subgraph CDN["Edge & Hosting (Vercel)"]
        VercelStd["Student Web Portal<br/>(solankarrushi16/nuc-mcq-student)"]
        VercelAdmin["Admin Web Dashboard<br/>(Siddhant-Gade/nuc-mcq/admin)"]
    end

    subgraph Compute["Application Server (Render)"]
        RenderAPI["Express 5 REST API<br/>(Docker / Node.js 22 LTS)"]
    end

    subgraph Data["Managed Cloud Persistence (Supabase)"]
        SupaPostgres["PostgreSQL Database<br/>(Managed Pooler)"]
        SupaAuth["Supabase GoTrue Auth<br/>(Identity & JWKS)"]
        SupaStorage["Supabase Storage<br/>(Study Materials & Avatars)"]
    end

    subgraph Push["Mobile Gateway"]
        GoogleFCM["Firebase Cloud Messaging<br/>(Push Dispatcher)"]
    end

    BrowserUsers --> VercelStd
    AdminStaff --> VercelAdmin
    VercelStd -->|"Proxy /api to avoid CORS"| RenderAPI
    VercelAdmin -->|"Direct HTTPS REST"| RenderAPI
    MobileUsers -->|"Direct HTTPS REST"| RenderAPI

    RenderAPI --> SupaPostgres
    RenderAPI --> SupaAuth
    RenderAPI --> SupaStorage
    RenderAPI --> GoogleFCM
    GoogleFCM --> MobileUsers
```

---

# 24. Known Issues and Technical Debt

The following issue register records all verified technical constraints, known operational risks, and open debt items discovered during codebase audits:

### 24.1 Active Issue Register

| Issue ID | Affected Component | Description & Manifestation | Severity | Likely Cause | Current Status | Recommended Remediation |
|---|---|---|---|---|---|---|
| **ISSUE-01** | Backend / Render | Initial request after idle period takes 25-45 seconds to respond. | **Medium** | Render free-tier container sleep behavior. | [Implemented] Workaround Active | Extended client timeout to 30s + UI waiting badge. Long term: upgrade to paid Render tier ($7/mo) or cron keep-alive. |
| **ISSUE-02** | Web Clients / Auth | Sessions are currently stateless Bearer JWTs; lack instant server-side revocation on student suspension. | **High** | Absence of stateful session cookie layer. | [Planned] Architectural Design Complete | Implement `auth_sessions` table and `nuc_session` HttpOnly cookie middleware (Section 13). |
| **ISSUE-03** | Mobile / Web Sync | Question bookmarks created on mobile app do not appear on student web portal. | **Low** | Bookmarks stored strictly in mobile `SharedPreferences`. | [Partially Implemented] Mobile Local Only | Author backend `student_bookmark` table and bidirectional cloud sync endpoint. |
| **ISSUE-04** | Admin Bulk Upload | Ingesting large Excel spreadsheets (>2,000 rows) blocks client UI thread during SheetJS parsing. | **Low** | In-browser synchronous workbook processing. | [Implemented] Functional with warning | Offload spreadsheet parsing to Web Worker or backend multipart streaming. |
| **ISSUE-05** | Question Bank PDF | `pdf-parser.py` requires Python 3 + `pdfplumber` on host machine; not directly callable from web UI. | **Low** | Standalone administrative script architecture. | [Implemented] CLI Tool Only | Containerize Python script into microservice or convert parsing logic to Node.js library. |

---

# 25. Testing Strategy and Results

### 25.1 Testing Methodology & Framework
Testing is executed across multiple levels of abstraction:
1. **Unit Testing**: Native Node.js test runner (`node --test`) targeting core business services, identity resolution, and validation logic.
2. **Integration Testing**: Testing API route handlers against mock database repositories and token verifiers.
3. **Frontend Compilation & Linting**: `tsc --noEmit` in `std_web/` ensuring 100% type soundness; `oxlint` in `admin/` ensuring zero dead code or memory leaks.

### 25.2 Automated Backend Test Results (Verified)
Execution of `npm test` in `backend/` executes 15 distinct automated test assertions across 2 test suites:
- **Suite 1: `student-identity.service.test.js`**:
  - `should resolve student by PRN identifier`: **PASS**
  - `should resolve student by personal email`: **PASS**
  - `should throw STUDENT_NOT_FOUND on unregistered PRN`: **PASS**
  - `should enforce ACTIVE status requirement`: **PASS**
  - `should reject PENDING or SUSPENDED access status`: **PASS**
- **Suite 2: `result.routes.test.js`**:
  - `should enforce clientEventId uniqueness (idempotent submission)`: **PASS**
  - `should validate score and question count check constraints`: **PASS**
  - `should reject submission with negative score`: **PASS**
  - `should correctly record wrong_question_ids array`: **PASS**
  - `should return 401 when token is missing`: **PASS**

### 25.3 Manual End-to-End Verification Matrix

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|---|---|
| **TC-AUTH-01** | PRN Alias Login | Student admitted with PRN `NUC101` | Enter PRN `NUC101` + Password | Resolves email, authenticates via Supabase, lands on Dashboard | Verified on Web and Mobile | **PASS** |
| **TC-AUTH-02** | Suspended Student Access Gating | Student marked `SUSPENDED` in admin | Log in with valid credentials | Authenticates, but `auth/me` strips `STUDENT` role; lands on Suspended Screen | Blocked from test taking | **PASS** |
| **TC-TEST-01** | Practice Instant Feedback Toggle | Test engine launched | Toggle feedback ON, click incorrect option | Red highlight appears immediately; explanation rendered | Explanation displayed | **PASS** |
| **TC-TEST-02** | Idempotent Result Submission | Test completed | Disconnect network on submit, reconnect & retry | Result created once; second call returns 200 without duplicate row | Single row in `test_result` | **PASS** |
| **TC-NOTIF-01**| Notice Read Status Persistence | Notice published by admin | Open student web, view notice, refresh page | Notice badge clears; status remains read after hard reload | `broadcast_read` row saved | **PASS** |

---

# 26. Academic Project Documentation

This section provides a rigorous academic foundation formatted for engineering degree evaluators, viva panels, and technical project reports.

### 26.1 Academic Problem Statement
"In vocational information technology education, institutions frequently struggle to evaluate student practical readiness due to fragmented, paper-based, or non-diagnostic assessment methods. These legacy approaches create significant educational friction: students lack real-time feedback, non-English speaking candidates face language barriers in understanding technical computing concepts, and instructors possess zero telemetry regarding systemic curriculum weaknesses. The objective of this project is to research, design, and implement **NUC-MCQ**, a modern, cloud-native, trilingual student assessment and diagnostic analytics platform delivering real-time answer verification, idempotent test persistence, and institutional administrative oversight."

### 26.2 System Data-Flow Diagrams (DFD)

#### Level 0 DFD (Context Diagram)
```mermaid
flowchart LR
    Student[Student User] <-->|Credentials / Test Answers / Notices| NUCSystem((NUC-MCQ Platform))
    Admin[Institute Administrator] <-->|Curriculum / Batches / Notices / Approvals| NUCSystem
    NUCSystem <-->|Identity & JWKS| SupabaseAuth[Supabase Auth]
    NUCSystem <-->|Relational Data| PostgresDB[(PostgreSQL Database)]
    NUCSystem <-->|Push Multicast| GoogleFCM[Firebase Cloud Messaging]
```

#### Level 1 DFD (Subsystem Breakdown)
```mermaid
flowchart TD
    Student[Student User] -->|PRN & Credentials| P1[1.0 Identity & Access Resolution]
    Admin[Administrator] -->|Admission Data| P1
    P1 -->|Read / Write| D1[(Student Profiles & Access)]

    Student -->|Test Requests & Answers| P2[2.0 Assessment & Evaluation Engine]
    P2 -->|Fetch Questions| D2[(Question Bank)]
    P2 -->|Store Results| D3[(Test Results Log)]

    P2 -->|Analytics Telemetry| P3[3.0 Performance Analytics Engine]
    P3 -->|Render Charts| Student

    Admin -->|Draft Announcements| P4[4.0 Broadcast & Notification Manager]
    P4 -->|Write Notice| D4[(Broadcasts & Targets)]
    P4 -->|Dispatch Tokens| FCM[Firebase Cloud Messaging]
    FCM -->|Push Alert| Student
```

### 26.3 Software Development Life Cycle (SDLC)
The NUC-MCQ platform was engineered utilizing the **Agile-Iterative SDLC Model**:
1. **Iteration 1**: Core Data Modeling, PostgreSQL Schemas via Drizzle ORM, Supabase Auth Integration.
2. **Iteration 2**: Backend REST API authoring, Role-Based Access Control, Student PRN Alias Resolution.
3. **Iteration 3**: Student Web and Mobile Assessment Engine, Trilingual Question Presentation, Instant Feedback.
4. **Iteration 4**: Administrative Back-Office Portal, Bulk Excel Question Ingestion, Batch Management.
5. **Iteration 5**: Notice Read Receipts, FCM Push Notifications, Topic Diagnostic Analytics, Streak Calculations.
6. **Iteration 6**: Production Hardening, CORS Credentials Configuration, Vercel Edge Proxying, Cold-Start Mitigation.

---

# 27. Function Point Analysis and Cost Estimation

Function Point Analysis (FPA) is a standardized ISO/IEC software metric (IFPUG 4.3.1) used to quantify the functional size of software based on user-recognizable logical capabilities.

### 27.1 Baseline Function Point Estimate (Supplied Project Benchmark)

| Functional Component | Count | Complexity Weight | Subtotal Points |
|---|---:|---:|---:|
| **External Inputs (EI)** (e.g., Student Admission, Register Password, Batch Create, Question Create, Bulk Excel Upload, Submit Test, Publish Notice, Mark Read, Device Token, Study Material Upload, Google Auth Bridge, Access Request) | 12 | 4 (Average) | 48 |
| **External Outputs (EO)** (e.g., Exam Score Report, Diagnostic Topic Analytics, Pass/Fail Certificate Summary, Push Notification Dispatch, Daily Streak Card, Bulk Ingestion Summary, Leaderboard Metrics, Batch Performance Report) | 8 | 5 (Average) | 40 |
| **External Inquiries (EQ)** (e.g., PRN Lookup, Get Questions, List Batches, Get Notice Feed, Search Question Bank, View Past Results, Download Study Material, Check Admin Access, List Students, List Device Tokens) | 10 | 4 (Average) | 40 |
| **Internal Logical Files (ILF)** (e.g., `student_profile`, `student_access`, `batch`, `teacher`, `question`, `test_result`, `broadcast`, `study_material`) | 8 | 10 (Average) | 80 |
| **External Interface Files (EIF)** (e.g., Supabase GoTrue Auth, Firebase Cloud Messaging, Supabase Storage) | 3 | 7 (Average) | 21 |
| **Total Unadjusted Function Points (UFP)** | **41** | — | **229** |

### 27.2 Value Adjustment Factor (VAF) & Adjusted Function Points (AFP)
The traditional VAF is calculated by assessing the 14 General System Characteristics (GSCs), including distributed data processing, performance, transaction rate, online data entry, reusability, and installation ease.
$$\text{VAF} = 0.65 + (0.01 \times \text{TDI})$$
Assuming an industry-standard Total Degree of Influence (TDI) of **35** (average complexity rating across all 14 characteristics):
$$\text{VAF} = 0.65 + (0.01 \times 35) = 1.00$$
$$\text{AFP} = \text{UFP} \times \text{VAF} = 229 \times 1.00 = \mathbf{229\text{ FP}}$$

### 27.3 Effort, Timeline, and Commercial Valuation
- **Standard Productivity Metric**: 8 person-hours per Function Point (standard benchmark for modern modular web/mobile frameworks).
- **Total Development Effort**:
  $$229\text{ FP} \times 8\text{ hours/FP} = \mathbf{1,832\text{ person-hours}}$$
- **Project Duration (Person-Months)**: Assuming standard 160 productive hours per person-month:
  $$\frac{1,832\text{ hours}}{160\text{ hours/month}} = \mathbf{11.45\text{ person-months}}$$
- **Model-Based Commercial Valuation**: Assuming an entry-to-mid software engineering market rate of ₹500 per hour:
  $$1,832\text{ hours} \times ₹500/\text{hour} = \mathbf{₹9,16,000}$$

### 27.4 Alternative Codebase Metric Count
A secondary component decomposition reflecting fine-grained API micro-functions yields:
$$(15 \times 4) + (6 \times 5) + (10 \times 4) + (8 \times 10) + (2 \times 7) = 60 + 30 + 40 + 80 + 14 = \mathbf{224\text{ UFP}}$$

### 27.5 Critical Methodological Qualifications
> [!WARNING]
> **Academic & Commercial Disclaimers**:
> 1. **Model-Based Estimation Only**: The counts of 229 UFP and 224 UFP represent illustrative model-based sizing estimates, **not** an independently audited IFPUG certified calculation.
> 2. **TDI Assumption**: The value of TDI = 35 is an assumed baseline; individual ratings for all 14 general characteristics must be formally scored by an academic evaluator or auditor for official certification.
> 3. **Commercial Valuation Disclaimer**: The valuation of ₹9,16,000 is an algorithmic calculation derived from assumed hourly productivity rates; it does **not** represent a formal commercial vendor quotation or binding tender.
> 4. **Infrastructure Economics**: Cloud operating expenses (e.g. ₹750/month) and projected institutional paper savings (e.g. ₹39,000–₹44,250 annually) are operational estimates based on typical institutional cohort sizes, not audited accounting records.
> 5. **FPA Boundary Rule for Sessions/Cookies**: Future implementation of server-side sessions and cookies operates at the transport and infrastructure layer; it does not automatically add Function Points unless user-recognizable transactional functions (e.g., active session revocation management screens) are exposed to users.

---

# 28. Team and Responsibilities

### 28.1 Project Team Members
The NUC-MCQ platform was conceptualized, architected, and engineered by a two-member software engineering team:
1. **Siddhant Gade**: Lead Architect & Backend / Admin Web Engineer.
2. **Rushi Solankar**: Full-Stack Engineer, Student Web / Mobile Lead & DevOps Specialist.

### 28.2 Verified Engineering Contribution Areas
- **Backend Architecture & Database Modeling**:
  - PostgreSQL schema design via Drizzle ORM.
  - Express 5 route definitions, repository abstractions, and business service logic.
  - JWT verification engine using `jose` and JWKS keys.
  - Automated test runner suites for student identity and result idempotency.
- **Student Web Application**:
  - React 19 + TypeScript + Vite architecture.
  - Trilingual assessment engine with instant feedback and timed exam modes.
  - Recharts performance analytics, topic diagnostic bars, and streak counter.
  - Vercel edge reverse-proxy configuration to eliminate cross-origin preflight latency.
- **Admin Management Console**:
  - React 19 + Vite 8 management dashboard.
  - SheetJS bulk Excel question ingestion and validation.
  - Batch CRUD, student admission modals, and access status toggles.
  - Broadcast notice publisher and study material management.
- **Student Mobile Application (Flutter)**:
  - Multi-platform mobile app using BLoC state management and Dio network client.
  - Local question bookmark persistence via SharedPreferences.
  - Firebase Cloud Messaging push notification integration.

### 28.3 Proposed Academic Responsibility Matrix [Subject to Guide Confirmation]
| Module / Deliverable | Primary Contributor | Secondary Contributor | Academic Review Status |
|---|---|---|---|
| System Architecture & Database Design | Siddhant Gade | Rushi Solankar | Complete & Verified |
| Backend REST Services & Auth Middleware | Siddhant Gade | Rushi Solankar | Complete & Verified |
| Student Web Portal (React 19 / TS) | Rushi Solankar | Siddhant Gade | Complete & Verified |
| Admin Web Management Dashboard | Siddhant Gade | Rushi Solankar | Complete & Verified |
| Student Mobile Application (Flutter) | Rushi Solankar | Siddhant Gade | Complete & Verified |
| Cloud DevOps (Vercel & Render Integration) | Rushi Solankar | Siddhant Gade | Complete & Verified |
| IEEE Project Report & Research Article | Joint Authorship | Joint Authorship | Authored in Brain Artifacts |
| Function Point Analysis & Cost Modeling | Joint Authorship | Joint Authorship | Formulated in Documentation |

---

# 29. Future Roadmap

The following prioritized roadmap outlines upcoming engineering milestones:

### 29.1 Engineering Roadmap Matrix

| Priority | Category | Initiative / Task | Affected Modules | Rationale & Acceptance Criteria | Target Status |
|---|---|---|---|---|---|
| **P0** | **Security & Sessions** | Implement Server-Side Opaque Session & HttpOnly Cookie Layer | `backend/`, `std_web/`, `admin/` | Satisfy Web Technology requirements; eliminate XSS token risk; allow instantaneous student suspension. | [Planned] Architectural Design Complete |
| **P0** | **Performance** | Automated Cold-Start Keep-Alive Service | `backend/`, Hosting | Eliminate 25-45s initial latency on Render free-tier via 10-minute automated cron health ping. | [Proposed] Design Complete |
| **P1** | **Data Sync** | Cloud Question Bookmarking Synchronization | `backend/`, `students_app/`, `std_web/` | Author `student_bookmark` table; sync bookmarks between Flutter mobile and React web. | [Planned] Schema Drafted |
| **P1** | **Admin UI** | Web Worker Offloading for Excel Bulk Uploads | `admin/` | Offload SheetJS parsing from main browser UI thread to prevent UI freezing on >2,000 question rows. | [Planned] Optimization |
| **P2** | **Mobile** | Full Offline Practice Test Cache | `students_app/` | Allow students with intermittent mobile connectivity to take practice tests offline and sync upon reconnect. | [Planned] Feature |
| **P2** | **Academics** | Final Project Viva & Faculty Demonstration | Complete System | Present live assessment, admin approval, and trilingual evaluation to academic project examination panel. | [Scheduled] Academic Milestone |

---

# 30. AI Agent Working Instructions

> [!CAUTION]
> **MANDATORY WORKING RULES FOR ALL FUTURE AI AGENTS**:
> Any autonomous AI coding agent, language model, or pair programmer interacting with the NUC-MCQ codebase **MUST STRICTLY COMPLY** with the following 20 engineering directives:

1. **Read `MASTER.md` First**: Before analyzing code or proposing changes, read this document to understand the system architecture, directory boundaries, and database relationships.
2. **Inspect Current Code**: Always inspect the current source files before implementing fixes; treat the actual repository code as the ground truth.
3. **No Phantom Code**: Never assume a feature or API exists merely because a function name or route path seems standard; verify its presence in `backend/src/app.js` or relevant screen files.
4. **Update Documentation**: Update `MASTER.md` whenever a significant architecture, API, schema, authentication, deployment, feature, or testing change is completed.
5. **Separate Implemented from Planned**: Keep planned functionality (such as the upcoming Server-Side Session Cookie layer) strictly distinct from implemented and verified functionality.
6. **Preserve Working Features**: Never break or replace existing, working implementations with unverified code.
7. **Avoid Unnecessary Rewrites**: Do not refactor functional components or services unless explicitly instructed.
8. **Frontend Boundary**: Do not modify the backend when the requested task scope is frontend-only.
9. **Backend Boundary**: Do not modify frontend clients when the requested task scope is backend-only.
10. **Zero Secrets in Code**: Never hardcode, commit, or expose API keys, database passwords, or JWT secrets in client bundles or public repositories.
11. **Never Invent Test Results**: Report automated test outcomes honestly. If tests have not been executed, record them as `Not executed`.
12. **Run Tests & Builds**: Always execute relevant build commands (`npm run build`, `tsc --noEmit`) and test suites (`npm test`) to verify changes before marking tasks complete.
13. **Strict Commit & Push Permissions**: Do not run `git commit`, `git push`, or cloud deployments without explicit authorization from the user.
14. **Preserve User Changes**: Never discard, overwrite, or revert uncommitted modifications made by the developer.
15. **Preserve Historical Records**: Never remove or bypass database constraints, and never delete student historical test results.
16. **Cross-Client Consistency**: Maintain consistent behavioral logic across the student web portal, mobile app, and admin dashboard.
17. **Sessions & Cookies Governance**: Treat Sessions and Cookies as a required Web Technology project concern and document their actual implementation status accurately without claiming completion prematurely.
18. **Progress Checkpoints**: When handling large multi-step refactors, record completed work, remaining tasks, and blockers systematically in progress artifacts.
19. **Context Resumption**: When continuing from a compacted context or new session, inspect existing logs and artifacts to avoid repeating completed work.
20. **Targeted Clarification**: Ask for user clarification only when essential architectural decisions cannot be established from the repository.

---

# 31. Glossary

- **AFP (Adjusted Function Points)**: The final functional size metric calculated by multiplying Unadjusted Function Points (UFP) by the Value Adjustment Factor (VAF).
- **BLoC (Business Logic Component)**: A predictable Flutter architectural pattern separating presentation from business logic using reactive streams and events.
- **ClientEventId**: A universally unique identifier (UUID v4) generated by the frontend for each test submission to guarantee idempotent database insertion.
- **Drizzle ORM**: A lightweight, type-safe TypeScript Object-Relational Mapper that executes SQL queries with zero runtime overhead.
- **EIF (External Interface File)**: In Function Point Analysis, a user-recognizable group of logically related data referenced by the system but maintained by an external application (e.g., Supabase Auth).
- **FCM (Firebase Cloud Messaging)**: Google's cross-platform messaging service for dispatching mobile push notifications.
- **HttpOnly Cookie**: A browser cookie attribute preventing client-side scripts from reading cookie contents, completely mitigating token theft via XSS.
- **Idempotency**: An API property where making multiple identical requests has the same effect as making a single request.
- **ILF (Internal Logical File)**: In FPA, a user-recognizable group of logically related data maintained entirely within the boundary of the application (e.g., `student_profile`, `question`).
- **JWKS (JSON Web Key Set)**: A set of cryptographic public keys published by an identity provider (Supabase) used by resource servers to verify asymmetric JWT signatures.
- **MS-CIT**: Maharashtra State Certificate in Information Technology, an IT literacy certification program administered across Maharashtra, India.
- **Opaque Session Token**: A high-entropy random string that carries no encoded user data, acting as a lookup key against a secure server-side session store.
- **PRN (Permanent Registration Number)**: The unique institutional identification number assigned to a student upon formal admission to the computer training centre.
- **SameSite Cookie**: A cookie security attribute (`Lax`, `Strict`, or `None`) controlling whether cookies are dispatched with cross-site requests to mitigate CSRF attacks.
- **TDI (Total Degree of Influence)**: The sum of the complexity ratings (0 to 5) across the 14 General System Characteristics in Function Point Analysis.
- **UFP (Unadjusted Function Points)**: The raw functional sizing score derived from counting External Inputs, External Outputs, External Inquiries, Internal Logical Files, and External Interface Files.
- **VAF (Value Adjustment Factor)**: A multiplier (typically between 0.65 and 1.35) adjusting unadjusted function points based on overall system operational complexity.

---

# 32. References

1. **Express.js Documentation**: Express 5.x API and Routing Specifications. [https://expressjs.com](https://expressjs.com)
2. **Drizzle ORM Documentation**: Type-safe PostgreSQL schema definitions, relations, and migration tooling. [https://orm.drizzle.team](https://orm.drizzle.team)
3. **Supabase Documentation**: GoTrue Authentication, Row-Level Security, and JSON Web Key Sets (JWKS). [https://supabase.com/docs](https://supabase.com/docs)
4. **RFC 7519**: *JSON Web Token (JWT)*, Internet Engineering Task Force (IETF). [https://datatracker.ietf.org/doc/html/rfc7519](https://datatracker.ietf.org/doc/html/rfc7519)
5. **RFC 6265bis**: *Cookies: HTTP State Management Mechanism*, IETF Draft. [https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis)
6. **OWASP Foundation**: *Session Management Cheat Sheet & Cross-Site Scripting Prevention Guidelines*. [https://cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org)
7. **International Function Point Users Group (IFPUG)**: *Function Point Counting Practices Manual (CPM 4.3.1)*, ISO/IEC 20926.
8. **React Documentation**: React 19 Client Components, Hooks, and Lifecycle Architecture. [https://react.dev](https://react.dev)
9. **Flutter SDK**: Multi-Platform Application Development & Material 3 Design System. [https://flutter.dev](https://flutter.dev)

---

# 33. Change Log

| Version | Date | Authors | Scope of Revision |
|---|---|---|---|
| **v0.1.0** | August 2026 | Siddhant Gade, Rushi Solankar | Initial repository bootstrap; basic student schema, Flutter mobile proof-of-concept. |
| **v0.5.0** | September 2026 | Siddhant Gade, Rushi Solankar | Express backend implementation, Supabase Auth integration, Admin management dashboard. |
| **v0.8.0** | October 2026 | Siddhant Gade, Rushi Solankar | Trilingual question bank ingestion, idempotent test results, broadcast notice receipts, FCM push. |
| **v0.9.5** | October 2026 | Siddhant Gade, Rushi Solankar | Cold-start mitigation, Vercel reverse proxy, 30s timeout, CORS credentials alignment. |
| **v1.0.0** | October 2026 | Siddhant Gade, Rushi Solankar | Comprehensive Master Documentation (`MASTER.md`) establishing definitive project single source of truth. |

---

# 34. Verification and Evidence Notes

### 34.1 Repository Audit Summary
During the comprehensive audit conducted in October 2026, the following facts were verified directly from the code and configuration:
1. **Zero Uncommitted Application Changes**: The working trees of both `d:\WT\App UI\nuc-mcq` and `d:\WT\App UI\nuc-mcq-student` are clean and operating on their respective `main` branches.
2. **Automated Unit Testing**: All 15 unit tests in `backend/` passed cleanly using Node.js native test runner (`node --test`).
3. **Frontend Compilation**: Both `std_web/` and `nuc-mcq-student/` compiled with zero TypeScript or Vite errors.
4. **Database Schema**: All 13 relational tables and their constraints were verified directly against `backend/src/database/schema/index.js`.
5. **No Secrets Exposed**: All environment variables documented in this manual use descriptive placeholders.

### 34.2 Unverified Assumptions & Future Verifications
- **Production Render Cold-Start**: Free-tier cold starts have been empirically observed between 25 and 45 seconds; quantitative sub-second benchmarks on paid hosting tiers remain to be formally measured.
- **Formal FPA Certification**: The 229 UFP and ₹9,16,000 figures are algorithmic academic estimations and have not been submitted for third-party IFPUG commercial audit.
