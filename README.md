# CareNest

An **offline-first, voice-powered field copilot** for Community Health Workers (CHWs).

A CHW selects or creates a patient, records a visit by voice or text, the speech is
transcribed, AI structures the information into a draft, the CHW reviews and edits the
draft, then confirms it. The visit is saved locally and syncs to the backend when
connectivity returns.

> **Safety boundary:** CareNest is **not** a diagnostic or prescribing tool. AI only
> structures information, summarizes reported information, identifies missing
> documentation, and suggests follow-up actions for human review. Nothing is final until a
> human reviews and confirms it.

## Workspace layout

```text
carenest/
├── apps/
│   ├── api/   # REST API — Node.js + Fastify + TypeScript + pg + PostgreSQL + Zod
│   └── web/   # Frontend — Next.js (App Router) + TypeScript + Tailwind CSS
├── docs/      # API.md and ARCHITECTURE.md
└── AGENTS.md  # Working rules and scope for contributors and AI agents
```

## Prerequisites

- Node.js 20+ (recommended: current LTS)
- npm 10+
- PostgreSQL 15+ (local, or any reachable DATABASE_URL)

## Getting started

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Prepare the database — creates the carenest database from the SQL migrations
createdb carenest            # or create the database in your PostgreSQL client
npm run db:migrate           # applies apps/api/migrations/*.sql (idempotent)
npm run db:seed              # optional synthetic development data

# 4. Run the API (http://localhost:4000) and web app (http://localhost:3000)
npm run dev
```

Verify the API is up:

```bash
curl http://localhost:4000/health
# {"success":true,"message":"CareNest API is running"}
```

Open http://localhost:3000/health-check in the browser to confirm the frontend can reach
the backend.

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + web concurrently |
| `npm run dev:api` | Run the API only (`tsx watch`) |
| `npm run dev:web` | Run the web app only (Next.js dev server) |
| `npm run build` | Build the API then the web app |
| `npm run typecheck` | Type-check both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm run format` | Format both workspaces with Prettier |
| `npm test` | Run backend Vitest suite |
| `npm run db:migrate` | Apply SQL migrations (`apps/api/migrations`) |
| `npm run db:seed` | Seed synthetic development data |

## Environment variables

Secrets and external-service configuration live in environment files, never in source.

- Backend: `apps/api/.env` — see `apps/api/.env.example`
- Frontend: `apps/web/.env.local` — see `apps/web/.env.example`

The AI (Groq) provider key is a backend-only secret. It must never be exposed to the
frontend or shipped to the browser.

## Troubleshooting

**`npm install` fails with `Cannot read properties of null (reading 'edgesOut')`** — this
is an npm 10.x workspace bug. Try one of:

```bash
# Option A: use a newer npm for the install only
npx npm@latest install

# Option B: clean the workspace metadata and retry
# PowerShell:
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install

# bash / macOS / Linux:
# rm -rf node_modules package-lock.json
# npm install
```

## Design

The designer will provide `DESIGN.md`. Until then, the frontend uses a minimal,
feature-organized foundation that is easy to adapt. Read `DESIGN.md` before building
polished product screens; do not invent a competing design system before it arrives.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [API reference](./docs/API.md)
- [Working rules / contributing](./AGENTS.md)