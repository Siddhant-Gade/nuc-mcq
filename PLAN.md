# Implementation Plan: Scorecard Printable Certificate, Student Excel Export & Secure Admin Management

## Objective
1. **Mobile App**: Add a printable Certificate / Report Card feature to the Scorecard that can be viewed and printed/saved as PDF via system print.
2. **Admin Web App**: Add an "Export Students to Excel" button in `StudentList.jsx` utilizing `xlsx` to produce ready-to-use spreadsheets.
3. **Admin Web App & Backend**: Fix the "Add Admin" feature to be fully functional and persistent in PostgreSQL, protected by a Security PIN/pattern setup and verification step.

---

## Architecture & File Changes

### 1. Mobile App: Printable Certificate & Report Card
- **File:** `students_app/lib/features/results/widgets/scorecard_dialog.dart`
  - Add "Print / View Certificate" button on the scorecard.
  - Implement `_openPrintableCertificate()`:
    - Generates a certificate/report card styled in HTML with `@media print` CSS (A4 landscape, gold/navy borders, official seal, student score, metrics, authorized signature stamp).
    - Writes to application document directory as `Scorecard_Certificate_<id>.html`.
    - Launches via `open_filex` which opens the system print/browser dialog allowing one-tap "Print" or "Save as PDF".
    - Also displays an in-app Certificate preview dialog.

### 2. Admin Web App: Student Excel Export
- **File:** `admin/src/pages/StudentList.jsx` & `admin/src/pages/StudentList.module.css`
  - Add an **Export Excel** button next to "Add Student".
  - Construct worksheet using `xlsx` library with columns:
    - `PRN / Student ID`, `Student Name`, `Batch Name`, `Mobile`, `Email`, `Course`, `Status`, `Admitted Date`, `Expiry Date`.
  - Format columns, auto-calculate column widths, and export as `NewUniqueComputers_Students_<YYYY-MM-DD>.xlsx`.

### 3. Backend: Persistent Admin Management & Security PIN
- **File:** `backend/src/server.js`
  - Update `runStartupMigrations()` to create:
    - `admin_users` table: `(id UUID, email VARCHAR, name VARCHAR, role VARCHAR, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
    - `admin_security` table: `(id VARCHAR PRIMARY KEY, pin_hash VARCHAR, updated_at TIMESTAMPTZ)`.
  - Update `tokenVerifier.verify(accessToken)`:
    - If `identity.email` matches `env.SUPER_ADMIN_EMAIL` OR exists in `admin_users`, grant `'ADMIN'` role.
- **File:** `backend/src/modules/admins/admin-management.routes.js`
  - `GET /api/v1/admin/security/pin-status`: Check if master PIN is set up.
  - `POST /api/v1/admin/security/setup-pin`: Setup master PIN (hashed with SHA-256).
  - `POST /api/v1/admin/security/verify-pin`: Verify master PIN.
  - `GET /api/v1/admin/admins`: Return list of admins.
  - `POST /api/v1/admin/admins`: Add new admin (validates email & PIN, saves to `admin_users`).
  - `DELETE /api/v1/admin/admins/:id`: Remove admin (cannot remove Super Admin).
- **File:** `backend/src/app.js`: Mount `/api/v1/admin` management router.

### 4. Admin Web App: Secure Add Admin Flow
- **File:** `admin/src/services/adminService.js`
  - Replace mock arrays with real API calls to `/api/v1/admin/...`.
- **File:** `admin/src/pages/CreateAdmin.jsx` & `CreateAdmin.module.css`
  - Implement Security PIN flow:
    - Step 1: Check PIN status. If not set, render **"Create Master Security PIN"**. If set, render **"Enter Security PIN"**.
    - Step 2: Once verified, display Admin Management Dashboard:
      - List of active admins with role badges.
      - "Add New Admin" modal/form requiring Name and Gmail.
      - Adding an admin immediately registers them on the backend so they can log in via Google.

---

## Verification Plan
1. **Mobile App**:
   - Run `dart analyze lib/features/results/widgets/scorecard_dialog.dart` -> verify 0 errors.
   - Build APK -> confirm clean build.
2. **Backend**:
   - Run node tests / check routes mounting -> confirm zero startup errors.
3. **Admin Web App**:
   - Run `npm run build` in `admin/` -> confirm clean Vite production build.
