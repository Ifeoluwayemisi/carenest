# Architecture

This document describes the CareNest architecture. It is living
documentation — update it when the shape of the system changes.

## System at a glance

```text
┌─────────────────────────┐        ┌──────────────────────────────┐
│  apps/web (Next.js)     │  HTTP  │  apps/api (Fastify REST API) │
│  ─ Mobile-first UI      │ ─────► │  ─ Auth / orgs / patients    │
│  ─ IndexedDB offline    │  JSON  │  ─ Visits / STT / AI         │
│  ─ Sync queue UI        │        │  ─ Sync / follow-ups         │
└─────────────────────────┘        └──────────────┬───────────────┘
                                                  │ pg pool
                                             ┌─────▼─────┐
                                             │ PostgreSQL│
                                             └───────────┘
```

## Core assumptions

- **Offline-first.** The CHW works in areas with poor connectivity. The frontend saves
  records locally and only needs the backend for sync and online features such as
  speech-to-text and AI structuring.
- **Organization-first.** Every entity belongs to an organization, and users are scoped to
  their organization.
- **Human-in-the-loop AI.** AI structures and suggests. A trained human reviews, edits, and
  confirms. Nothing is final until confirmed.

## Frontend architecture

- **Framework:** Next.js App Router with React + TypeScript + Tailwind CSS.
- **Folder conventions** under `apps/web/src/`:
  - `app/` — routes/layouts (App Router file-based routing).
  - `components/` — shared, reusable presentational components.
  - `features/` — feature-based modules. Each feature owns its domain-specific components,
    hooks, and services. Features land here as they are implemented (e.g.
    `features/patients/`, `features/visits/`, `features/auth/`).
  - `hooks/` — cross-cutting shared hooks (e.g. connectivity detection).
  - `lib/` — non-React utilities (API client, formatting, IndexedDB helpers).
  - `services/` — API-facing service modules grouped by resource.
  - `types/` — shared TypeScript types, aligned with the API contracts.
- **Offline layer (to be implemented with feature work):** IndexedDB for local storage,
  a pending-sync queue, and connectivity detection. The API client in `lib/` is the single
  place where API URLs and request/response handling are wired.

## Backend architecture

- **Framework:** Fastify + TypeScript, REST API.
- **Stack:** Node.js → Fastify → pg (node-postgres) → PostgreSQL. No ORM.
- **Layout** under `apps/api/src/`:
  - `config/` — environment parsing (Zod) and app configuration.
  - `controllers/` — request handling: validate input, call a service, respond.
  - `services/` — application/business logic. Feature work lands here.
  - `repositories/` — parameterized SQL queries grouped by resource (one file per
    resource). Last-resort data access; never run large SQL inside route handlers.
  - `routes/` — route registration, one file per area.
  - `schemas/` — Zod schemas for request bodies, params, queries, and responses.
  - `middlewares/` — centralized error handling and other cross-cutting concerns.
  - `db/` — centralized PostgreSQL pool (`pool.ts`), migration runner, seed.
  - `lib/` — small cross-cutting helpers (validation wrapper, errors, logger).
  - `types/` — shared TypeScript types.
  - `app.ts` — builds a Fastify instance from a configuration (`buildApp`). Kept free of
    side effects so tests can inject requests.
  - `server.ts` — process entry point: loads config, starts the listener, handles shutdown.
- **Data layer:** a single `pg.Pool` configured from `DATABASE_URL`. All queries use
  parameterized statements (no string interpolation of values) to prevent SQL injection.
  `withTransaction()` in `pool.ts` provides BEGIN/COMMIT/ROLLBACK for multi-statement
  writes.
- **Repository scoping:** every repository function that accesses organization-owned data
  takes `organizationId` explicitly (e.g. `getPatient(organizationId, patientId)`). No RLS;
  scoping is enforced in SQL via the `organizationId` parameter.
- **Migrations:** plain SQL files in `apps/api/migrations/NNN_*.sql`, applied in filename
  order by `src/db/migrate.ts`. Applied files are tracked in `schema_migrations` so each
  file runs exactly once, inside a transaction. The migration runner runs via
  `npm run db:migrate`.
- **Validation:** all external input is validated with Zod; response shapes are also
  declared with Zod schemas. AI output is additionally validated against a schema before
  it is returned or stored.
- **Errors:** a centralized error handler produces a consistent error envelope and maps
  Zod validation failures into HTTP 400 responses.
- **Auth:** `POST /api/v1/auth/login` (bcrypt password verification) returns a JWT with a
  minimal `sub`/`iat`/`exp` payload and a 12-hour expiry. Protected routes run the
  `authenticate` preHandler, which verifies the token **and re-checks the user in the
  database on every request**, so deactivated or removed accounts are rejected immediately.
  `requireRole(...roles)` layers role checks on top. `request.auth` (Fastify request
  augmentation) carries the authenticated user; `organizationId` is always derived from the
  token, never from request input. Auth hooks must be async — Fastify's hook runner only
  advances when a hook returns a promise (a sync hook that returns `undefined` hangs the
  request).

## Database model

The MVP schema (migrations `001_init.sql` + `002_foundation_hardening.sql`) defines:

- `organizations` — tenant root; all other tables belong to an organization.
- `users` — role field (`ADMIN | CHW | SUPERVISOR`), org-scoped. Emails are unique on
  `lower(email)` (case-insensitive), enforced by an index in `002`.
- `patients` — org-scoped demographic records; syncable offline via a client-generated ID.
- `visits` — draft → review → confirmed workflow. Holds the raw transcript, the structured
  AI draft (`ai_generated_json`), AI status/validation flags (and `ai_error` on failure),
  the human-confirmed result (`confirmed_json`), and `visited_at` (the client-supplied
  field visit time; `created_at` remains server arrival time). Sync metadata is an
  organization-scoped client-generated ID (`client_generated_id`) — the single idempotency
  concept. There is no global `idempotency_key`.
- `follow_ups` — org-scoped actionable follow-ups tied to a visit; syncable offline via a
  client-generated ID.

`ai_generated_json` and `confirmed_json` are kept separate so the AI draft is never
overwritten by the human review (and vice versa). `ai_generated_json` always keeps
patient-reported information, CHW observations, and AI suggestions in distinguishable
sections.

`updated_at` on every table is maintained automatically by a trigger from `002` (function
`set_updated_at()`), so services never manage it manually.

## Standard responses

- Route handlers respond with **plain data** (an object or array).
- Errors follow a single envelope (see `docs/API.md`).

## Standard error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A human-readable message",
    "details": []
  }
}
```

## Cross-cutting concerns

- **CORS:** configured in `app.ts` from `CLIENT_URL` so the local frontend can call the
  API during development.
- **Logging:** Fastify's built-in logger (pino) on the API; development defaults to
  `info` level JSON logs. Sensitive fields (authorization headers, cookies, passwords,
  password hashes, transcripts) are redacted via pino `redact` (`src/lib/logger.ts`).
- **Configuration:** all secrets and external-service settings come from environment
  variables, parsed and validated in `src/config/env.ts`.

## Deployment view (MVP)

- The API and web app are separate Node processes. The web app is built with Next.js
  static/generated routes where possible and served wherever the team deploys (platform of
  record to be decided at deployment time).
- The API requires a PostgreSQL database reachable via `DATABASE_URL` and applies the SQL
  migrations on deploy (`npm run db:migrate`).
- No queues, Redis, or Docker containers are required in the MVP.

## Future feature modules (not implemented in the foundation)

- Auth & organization management
- Patients
- Visits (capture, STT, AI structuring, review/confirm)
- Follow-ups
- Patient timeline
- Sync (offline queue → backend)
- Supervisor dashboard

Each will slot into the existing folders (routes / controllers / services / repositories /
schemas) without restructuring the workspace.