# AGENTS.md

Working rules for human contributors and AI agents in the **CareNest** repository.

## Project overview

**CareNest** is an offline-first, voice-powered field copilot for Community Health
Workers (CHWs). It is being built as a hackathon MVP under the working name "CareNest".

### What CareNest does

The core workflow:

1. The CHW selects or creates a patient.
2. The CHW records a visit by voice or text.
3. Speech is transcribed to text.
4. AI structures the transcript into a draft visit record.
5. The CHW reviews and edits the draft.
6. The CHW confirms the visit.
7. The visit is saved locally and later syncs to the backend when connectivity returns.

### Primary users

- **Community Health Workers (CHWs)** — the primary users. They capture visits in the field,
  often with poor connectivity.
- **Supervisors/Admins** — see an overview of their teams' activity via a basic dashboard.

### Organization-first model

The product is organized around **organizations**. All data — patients, CHWs, supervisors,
visits, follow-ups — belongs to an organization. Users are scoped to their organization.
(Organization/role data model lands with the feature work, not this foundation.)

### AI role

AI is an **assistant, not a decision-maker**. It:

- structures reported information into a draft,
- summarizes what the patient and CHW reported,
- identifies **missing documentation**,
- suggests follow-up actions for human review.

AI must **never** diagnose, prescribe, invent symptoms or vitals, or make emergency
decisions. See [Safety principles](#safety-principles).

### Offline-first behavior

The frontend owns local browser storage (IndexedDB), connectivity detection, the pending
sync queue UI, and local draft state. The backend owns sync endpoints, persistence,
idempotency, duplicate prevention, and sync responses. There is **no** complex conflict
resolution in the MVP.

## MVP scope

### Included

- Organization and user roles
- Admin, CHW, and Supervisor access
- CHW onboarding and authentication
- Patient management
- Voice or text visit capture
- Speech-to-text (backend integration)
- AI structuring (backend integration)
- Human review and confirmation
- Follow-up actions
- Patient visit timeline
- Offline local saving (IndexedDB)
- Sync queue and backend synchronization
- Basic supervisor dashboard
- Error handling
- Testing
- Deployment

### Excluded (do not implement without explicit approval)

- Patient handoff
- Provider portal
- Handoff acknowledgement or outcome
- QR handoff
- WhatsApp
- SMS
- Push notifications
- Multiple local-language AI support
- Advanced analytics
- EHR/FHIR integrations
- Provider networks
- Predictive analytics
- Billing or claims
- Complex offline conflict resolution
- Diagnosis or prescription functionality

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + ESLint, mobile-first and
  responsive. Feature-based folder structure under `apps/web/src/features/`.
- **Backend:** Node.js + TypeScript + Fastify + pg (node-postgres) + PostgreSQL + Zod, REST
  API, with SQL migrations.
- **Other:** IndexedDB (frontend), Vitest (backend tests), environment variables for all
  secrets and configuration.
- **No** microservices, Redis, queues, Docker, ORMs, or state-management libraries unless a
  clear MVP reason appears.

## Repository layout

```text
carenest/
├── apps/
│   ├── api/          # Fastify REST API + pg + PostgreSQL + Zod + SQL migrations
│   └── web/          # Next.js frontend
├── docs/
│   ├── API.md
│   └── ARCHITECTURE.md
├── AGENTS.md
└── README.md
```

## Roles and ownership

Ownership is by application, not by layer.

- **Rachael** — owns the **entire backend MVP**: backend foundation, database schema and
  SQL migrations, auth/authz, organization management, CHW management/onboarding APIs,
  patient management, visit management, speech-to-text, AI structuring, AI output
  validation, human review/confirmation APIs, follow-up APIs, patient timeline APIs,
  offline sync APIs, supervisor APIs, error handling, backend tests, API documentation,
  and backend deployment support. Do not create frontend implementation tasks for Rachael.
- **Olamide** — owns the **entire frontend MVP**. Do not create backend implementation
  tasks for Olamide. Keep frontend code modular and feature-based.
- **Divine** — research and pitch deck.
- **Rukayat** — pitching.

## Safety principles

- CareNest is **not** a diagnostic or prescribing tool.
- AI output is a **draft** until reviewed and confirmed by a human.
- AI must not diagnose, prescribe, invent symptoms, invent vitals, or make emergency
  decisions.
- Patient-reported information, CHW observations, and AI suggestions must remain
  **distinguishable** in the UI and in stored data.
- Use **synthetic data** for development and demos.
- Never expose AI provider keys to the frontend.
- Do not claim regulatory compliance unless verified.

## Engineering principles

- Keep code simple and readable.
- Avoid duplicate logic.
- Avoid unnecessary dependencies.
- Validate all external input.
- Validate AI output with schemas.
- Keep secrets out of source control.
- Use database migrations.
- Write tests for important business logic.
- Do not modify unrelated working code.
- Do not implement features outside the approved MVP without explicit approval.
- Prefer feature-based organization for frontend code.
- Keep API contracts documented and stable.

## Repository data-access convention

- Every repository function that accesses organization-owned data **must receive
  `organizationId` explicitly** (e.g. `getPatient(organizationId, patientId)`).
- Never rely on a service remembering to filter by organization after a repository query
  has already been written unscoped.
- PostgreSQL RLS is **not** used; scoping is enforced in SQL through the
  `organizationId` parameter.

## Offline and synchronization principles

- **Frontend owns:** local storage, connectivity detection, pending queue UI, and local
  draft state.
- **Backend owns:** sync endpoints, persistence, idempotency, duplicate prevention, and sync
  responses.
- Do not implement complex conflict resolution for the hackathon.
- Do not claim cloud AI processing works without internet.
- Offline mode should save records locally and process or synchronize them when
  connectivity returns.

## Collaboration principles

- Keep frontend and backend contracts documented (`docs/API.md`).
- Avoid changing API response shapes without updating documentation.
- Use clear branch and commit names.
- Do not overwrite another contributor's work.
- Reuse shared components and utilities.
- Read `DESIGN.md` before implementing polished product screens.

## Design file rule

When `DESIGN.md` is available, read it before implementing product screens. Treat it as the
source of truth for visual design, design tokens, spacing, typography, colors, components,
and UX patterns. Do not invent a competing design system. Do not block workspace setup
while waiting for it. Keep the initial frontend foundation easy to adapt.

## Verification commands

Run these before considering work complete:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If a command fails, fix it before asking for review. Never claim a check passed unless it
actually ran.