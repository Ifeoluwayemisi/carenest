# CareNest — Web

Next.js (App Router) + TypeScript + Tailwind CSS frontend for the CareNest MVP.

CareNest is an offline-first, voice-powered field copilot for Community Health Workers
(CHWs).

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Visit http://localhost:3000/health-check to verify the
frontend can reach the backend API.

## Structure

```text
src/
├── app/           # Routes, layouts, and global styles (App Router)
├── components/    # Shared reusable components
├── features/      # Feature-based modules (patients, visits, auth, dashboard…)
├── hooks/         # Shared hooks (e.g. connectivity detection)
├── lib/           # Non-React utilities (API client, formatting, IndexedDB)
├── services/      # API service modules grouped by resource
└── types/         # Shared types aligned with docs/API.md
```

- All backend communication goes through `src/lib/api.ts`, which reads the public API
  base URL from `NEXT_PUBLIC_API_URL`.
- Feature code lives under `src/features/<name>/` (components, hooks, services for that
  feature). Shared bits stay in the top-level folders.
- Mobile-first and responsive. Do not invent a competing design system before `DESIGN.md`
  is available (see root `AGENTS.md`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier |

## Environment variables

See `.env.example`. Only `NEXT_PUBLIC_*` variables reach the browser — never put secrets
in frontend env files.