# MSCIT Assessment Backend

## Required environment variables

Copy `.env.example` to `.env` and provide values locally. Do not commit `.env`.

- `DATABASE_URL` — Supabase PostgreSQL connection URL.
- `SUPABASE_JWT_ISSUER` — Supabase Auth issuer URL, typically `https://<project-ref>.supabase.co/auth/v1`.
- `SUPABASE_JWT_AUDIENCE` — JWT audience, normally `authenticated`.
- `CORS_ORIGINS` — Comma-separated browser origins permitted to call the API; defaults to `http://localhost:5173` for local Vite development.
- `PORT` — HTTP port; defaults to `3000` when omitted.
- `NODE_ENV` — `development`, `test`, or `production`; defaults to `development` when omitted.

## Development commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run db:check
```

`npm run db:check` performs a simple `SELECT 1` using `DATABASE_URL`; it does not create or modify any tables.

## Authentication foundation

Protected backend endpoints require `Authorization: Bearer <Supabase access token>`. The backend verifies the JWT signature and issuer against Supabase's JWKS endpoint, then exposes only the verified token subject as `request.auth.authUserId`. Client-supplied user or student IDs are never accepted as proof of identity.

The only V1 application roles are `STUDENT`, `TEACHER`, and `ADMIN`. Authorization uses reusable `requireRoles(...)` middleware and reads the role only from the verified JWT's `app_metadata.role` claim. The role must be assigned through a server-controlled Supabase admin workflow; never use client-editable `user_metadata` for authorization.

## Drizzle migration workflow

Business-table schemas are intentionally not part of the database foundation. Once a confirmed module adds a schema under `src/database/schema/`, use:

```bash
npm run db:generate
npm run db:migrate
```

Generated SQL migrations are written to `src/database/migrations/` and must be reviewed before applying them to production. Migration commands use `DATABASE_URL`; no credentials are stored in the repository.
