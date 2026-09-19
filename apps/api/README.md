# CareNest — API

REST API for the CareNest MVP: **Node.js + TypeScript + Fastify + pg (node-postgres) +
PostgreSQL + Zod**, with plain SQL migrations.

CareNest is an offline-first, voice-powered field copilot for Community Health Workers
(CHWs).

## Local development

```bash
npm install
cp .env.example .env          # then edit values (DB URL, secrets)
createdb carenest             # create the database (or use your PostgreSQL client)
npm run db:migrate            # apply SQL migrations in apps/api/migrations
npm run db:seed               # optional synthetic development data
npm run dev                   # tsx watch on http://localhost:4000
```

Verify:

```bash
curl http://localhost:4000/health
# {"success":true,"message":"CareNest API is running"}
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run format` | Prettier |
| `npm test` | Vitest suite (`tests/`) |
| `npm run db:migrate` | Apply pending SQL migrations (idempotent) |
| `npm run db:seed` | Seed synthetic development data |

## Layout

```text
src/
├── config/       # Environment parsing (Zod) — src/config/env.ts
├── controllers/  # Request handling (validate → call service → respond)
├── services/     # Application/business logic (feature work lands here)
├── repositories/ # Parameterized SQL queries, one file per resource
├── routes/       # Route registration
├── schemas/      # Zod schemas (request bodies + response shapes)
├── middlewares/  # Centralized error handling and cross-cutting concerns
├── db/           # pg pool (src/db/pool.ts), migration runner, seed
├── lib/          # Shared helpers (errors, validation, logger)
├── types/        # Shared API contract types
├── app.ts        # buildApp() — dependency-light Fastify factory
└── server.ts     # Process entry point

migrations/       # Numbered .sql migrations, applied in order by db:migrate
```

### Database access

- A single centralized `pg.Pool` lives in `src/db/pool.ts`; import the `query` helper for
  parameterized statements. **Never string-concatenate values into SQL.**
- Migrations live in `migrations/NNN_*.sql` and are applied exactly once each, tracked in
  the `schema_migrations` table. Each migration runs inside a transaction.

## Environment variables

All configuration comes from environment variables parsed in `src/config/env.ts`.
See `.env.example`. Never commit `.env` or real secrets.

## Notes

- The `/health` endpoint is database-independent so the process can boot even when
  PostgreSQL is unavailable during feature development.
- The MVP schema (organizations, users, patients, visits, follow_ups) is defined in
  `migrations/001_init.sql` and hardened in `migrations/002_foundation_hardening.sql`
  (case-insensitive unique emails, org-scoped client-generated IDs, `visited_at`,
  `confirmed_json`, `ai_error`, automatic `updated_at`, and sync/timeline indexes).
  Offline sync uses one idempotency concept per record: `client_generated_id`, unique
  per organization.

## Auth

Endpoints (see `docs/API.md`): `POST /api/v1/auth/login` and `GET /api/v1/auth/me`.

- Passwords are verified with **bcrypt**; nothing exposes `password_hash`.
- JWT payload is minimal (`sub`, `iat`, `exp`) and expires after **12 hours**.
- Every authenticated request re-checks the user in the database (`authenticate`
  preHandler), so deactivated or removed accounts are rejected immediately even with a
  still-valid token. `requireRole(...roles)` adds role checks on top.
- `request.auth` carries the authenticated user including `organizationId`, which is
  **derived only from the token** — never from request bodies or params.
- Email lookup is case-insensitive in the service layer (backed by the
  `users_email_lower_uidx` index).

### Demo credentials

```text
email             role         password
admin@carenest.dev       ADMIN       CareNestDemo!2026
amina@carenest.dev       CHW         CareNestDemo!2026
supervisor@carenest.dev  SUPERVISOR  CareNestDemo!2026
```

### Tests

`npm test` runs against a dedicated database. Configure `TEST_DATABASE_URL` in
`apps/api/.env` (a separate Neon database is recommended); DB-backed suites fall back to
a local URL and will fail to connect (loudly) if none is reachable.