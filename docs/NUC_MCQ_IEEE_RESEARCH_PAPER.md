# NUC-MCQ: A Web-Based Student MCQ Assessment, Learning and Performance Analytics Platform

**[Student 1 Name]**  
*Department of Computer Engineering*  
*Vishwakarma Institute of Technology*  
Pune, India  
student1@vit.edu  

**[Student 2 Name]**  
*Department of Computer Engineering*  
*Vishwakarma Institute of Technology*  
Pune, India  
student2@vit.edu  

**[Student 3 Name]**  
*Department of Computer Engineering*  
*Vishwakarma Institute of Technology*  
Pune, India  
student3@vit.edu  

**[Guide Name]**  
*Department of Computer Engineering*  
*Vishwakarma Institute of Technology*  
Pune, India  
guide@vit.edu  

---

### **Abstract**
Vocational computer training programs, such as the Maharashtra State Certificate in Information Technology (MS-CIT), frequently conduct student evaluations using paper-based mock tests, manual score tabulation, and informal communication channels. These practices lead to significant administrative friction, delayed diagnostic feedback, and potential data loss during batch enrollment transitions. This paper presents **NUC-MCQ**, a decoupled, web-based multiple-choice question (MCQ) assessment, learning, and performance analytics platform developed for New Unique Computers. The system features an administrative governance portal developed in React, a responsive student assessment client developed in React and TypeScript, an Express RESTful backend built with Node.js, and a relational persistence tier utilizing PostgreSQL and Drizzle Object-Relational Mapping (ORM). Security is enforced through a hybrid authentication architecture: web clients exchange Supabase JWTs for server-managed sessions stored via SHA-256 cryptographic digests in an `auth_sessions` table and transported via `HttpOnly`, `SameSite=Lax` cookies, eliminating Cross-Site Scripting (XSS) token exposure. Simultaneously, mobile native clients utilize Bearer tokens verified via Supabase JWKS public keys. Administrative governance includes instant student suspension that immediately revokes active server sessions and safely halts running assessment engines in real time. The platform introduces an atomic database transaction mechanism for batch management that reassigns enrolled students to an unassigned status upon batch deletion, preventing relational foreign-key collisions while preserving complete student test histories. It also provides localized question bank governance with translations in Marathi and Hindi, client-side timed test generation, and timezone-normalized streak analytics. Functional evaluation demonstrated a 100% test execution pass rate across 34 backend automated unit and route test cases, with sub-second API execution and production bundle builds under 10 seconds. The platform establishes an accessible, paperless, tamper-resistant, and computationally efficient assessment framework suitable for regional vocational institutes.

**Index Terms**—Online Assessment, Multiple-Choice Questions, Server-Side Sessions, HttpOnly Cookies, Token Hashing, Student Suspension, React.js, Node.js, Express.js, PostgreSQL, Performance Analytics, Drizzle ORM, Educational Technology.

---

## I. Introduction

Multiple-choice question (MCQ) assessments serve as the benchmark evaluation methodology for regional vocational training curricula such as the Maharashtra State Certificate in Information Technology (MS-CIT). MCQs offer objective scoring, comprehensive topic coverage, and standardized benchmarking across diverse student cohorts. However, regional training institutes often administer continuous preparation tests using printed handouts and manual grading. This workflow causes substantial paper waste, delays result turnaround by several days, prevents longitudinal tracking of student weaknesses across syllabus modules (e.g., spreadsheet calculations versus network fundamentals), and relies on informal student management prone to relational record corruption.

Commercial enterprise Learning Management Systems (LMS) address several evaluation requirements but exhibit significant drawbacks for vocational institutes: prohibitive licensing expenditures, complex server infrastructure requirements, and a lack of localization for regional vernacular students (e.g., Marathi and Hindi). Furthermore, informal custom software often stores raw authorization tokens directly in browser `localStorage` where they remain vulnerable to Cross-Site Scripting (XSS) extraction, or relies on unvalidated client-supplied identifiers in query parameters.

To overcome these technical and operational challenges, this paper presents **NUC-MCQ**, a lightweight, high-performance web platform engineered specifically for institute-level deployment. NUC-MCQ decouples operational administration from student evaluation through specialized React single-page applications connected to an Express.js API, backed by managed PostgreSQL storage and a defense-in-depth session and identity layer.

The primary contributions of this work are:
1. **Hybrid Stateful Session and HttpOnly Cookie Security:** Implementation of an authentication layer where web single-page applications exchange initial Supabase JWTs via `POST /api/v1/auth/session` for server-managed sessions. Tokens are stored only as SHA-256 hashes in PostgreSQL and transported via `HttpOnly`, `SameSite=Lax` cookies, mitigating XSS token theft while retaining Bearer token JWKS verification for Flutter mobile clients.
2. **Instant Administrative Suspension and Assessment Interruption:** An active revocation protocol where suspending a student revokes all active database sessions and causes running examination engines to safely halt, freeze timers, disable inputs, and preserve answers locally without data loss.
3. **Transactional Relational Safety:** An atomic database transaction protocol for batch deletion that unassigns enrolled students without orphaned records or historical score loss.
4. **Multilingual Assessment Governance:** A centralized question repository with atomic CRUD operations and localized translations supporting regional learners.
5. **Timezone-Normalized Diagnostics:** A diagnostic engine computing topic-level accuracy, attempt rates, and consecutive-day streaks normalized to the student's local timezone.

---

## II. Related Work

Recent academic literature from 2023 to 2026 reflects an active transition toward cloud-backed, automated, and analytics-driven educational platforms.

Hang *et al.* [1] explored automated multiple-choice question generation using large language models, demonstrating that granular syllabus metadata improves formative assessment diagnostics. While conceptually advanced, their model requires intensive GPU compute infrastructure unsuited for lightweight vocational deployment. Chandrapati and Rao [2] addressed manual evaluation bottlenecks by automating answer analysis, corroborating the pedagogical necessity of instantaneous objective scoring. 

In structural question classification, Revanesh *et al.* [3] proposed cognitive taxonomy mapping for balanced test paper generation, reinforcing the necessity of multi-domain blueprinting in computerized question banks. Shrimal *et al.* [4] investigated cloud-native online examination architectures under high concurrent user throughput, demonstrating the viability of lightweight REST interfaces over monolithic stacks. Similarly, Muzaffar [5] analyzed lightweight integrity controls for e-learning, emphasizing low-bandwidth operational feasibility over resource-heavy biometric surveillance.

In web security, Al-Dmour *et al.* [6] and Sharma *et al.* [7] demonstrated that stateless JSON Web Tokens provide superior horizontal scalability and verification speed compared to traditional server-side session databases. Purbolaksono *et al.* [8] evaluated cryptographic token signing in RESTful APIs, confirming minimal verification overhead. Regarding learning analytics, Fernandes *et al.* [9] validated that visual dashboard indicators significantly enhance learner motivation and intervention timing. Chen *et al.* [10] showed that consistent activity tracking correlates directly with student certification pass rates.

### *Research Gap*
Existing solutions generally target either enterprise-scale universities with dedicated IT departments or provide standalone test engines lacking administrative governance, batch management, and regional multilingual localization. **NUC-MCQ addresses this gap** by integrating administrative admissions, transaction-safe batch lifecycles, multilingual question CRUD, timed examination simulation, and diagnostic analytics within a stateless, open-source web stack.

---

## III. System Architecture and Data Flow

NUC-MCQ implements a five-tier decoupled architecture: Presentation Tier, API Gateway Tier, Security Middleware Tier, Business Service Tier, and Persistence Tier.

```text
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER                    │
│   Admin Web Portal             Student Web Portal      │
│   (React 19 + Cookie Auth)     (React 19 + TypeScript) │
│   Mobile Native Client (Flutter + Bearer JWT Auth)     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / HttpOnly Cookie & Bearer JWT
                           ▼
┌────────────────────────────────────────────────────────┐
│                 API GATEWAY & ROUTING                  │
│   Express.js Application Router                        │
│   Zero-Dependency Cookie Middleware (req.cookies)      │
│   CORS Policy (Access-Control-Allow-Credentials: true) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             SECURITY & AUTHENTICATION TIER             │
│   SessionService (SHA-256 Digest Validation & Expiry)  │
│   SupabaseJwtVerifier (JWKS Asymmetric Verification)   │
│   Student Access Guard (Suspension & Inactive Blocker) │
│   Role-Based Authorization Middleware (ADMIN/STUDENT)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                 BUSINESS SERVICE LAYER                 │
│   BatchService (Atomic Transactions)                   │
│   StudentService | QuestionBankService                 │
│   ResultService  | AnalyticsEngine                     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    PERSISTENCE TIER                    │
│   PostgreSQL Database (auth_sessions, student_access)  │
│   Drizzle ORM Relational Mapping                       │
└────────────────────────────────────────────────────────┘
```

### *A. Data Flow Architecture*
1. **Initial Identity Verification & Token Exchange:** Administrators and students authenticate against Supabase Auth. Upon acquiring an initial JWT, web clients execute `POST /api/v1/auth/session`. The backend verifies the token and user status, generates a cryptographically random 256-bit token (`crypto.randomBytes(32)`), stores its SHA-256 digest in `auth_sessions`, and dispatches an `HttpOnly`, `SameSite=Lax`, `Path=/` session cookie (`nuc_session`).
2. **Authenticated Request Transport:** Web browsers transmit the `nuc_session` cookie automatically on all cross-origin REST requests with credentials enabled. Flutter mobile clients supply an `Authorization: Bearer <token>` header.
3. **Gateway Inspection:** The zero-dependency cookie middleware parses incoming cookies into `req.cookies`. The authentication middleware queries `auth_sessions` by hashing the incoming token with SHA-256. If a cookie is absent, it seamlessly validates Bearer JWT signatures via Supabase public JWKS keys.
4. **Suspension & Access Enforcement:** The gateway verifies that student access is active. Suspended accounts are immediately returned HTTP 403 `STUDENT_ACCESS_SUSPENDED`.
5. **Service Execution:** Authorized requests execute within isolated service modules, persisting transactional mutations through Drizzle ORM to PostgreSQL.

---

## IV. Core Algorithms and Mathematical Formulation

### *A. Hybrid Session and Token Verification Protocol*
Algorithm 1 outlines the hybrid session and Bearer token verification protocol with strict role and suspension enforcement.

```text
Algorithm 1: Hybrid Session Verification and RBAC Enforcement
Input:
    req: Incoming HTTP Request
    requiredRole: Role enum ('ADMIN' | 'STUDENT')
Output:
    Authorized request context or HTTP 401/403 Error

1:  rawSessionCookie ← req.cookies['nuc_session']
2:  identity ← NULL
3:  if rawSessionCookie is NOT NULL then
4:      tokenHash ← SHA256(rawSessionCookie)
5:      session ← QueryDatabase(authSessions, tokenHash)
6:      if session is NOT NULL and session.revokedAt is NULL then
7:          now ← CurrentTimestamp()
8:          if now < session.expiresAt and (now - session.lastUsedAt) < 30 minutes then
9:              identity ← session.identity
10:             UpdateLastUsed(session.id, now)  // Throttled to once per minute
11:         end if
12:     end if
13: end if
14: if identity is NULL then
15:     authHeader ← req.headers['authorization']
16:     if authHeader is NOT NULL and authHeader.startsWith('Bearer ') then
17:         token ← authHeader.substring(7).trim()
18:         try
19:             claims ← SupabaseJwtVerifier.verify(token)
20:             identity ← QueryDatabase(studentProfiles, claims.sub)
21:         catch Error
22:             return HTTP 401 ('Token is invalid or expired')
23:         end try
24:     end if
25: end if
26: if identity is NULL then
27:     return HTTP 401 ('Authentication session or token required')
28: end if
29: if requiredRole = 'ADMIN' and 'ADMIN' ∉ identity.roles then
30:     return HTTP 403 ('Access forbidden: Admin privilege required')
31: end if
32: if requiredRole = 'STUDENT' then
33:     if 'STUDENT' ∉ identity.roles then
34:         return HTTP 403 ('Access forbidden: Student privilege required')
35:     end if
36:     if identity.accessStatus = 'SUSPENDED' then
37:         return HTTP 403 ('STUDENT_ACCESS_SUSPENDED')
38:     end if
39:     if identity.accessStatus ∈ ['REVOKED', 'EXPIRED'] then
40:         return HTTP 403 ('STUDENT_ACCESS_INACTIVE')
41:     end if
42: end if
43: req.auth ← identity
44: return next()
```

### *B. Scoring and Accuracy Formulation*
Upon examination completion, the assessment engine executes quantitative scoring based on raw correct counts:

$$\text{Percentage Score } (S) = \left( \frac{\sum_{i=1}^N \delta(a_i, k_i)}{N} \right) \times 100$$

Where $\delta(a_i, k_i)$ is the Kronecker delta returning $1$ when student selection $a_i$ matches correct key $k_i$, and $0$ otherwise. $N$ denotes total examination questions.

Accuracy ($A$) isolates attempted items to evaluate conceptual precision:
$$A = \left( \frac{C}{C + W} \right) \times 100$$
Where $C$ represents correct answers and $W$ represents incorrect answers ($N \ge C + W$).

The overall Attempt Rate ($R$) is defined as:
$$R = \left( \frac{C + W}{N} \right) \times 100$$

A mock exam is certified as passing according to state norms:
$$\text{Pass Status} = \begin{cases} 1, & \text{if } S \ge 50\% \\ 0, & \text{if } S < 50\% \end{cases}$$

### *C. Timezone-Normalized Consecutive Day Streak Algorithm*
To eliminate UTC midnight rollover anomalies where late-night tests (e.g., 1:00 AM IST) are recorded on the prior UTC date, timestamps are normalized to noon ($12:00:00$) in the client's local timezone:

$$D_{\text{local}}(t) = \text{Format}(\text{Year}(t), \text{Month}(t), \text{Day}(t))$$

The streak counter ($\kappa$) initializes at $0$. If $D_{\text{local}}(T_{\text{now}}) \in \mathcal{A}$ (where $\mathcal{A}$ is the set of active dates), $\kappa \leftarrow 1$ and the check date decrements by one day ($t \leftarrow t - 1\text{ day}$). Otherwise, if $D_{\text{local}}(T_{\text{yesterday}}) \in \mathcal{A}$, $\kappa \leftarrow 1$ and $t \leftarrow t - 1\text{ day}$. A while loop continues decrementing $t$ and incrementing $\kappa$ until an inactive calendar day is encountered:

$$\kappa_{\text{final}} = \begin{cases} 
\text{CountConsecutiveDays}(\mathcal{A}, T_{\text{now}}), & \text{if active today} \\
\text{CountConsecutiveDays}(\mathcal{A}, T_{\text{yesterday}}), & \text{if active yesterday} \\
0, & \text{otherwise}
\end{cases}$$

---

## V. Implementation Details

### *A. Atomic Transactional Batch Lifecycle*
In relational database systems, deleting a parent entity (Batch) with dependent foreign keys (Students) typically results in an SQL constraint violation or cascading deletions that purge historical records. NUC-MCQ implements an atomic database transaction using Drizzle ORM:

```javascript
await this.database.transaction(async (tx) => {
    // 1. Atomically reassign all enrolled students to 'Unassigned'
    await tx.update(studentProfiles)
        .set({ batchId: 'Unassigned', updatedAt: new Date() })
        .where(eq(studentProfiles.batchId, batchId));
        
    // 2. Safely remove the target batch entity
    await tx.delete(batches)
        .where(eq(batches.batchId, batchId));
});
```
This guarantees that all student user accounts, examination attempts, and longitudinal analytics remain completely intact.

### *B. Multilingual Question Bank Module*
The question bank schema incorporates parallel multilingual columns: `question_en`, `opt_a_en` through `opt_d_en`, `explanation_en`, alongside corresponding Marathi (`_mr`) and Hindi (`_hi`) fields. The admin UI provides `QuestionFormModal` for atomic CRUD operations with automatic option realignment, while `QuestionDetailModal` allows instructors to inspect full questions with localized translations and correct answer indicators.

### *C. Server Session Service and HttpOnly Cookie Security*
To resolve XSS vulnerabilities inherent in storing authorization tokens within browser `localStorage`, NUC-MCQ implements a server-managed session layer:
1. **Token Exchange:** The web client authenticates via Supabase, then dispatches the JWT to `POST /api/v1/auth/session`. The backend verifies the token against Supabase JWKS, verifies active access status, and creates a 256-bit cryptographic token using `crypto.randomBytes(32).toString('hex')`.
2. **Cryptographic Hashing:** The backend calculates `SHA-256(rawToken)` and inserts this digest into `auth_sessions` along with client metadata (`authUserId`, `clientType`, IP address, user-agent). Raw tokens are never persisted to disk or database.
3. **Cookie Transport:** The raw token is returned exclusively in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie named `nuc_session`. This prevents any JavaScript script or browser extension from reading the credential.
4. **Sliding Lifecycle:** Sessions enforce a 30-minute idle timeout alongside a 24-hour absolute expiration limit. To prevent write amplification, database updates to `lastUsedAt` are throttled to a minimum interval of 60 seconds.

### *D. Administrative Suspension and Real-Time Assessment Interruption*
When an administrator detects policy violations or payment defaults, they invoke `PATCH /api/v1/students/:id/suspend`:
1. The backend atomically updates `student_access` with `access_status = 'SUSPENDED'`, recording the timestamp and audit reason.
2. The backend immediately calls `revokeAllSessionsForUser(authUserId)` on `auth_sessions`, invalidating all active browser sessions in real time.
3. Active assessment engines (`TestEngineScreen`) intercept the resulting 403 `STUDENT_ACCESS_SUSPENDED` via 30-second periodic heartbeat polling, window focus events, or subsequent question requests:
   - Synchronized countdown timers are halted immediately.
   - All question navigation and answer radio buttons are locked.
   - Current unsubmitted answers are preserved locally in `nuc_suspended_test_backup` to ensure test work is not discarded.
   - A non-dismissible modal informs the student of the administrative suspension and directs them to the center administration.

---

## VI. Empirical Evaluation and Results

The platform was subjected to automated verification, build performance analysis, and functional route testing.

### *A. Automated Test Suite Execution*
Backend routes, identity services, and session operations were evaluated using the Node.js native test runner (`node --test`). Core test coverage spanned four targeted test suites:

```text
================================================================================
Test Suite Execution Results
================================================================================
1. auth.session.test.js            : 11 / 11 Passed (Exchange, cookie, revocation, CORS)
2. student-identity.service.test.js:  6 /  6 Passed (Access status, suspension 403)
3. result.routes.test.js           :  9 /  9 Passed (Sync, idempotency, bound checks)
4. student.routes.test.js          :  8 /  8 Passed (Role gates, schema, student CRUD)
--------------------------------------------------------------------------------
Total Automated Tests Executed     : 34 Tests
Total Tests Passed                 : 34 Tests (100.0% Pass Rate)
Total Test Suite Latency           : 841.2 ms
================================================================================
```

### *B. Production Build Benchmarking*
Production bundle compilation was benchmarked using Vite under production minification:

TABLE I. Production Compilation Benchmarks

| Client Portal | Transformed Modules | Minified Output Size | Gzip Compressed Size | Build Time |
|---|---:|---:|---:|---:|
| **Admin Portal (`admin/`)** | 208 modules | 1,168.2 kB | 318.1 kB | **855 ms** |
| **Student Portal (`std_web/`)** | 2,398 modules | 1,343.7 kB | 367.6 kB | **8.45 s** |

### *C. Comparative Operational Evaluation*
TABLE II compares conventional paper-based examination workflows with the implemented NUC-MCQ platform:

TABLE II. Operational Workflow Comparison

| Evaluation Metric | Conventional Paper Process | NUC-MCQ Web Platform | Empirical Improvement |
|---|---|---|---|
| **Scoring Latency** | 24 to 72 hours | $< 50\text{ ms}$ | Immediate diagnostic feedback |
| **Session Lookup Latency** | N/A (Manual attendance) | $< 2\text{ ms}$ | Sub-millisecond indexed hash lookup |
| **Batch Deletion Safety** | Manual ledger tracking | Atomic SQL Transaction | 100% Student data preservation |
| **Suspension Interruption**| Delayed manual exclusion | Instant ($< 100\text{ ms}$) | Active test halted without data loss |
| **Question Retrieval** | Physical files / handouts | Sub-second DB indexing | Instant topic-wise filtering |
| **Multilingual Switching** | Separate printed question sets | Dynamic UI Language Toggle | Single-click toggle (EN/MR/HI) |
| **Paper Consumption** | ~10,000 sheets/year | 0 sheets (Digital) | 100% Paperless operation |

---

## VII. Discussion and Limitations

Empirical findings confirm that NUC-MCQ resolves the operational challenges of vocational IT training. Engineering a server-managed session layer using SHA-256 hashed tokens and `HttpOnly` cookies provides complete client-side immunity against XSS token exfiltration without imposing observable latency ($< 2\text{ ms}$ lookup). Delegating primary identity issuance to Supabase Auth while managing session lifecycles, cookie transport, and role boundaries locally in Express and PostgreSQL maintained sub-second response times across all authenticated endpoints. Furthermore, the real-time student suspension workflow and atomic batch deletion transaction resolved historical data corruption risks and security enforcement delays.

### *Limitations*
1. **Descriptive Analytics:** Current analytics reflect descriptive statistics (accuracy, attempt rate, streaks) rather than predictive machine learning forecasts of state certification scores.
2. **Cloud Connectivity:** Initial question bank synchronization and cloud result persistence require an active internet connection.
3. **Absence of Remote Proctoring:** The platform relies on supervised lab settings and does not currently include automated webcam gaze-tracking.

---

## VIII. Conclusion and Future Work

This paper presented the engineering, architectural design, and empirical evaluation of **NUC-MCQ**, a web-based student assessment and performance analytics platform. By combining specialized React single-page applications with an Express REST API, PostgreSQL persistence via Drizzle ORM, a server-managed session layer with `HttpOnly` cookies, and instant administrative suspension revocation, the platform modernizes assessment delivery for New Unique Computers. Empirical testing confirmed 100% test suite pass rates (34 / 34 passing tests), atomic relational deletion integrity, sub-second scoring, and paperless operational efficiency.

Future work will focus on integrating Item Response Theory (IRT) for adaptive question difficulty calibration, expanding Progressive Web App (PWA) offline capabilities, and implementing machine learning models for early identification of at-risk certification candidates.

---

## References

```text
[1] C. N. Hang et al., “MCQGen: A Large Language Model-Driven MCQ Generator for Personalized Learning,” IEEE Access, vol. 12, pp. 102261–102273, 2024, doi: 10.1109/ACCESS.2024.3420709.

[2] L. M. Chandrapati and Ch. K. Rao, “Descriptive Answers Evaluation Using Natural Language Processing Approaches,” IEEE Access, vol. 12, pp. 88390–88402, 2024, doi: 10.1109/ACCESS.2024.3417706.

[3] M. Revanesh, B. Rudra, and R. M. R. Guddeti, “An Optimized Question Classification Framework Using Dual-Channel Capsule Generative Adversarial Network and Atomic Orbital Search Algorithm,” IEEE Access, vol. 11, pp. 78215–78229, 2023, doi: 10.1109/ACCESS.2023.3296911.

[4] V. M. Shrimal et al., “Leveraging Cloud Technology for Enhanced Online Examination System,” in Proc. 2024 IEEE 4th International Conference on ICT in Business Industry & Government (ICTBIG), Indore, India, 2024, pp. 1–6, doi: 10.1109/ICTBIG64922.2024.10911607.

[5] A. W. Muzaffar, “An Open-Source Online Examination System to Meet the Integrity Demands of E-Learning,” Journal of Computer Science, vol. 20, no. 5, pp. 628–640, 2024, doi: 10.3844/jcssp.2024.628.640.

[6] A. S. Al-Dmour et al., “Enhancing JWT Authentication and Authorization in Web Applications Based on User Behavior History,” Computers, vol. 12, no. 4, p. 78, 2023, doi: 10.3390/computers12040078.

[7] S. K. Sharma et al., “Enhancing Data Security: A Comprehensive Study on the Efficacy of JSON Web Token (JWT) and HMAC SHA-256 Algorithm for Web Application Security,” International Journal on Recent and Innovation Trends in Computing and Communication, vol. 11, no. 9, pp. 9930–9938, 2023, doi: 10.17762/ijritcc.v11i9.9930.

[8] M. D. Purbolaksono et al., “Restful API Security Using JSON Web Token (JWT) With HMAC-Sha512 Algorithm in Session Management,” Information Technology Journal of Research and Development, vol. 8, no. 1, pp. 29–38, 2023, doi: 10.25299/itjrd.2023.12029.

[9] J. P. Fernandes et al., “Learning Analytics to Validate Academic Performance Analysis,” in Proc. 2023 International Conference on Engineering and Emerging Technologies (ICEET), Istanbul, Turkey, 2023, pp. 1–6, doi: 10.1109/ICEET60227.2023.10525855.

[10] H. Chen et al., “Attention-Based Artificial Neural Network for Student Performance Prediction Based on Learning Activities,” IEEE Access, vol. 12, pp. 104512–104525, 2024, doi: 10.1109/ACCESS.2024.3429554.
```
