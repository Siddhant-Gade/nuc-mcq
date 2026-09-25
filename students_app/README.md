# MSCIT Student App — Developer Guide

Flutter student client (Android + Windows) for the MSCIT Typing & Skill
Assessment Platform. This foundation implements **login** and a
**broadcasts list**, wired against the real Express backend.

## Architecture

Follows `SYSTEM_DESIGN.md` §4 (UI → Cubit → Repository → network):

```
lib/
  main.dart                     composition root: config check, Supabase init, DI
  app/student_app.dart          MaterialApp + auth-state screen switch (AuthGate)
  core/
    config/app_config.dart      --dart-define configuration + validation
    api/api_client.dart         Dio factory, Bearer-token interceptor,
                                {success,data|error} envelope parsing, error mapping
    api/api_exception.dart      structured exception surfaced to UI states
  features/
    auth/
      models/student_identity.dart     verified identity from GET /api/v1/auth/me
      repository/auth_repository.dart  Supabase sign-in/out + backend verification
      cubit/auth_cubit.dart            AuthUnknown/Checking/SigningIn/
                                       Unauthenticated/Authenticated/Unauthorized
      screens/login_screen.dart        email/password sign-in form
      screens/unauthorized_screen.dart "not a student account" explainer + sign-out
    broadcasts/
      models/broadcast.dart            published broadcast model
      repository/broadcast_repository.dart  GET /api/v1/student/broadcasts
      cubit/broadcast_cubit.dart       Loading/Loaded/Error (+ pull-to-refresh retry)
      screens/broadcasts_screen.dart   card list with empty/error states
    home/home_shell.dart               app bar (sign-out) + broadcasts body
```

Stack decisions are fixed by the blueprint: `flutter_bloc` (Cubit) for
transient state, `dio` as the REST client, `supabase_flutter` for
authentication and session persistence. Drift/SQLite is intentionally **not**
included yet — offline capability is scoped to test execution only
(`SYSTEM_DESIGN.md` §5).

## Trust boundaries

- The app never talks to PostgreSQL or Storage directly.
- Identity is proven by the Supabase access token attached automatically to
  every backend request (`Authorization: Bearer ...`). The backend verifies it
  against Supabase's JWKS; client-supplied IDs are never trusted.
- A session only unlocks the app after `GET /api/v1/auth/me` confirms the
  verified role includes `STUDENT`; otherwise the unauthorized screen appears.
- Only public keys live here. The service-role key must never enter this app.

## Prerequisites

- Flutter SDK 3.38+ (`flutter --version`)
- Android toolchain (Android Studio / SDK) for emulator/device runs, **or**
  Windows desktop support (requires Visual Studio with the
  "Desktop development with C++" workload)

Check readiness:

```powershell
flutter doctor
```

> Note: on the current dev machine `flutter create` reported Windows desktop
> as *unsupported* until the VS C++ toolchain is installed. Android works via
> an emulator or device regardless.

## Configuration

All values are injected at build time with `--dart-define` — nothing secret is
committed and there are no runtime toggles (per `SYSTEM_DESIGN.md` §24):

| Define | Required | Example | Notes |
|---|---|---|---|
| `SUPABASE_URL` | yes | `https://xyzcompany.supabase.co` | Supabase project URL |
| `SUPABASE_PUBLIC_KEY` | yes | `sb_publishable_...` | Publishable key **or** legacy anon key — both are public-safe |
| `BACKEND_BASE_URL` | yes | `http://localhost:3000` | Express backend; defaults to localhost:3000 |

Missing values surface an in-app "Missing configuration" screen listing what
is absent.

### Choosing BACKEND_BASE_URL

| Target | Value |
|---|---|
| Windows desktop | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` (10.0.2.2 = host loopback) |
| Physical device | your LAN IP, e.g. `http://192.168.1.50:3000` |

CORS does not apply to Flutter's native HTTP stack, so no origin changes are
needed in the backend.

## Run

```powershell
# from student_app/
flutter run --dart-define=SUPABASE_URL=https://YOURPROJECT.supabase.co `
  --dart-define=SUPABASE_PUBLIC_KEY=sb_publishable_xxx `
  --dart-define=BACKEND_BASE_URL=http://localhost:3000
```

Add `-d windows`, `-d <emulator-id>` etc. to pick a device (`flutter devices`
lists them). For IDE users, put the defines into your launch configuration
(`.vscode/launch.json` `args`) instead of committing them anywhere else.

## Test data setup (first end-to-end login)

1. Start the backend (`backend/npm run dev`) and confirm `GET /health`.
2. In Supabase Dashboard → Authentication → create a user (email/password).
3. Give that user the student role by setting app metadata (SQL editor):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || '{"role":"STUDENT"}'::jsonb
   where email = 'student@example.com';
   ```

   The backend reads roles **only** from verified `app_metadata.role`
   (accepted: `STUDENT`, `TEACHER`, `ADMIN`); `user_metadata` is ignored.
4. Admit the student through the admin panel (creates `student_profile` +
   PENDING `student_access`), then approve their authorization request —
   approval links `auth_user_id` and sets ACTIVE access. Without this link,
   student-scoped calls return 403 `STUDENT_IDENTITY_NOT_LINKED`.
5. Sign in on the app. Broadcasts currently show an empty/error state until
   backend Phase 12 delivers `GET /api/v1/student/broadcasts`.

## Tests & static analysis

```powershell
flutter test      # unit tests (envelope parsing, models, config validation)
flutter analyze
```

## Current limitations

- Broadcasts screen targets the Phase 12 endpoint; it renders a retryable
  error state until that module ships.
- No offline persistence, result sync, study materials, or notifications yet.
- Session expiry mid-use surfaces as an API error state; re-login recovers.
