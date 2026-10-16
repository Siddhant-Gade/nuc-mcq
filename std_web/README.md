# MS-CIT Student Web Application (`std_web`)

A modern, responsive Flutter Web application serving as the student-facing learning and examination portal for MS-CIT. It connects seamlessly to the shared backend and PostgreSQL database while preserving complete feature parity with the native student mobile app.

---

## 1. System Architecture

The project ecosystem is strictly divided into three isolated layers:

```
├── std_web/       --> Student Web Application (Flutter Web)
├── admin/         --> Administrator Web Portal (React 18 + Vite)
├── backend/       --> Shared REST API & Authentication Service (Node.js/Express 5.x)
└── students_app/  --> Native Android/iOS Mobile App (Preserved source of truth)
```

Both frontends (`std_web` and `admin`) connect to the same shared Node.js Express backend and Supabase database.

---

## 2. Key Features Preserved & Adapted for Web

- **Authentication & Onboarding**:
  - Direct PRN & custom password authentication.
  - Google OAuth Sign-In integration via Google Web Client ID and backend bridge.
  - Automated session restoration from browser `localStorage` / `SharedPreferences`.
- **Access Lifecycle & Authorization**:
  - Full adherence to student access states: `ACTIVE`, `PENDING`, `EXPIRED`, and `REVOKED`.
  - Distinct access pending screen with live status polling and PRN linking.
  - Required banner for revoked accounts: *"Access revoked, contact administrator."*
- **Examination & Practice Engine**:
  - Mock tests and subject-wise practice tests.
  - Timed question navigation, multi-choice question palette, review flagging, and instant answer validation.
  - Prevention of accidental double-submissions with backend result sync.
  - Responsive layout constraints for wide screens (860px max width centering).
- **Performance Analytics**:
  - Dynamic subject performance summary, accuracy calculations, and attempt history.
  - Detailed test result breakdown with subject mapping for both Mock and Practice exams.
- **Study Materials**:
  - Web-safe browser download pipeline converting binary payloads into browser Blobs via `package:web`.
  - In-browser document view links via `url_launcher`.
- **Broadcasts & Notifications**:
  - Institute broadcast announcements and individual notifications.
  - Persistent read/unread tracking with mark-all-as-read capability.
- **Responsive UI/UX**:
  - Adaptive desktop navigation: Top tab navigation bar on desktop screens (>= 768px) and mobile bottom bar on narrow viewports.
  - Multi-language support: English, Marathi, and Hindi.
  - Light and Dark theme modes.

---

## 3. Prerequisites

- **Flutter SDK**: 3.24.x or higher (tested with Flutter 3.38.x / Dart 3.10.x).
  Verify web support is enabled:
  ```bash
  flutter config --enable-web
  ```
- **Web Browser**: Google Chrome, Microsoft Edge, Firefox, or Safari.
- **Shared Backend**: Node.js v18+ running on `http://localhost:3000`.

---

## 4. Setup and Run Commands

### Install Dependencies
From the `std_web` directory:
```bash
flutter pub get
```

### Run in Development Mode
To run locally in Chrome:
```bash
flutter run -d chrome
```

To run on a specific port matching the backend CORS configuration:
```bash
flutter run -d chrome --web-port=5174
```

To run with custom backend environment parameters:
```bash
flutter run -d chrome --web-port=5174 \
  --dart-define=API_BASE_URL=http://localhost:3000 \
  --dart-define=SUPABASE_URL=https://<your-project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-key> \
  --dart-define=GOOGLE_WEB_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
```

### Run Automated Tests
```bash
flutter test
```

### Build for Production
To compile an optimized, minified production release:
```bash
flutter build web --release
```
The deployable web assets will be generated in `std_web/build/web/`.

To preview the built production site locally:
```bash
# Using python HTTP server
python -m http.server 8080 --directory build/web

# Or using npx serve
npx serve build/web -p 8080
```

---

## 5. Configuration & Environment Variables

The application reads configuration through Flutter's compile-time `--dart-define` parameters with safe fallbacks:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `API_BASE_URL` | `http://localhost:3000` | Shared Node.js API base URL. |
| `SUPABASE_URL` | Configured project URL | Supabase project endpoint for authentication. |
| `SUPABASE_ANON_KEY` | Configured anon key | Supabase public anonymous key. |
| `GOOGLE_WEB_CLIENT_ID` | Project OAuth Client ID | Google Cloud Web Client ID for Google Sign-In. |

### Backend CORS Configuration
Ensure that the URL where `std_web` runs is allowed in `backend/.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:8080
```

---

## 6. Browser Compatibility & Known Limitations

1. **Push Notifications**: Mobile background FCM push notifications (via `firebase_messaging` / system status bar trays) are mobile-native. For Web, student broadcasts and notifications are managed via live HTTP polling and persistent backend read/unread state.
2. **Local File System**: On Android, files are downloaded to local storage directories (`/storage/emulated/0/Download`) using `path_provider`. On Web, downloads use native HTML5 Blob URL downloads directly to the user's browser download shelf.
3. **Document Viewing**: PDF and Office document preview relies on opening external browser tabs or downloading rather than embedding native Android `open_filex` intents.
