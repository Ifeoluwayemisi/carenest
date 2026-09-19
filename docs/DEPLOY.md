# CareNest Backend — Deployment (Render)

Target platform: **Render** (native Node.js web service) + **Neon** Postgres.

The backend boots from committed build output (`dist/`), applies idempotent SQL
migrations, listens on `0.0.0.0:$PORT`, and shuts down gracefully on SIGTERM.
There is no Dockerfile — Render is used in native Node mode (per AGENTS.md: no
Docker unless a clear reason appears).

---

## 1. Prerequisite: a Postgres database

Create a Postgres database (e.g. Neon free tier) and note the connection string.

- Prefer the **direct (non-pooler)** host when possible. Neon's `-pooler`
  hostname has shown flaky DNS locally (`getaddrinfo EAI_AGAIN`); the direct
  host avoids that class of flake.
- The app uses the whole `DATABASE_URL` and manages its own pool
  (`DATABASE_POOL_MAX`, default 10).

---

## 2. What gets deployed

Commit `carenest/` (the workspace root) to Git and connect the repo to Render.
Inside the repo, the API lives at `carenest/apps/api/`, with the npm workspace
root at `carenest/`.

| Value | Setting |
| --- | --- |
| **Root Directory** | `carenest` (if the repo root is the folder *containing* carenest) or `.` (if `carenest/` is itself the repo root) |
| **Build Command** | `npm ci && npm run build --workspace apps/api` |
| **Start Command** | `npm run start:api` |
| **Health Check Path** | `/health` (DB-independent — returns 200 even before the DB is reachable, so health checks don't flap) |
| **Runtime** | Node.js |
| **Node version** | `>=20` — set env `NODE_VERSION=22` |

The build compiles **API only** (`tsc` → `apps/api/dist`). Start runs
`node dist/server.js` listening on the `PORT` that Render injects.

> **Why not `npm run build` (root)?** It also compiles `apps/web`. The web app
> belongs to the frontend owner and its `next build` currently fails on Render
> (prerender error on `/_global-error`, `useContext` on null) — don't let that
> block the backend. Deploy the web app as its own Render service
> (`npm run start:web`, it builds with `next build`) after the frontend fix.

---

## 3. Environment variables

Set these in the Render dashboard (**Environment** → **Environment Variables**)
or via `render.yaml` blueprint. Never commit `.env` files — they are gitignored.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `NODE_VERSION` | yes | `22` (or any `>=20`) |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `JWT_SECRET` | yes | **minimum 32 characters**; generate with `openssl rand -hex 32` |
| `CLIENT_URL` | yes | Frontend origin for CORS (e.g. `https://carenest-web.onrender.com`) |
| `GROQ_API_KEY` | strongly recommended | Enables AI structuring + speech-to-text. Without it, visits still create fine but every AI step ends with `ai_status=FAILED` (manual confirm still works) |
| `PORT` | no | Render injects it automatically; the app reads it |

`JWT_SECRET` shorter than 32 chars causes the app to validate env and exit on
boot — see Troubleshooting.

---

## 4. Migrations and seed

Migrations run via a one-off command — the server does **not** run them at
startup.

1. Before first deploy (or right after deploy), apply migrations:

   ```bash
   npm ci
   npm run db:migrate
   ```

   (If you are not on the Render shell, run this locally with
   `DATABASE_URL` pointed at the production database.)

2. Optional, for demo data (idempotent — safe to re-run):

   ```bash
   npm run db:seed
   ```

   Creates the `carenest-demo` org with demo users/patient/visit
   (password `CareNestDemo!2026`). **Demo credentials only — do not use for
   real data.**

3. Re-deploy afterwards so the app picks up the schema. New migrations in later
   PRs follow the same step-1 command.

---

## 5. Optional: Render blueprint (`render.yaml`)

If you prefer infrastructure-as-code at the repo root, a minimal blueprint:

```yaml
services:
  - type: web
    name: carenest-api
    runtime: node
    rootDir: carenest
    plan: free
    buildCommand: npm ci && npm run build --workspace apps/api
    startCommand: npm run start:api
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: "22"
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: CLIENT_URL
        value: https://carenest-web.onrender.com
```

Secrets use `sync: false` so they stay only in the Render dashboard.

---

## 6. Verification after deploy

```bash
# health (DB-independent probe)
curl https://<service>.onrender.com/health

# login (after seed)
curl -X POST https://<service>.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carenest.dev","password":"CareNestDemo!2026"}'
```

Then exercise the visit flow: create a patient (CHW token) → create a visit →
AI draft appears (`ai_status=VALIDATED`, `ai_generated_json` populated) →
PATCH review → POST confirm.

---

## 7. Notes and caveats

- **Free tier**: Render free instances spin down after ~15 min idle — cold
  starts add latency; the DB-independent `/health` keeps probes reliable.
- **Request timeouts**: speech-to-text waits up to **30s** and AI up to **20s**.
  Render doesn't impose a per-request timeout, but if you ever put the API
  behind another proxy (Cloudflare, ALB), make sure its timeout is ≥ 30s or
  voice uploads can be cut off.
- **AI cost/limits**: voice visits each call both STT and AI. Keep the
  GROQ key quota in mind during demos.
- **No Docker**: this doc uses Render's native Node runtime. If a container
  deploy is ever required, add a Dockerfile then — not now.
- **Pooler DNS flake**: if you see `getaddrinfo EAI_AGAIN` at boot, point
  `DATABASE_URL` at the direct (non-pooler) Neon host.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| App exits immediately at boot | Env validation failure (e.g. `JWT_SECRET` < 32 chars) — check Render logs for `Invalid environment configuration` |
| `getaddrinfo EAI_AGAIN` | Neon `-pooler` host DNS flake — use the direct host in `DATABASE_URL` |
| Visits show `ai_status=FAILED` | `GROQ_API_KEY` missing or invalid; transcript is still saved and manual confirm works |
| 403 on existing token after seed | Seed resets demo passwords — log in again |
| CORS errors from the browser | `CLIENT_URL` must exactly match the frontend origin (scheme + host + port) |