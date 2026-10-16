# MS-CIT Student Web Portal (React + TypeScript + Tailwind CSS)

Modern, production-grade student web application for **New Unique Computers (MS-CIT Authorized Training Institute)**, built with React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router v7, and Recharts.

---

## 🚀 Key Highlights & Feature Parity

1. **Complete Syllabus MCQ Engine (100% Client-Side & Offline-Capable)**
   - Pre-bundled with GCC-TBC MS-CIT question bank (`/data/question_bank.json`) across all 8 syllabus topics:
     - *Computer Fundamentals, Operating System, MS Excel, MS Word, PowerPoint, MS Outlook, Internet, and PageMaker*.
   - **Official Exam Mode**: 25 Questions, 30 Minutes, 50% passing mark, strict GCC-TBC blueprint.
   - **Final Assessment Mode**: 50 Questions, 60 Minutes full exam simulation.
   - **Practice Mode**: Flexible subject selection, custom question count (5–50), custom timer (5–60m), and live instant answer feedback with official explanations.
   - **Question Palette**: Live sidebar navigation with color-coded states (Answered, Flagged, Unanswered).
   - **Bookmarks**: Save difficult questions and instantly launch targeted practice tests containing only bookmarked questions.

2. **Durable Local Storage & Automatic Cloud Sync**
   - Test results persist immediately to browser `localStorage` (`student_app_test_results_v1`) before network transmission.
   - Two-way sync: Merges historical attempts from `GET /api/v1/results` and pushes completed tests to `POST /api/v1/results/sync`.

3. **Performance Analytics & Gamification**
   - Interactive score progression area chart powered by **Recharts**.
   - Identifies strongest and weakest syllabus subjects based on average score and accuracy.
   - Subject-wise performance table with accuracy gauges and pass/fail indicators.
   - Student leveling (XP points, streak tracker, achievement badges).

4. **Multi-Language Support (English, Marathi & Hindi)**
   - Complete translations for app UI, navigation, test interface, questions, options, and explanations.
   - Instant language switching without page reload.

5. **Study Materials & Document Viewer**
   - Access official PDFs, Word docs, PowerPoint presentations, and notes from `GET /api/v1/student/study-materials`.
   - In-app preview modal with formatted key points, text notes, and YouTube video embeds.
   - Direct download support using web Blobs and signed URLs.

6. **Institute Broadcasts & Announcements**
   - Live notices from institute admin with priority badges.
   - Offline-queued read receipts automatically synced with `PATCH /api/v1/student/broadcasts/:id/read`.

---

## 🛠️ Technology Stack

- **Framework:** React 19 + TypeScript (strict mode)
- **Build Tool:** Vite 6
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v3 with dark mode support
- **State & Data Fetching:** TanStack Query v5 + React Context + Axios
- **Authentication:** Supabase Client (`@supabase/supabase-js`) + Express Backend Bridge
- **Icons:** Lucide React
- **Charts:** Recharts
- **Celebrations:** Canvas Confetti

---

## 📦 Directory Structure

```text
std_web/
├── public/                     # Static assets (MCQ bank JSON, subject icons, logo)
│   ├── data/question_bank.json
│   ├── icon/
│   └── subjects/
├── src/
│   ├── app/
│   │   ├── providers.tsx       # QueryClient, Theme, Language, Auth providers
│   │   └── router.tsx          # Client-side routing & route guards
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.tsx   # Shell layout (Navbar, Content, Footer)
│   │       ├── Navbar.tsx      # Responsive top navigation & mobile drawer
│   │       └── Footer.tsx      # Institute footer
│   ├── context/
│   │   ├── AuthContext.tsx     # Student session & identity state
│   │   ├── LanguageContext.tsx # EN / MR / HI localization
│   │   └── ThemeContext.tsx    # Light / Dark theme switching
│   ├── features/
│   │   ├── auth/               # Login & Request Access screens
│   │   ├── bookmarks/          # Bookmarked questions & practice
│   │   ├── home/               # Dashboard, XP, streak, recent tests
│   │   ├── notes/              # Study materials & document preview modal
│   │   ├── notifications/      # Institute broadcasts & notices
│   │   ├── question-bank/      # Full question search & topic filters
│   │   ├── results/            # Results history, detail review, analytics
│   │   ├── settings/           # Profile, language, theme, cache
│   │   └── tests/              # Test hub, Active test engine, config modal
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client initialization
│   │   └── translations.ts     # Multi-language translation dictionary
│   ├── services/
│   │   ├── apiClient.ts        # Axios client with auto-fallback & Bearer token
│   │   ├── authService.ts      # Authentication & authorization requests
│   │   ├── questionBankService.ts # Bundled MCQ bank & offline cache
│   │   ├── testGeneratorService.ts # Exam & Practice test generation algorithms
│   │   ├── resultsService.ts   # Local result persistence, cloud sync & gamification
│   │   ├── analyticsService.ts # Analytics computation & metrics
│   │   ├── bookmarksService.ts # Bookmarks persistence
│   │   ├── broadcastsService.ts # Broadcasts & read receipts
│   │   └── studyMaterialsService.ts # Document access & downloads
│   ├── types/
│   │   └── index.ts            # Shared TypeScript interfaces & types
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🏃 Running Locally

### 1. Install Dependencies
```bash
cd std_web
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (already pre-configured with default values):
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_BACKEND_BASE_URL` | Express API Base URL | `https://nuc-mcq-server.onrender.com` |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://hwgnzhromdavlnttozai.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase Key | *(pre-filled safe client key)* |
| `VITE_GOOGLE_WEB_CLIENT_ID`| Google Web Client ID | *(pre-filled)* |

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

### 4. Build for Production
```bash
npm run build
```
Generates a minified, production-ready static build inside `dist/`.

### 5. Type-Check
```bash
npm run lint
```
Runs `tsc --noEmit` across all TypeScript modules.
