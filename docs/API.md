# API Reference (CareNest)

Base URL (development): `http://localhost:4000`

All endpoints return JSON. This document is the contract between `apps/api` and `apps/web`.
Keep shapes stable and update this file whenever a response shape or route changes.

## Success shape

Handlers return the resource/result directly. For example:

```json
{
  "success": true,
  "message": "CareNest API is running"
}
```

## Error shape

Errors use a consistent envelope:

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

| Field | Type | Description |
| --- | --- | --- |
| `code` | string | Stable machine-readable error code |
| `message` | string | Human-readable message |
| `details` | array | Optional per-field validation or error details |

### Error codes

- `VALIDATION_ERROR` — input failed Zod validation (HTTP 400)
- `NOT_FOUND` — resource does not exist (HTTP 404)
- `UNAUTHORIZED` — missing/invalid authentication (HTTP 401)
- `FORBIDDEN` — authenticated but not allowed (HTTP 403)
- `CONFLICT` — duplicate/conflicting state (HTTP 409)
- `INTERNAL_ERROR` — unexpected failure (HTTP 500)

## Endpoints

### `GET /health`

Live/health probe. Verifies the API process is up. Does **not** touch the database.

**Response `200`**

```json
{
  "success": true,
  "message": "CareNest API is running"
}
```

### `GET /api/v1` (placeholder)

Reserved for the versioned REST surface. Feature endpoints will be added under `/api/v1`
as they land (auth, organizations, patients, visits, follow-ups, sync, etc.).

### `POST /api/v1/auth/login`

Authenticates a user with email + password and returns a bearer JWT and the user.

**Request body**

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Case-insensitive; normalized to lowercase before lookup |
| `password` | string | Verified with bcrypt |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "…",
      "organizationId": "…",
      "role": "ADMIN",
      "name": "…",
      "email": "…",
      "active": true
    }
  }
}
```

The `organizationId` in the response is derived from the authenticated user's record —
clients must never send an `organizationId` in the body, query, or params; any provided
value is ignored.

**Token contract**: compact JWT with a minimal payload of `sub`, `iat`, `exp`. Expiry is
**12 hours** from issuance. Send it as `Authorization: Bearer <token>`.

### `GET /api/v1/auth/me`

Returns the authenticated user. Requires the bearer token. Re-validates the user against
the database on every call, so deactivated or deleted accounts are rejected even with an
unexpired token.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "…",
    "organizationId": "…",
    "role": "ADMIN",
    "name": "…",
    "email": "…",
    "active": true
  }
}
```

### Auth error contract

| Condition | HTTP | `code` |
| --- | --- | --- |
| Missing/changed `Authorization` header | `401` | `UNAUTHORIZED` |
| Malformed or invalid token (bad signature, garbage) | `401` | `UNAUTHORIZED` |
| Expired token | `401` | `UNAUTHORIZED` |
| Bad email/password at login | `401` | `UNAUTHORIZED` |
| Inactive/deactivated account (login or authenticated request) | `403` | `FORBIDDEN` |
| Authenticated but insufficient role for a guarded route | `403` | `FORBIDDEN` |

Role guarding is done with `requireRole(...roles)` on protected routes; protected
feature routes must be `preHandler: [authenticate, requireRole(...)]`.

## Users (organization user management / CHW onboarding)

Every user belongs to exactly one organization. `organizationId` always comes from the
authenticated user — never from the body/query/params (values sent there are ignored).
There is **no public `/register`** endpoint: onboarding is ADMIN-only, and the initial
credential is set by the ADMIN at creation time (no email invitations in the MVP).

### Authorization matrix

| Operation | ADMIN | CHW | SUPERVISOR |
| --- | --- | --- | --- |
| Create user (CHW) | ✅ | – | – |
| List users / view user | ✅ | – | ✅ (read-only) |
| Update user info / reset password | ✅ | – | – |
| Deactivate / reactivate user | ✅ | – | – |

### `POST /api/v1/users` (ADMIN)

Creates a CHW with an initial password. Role is always `CHW` (never read from the body).

**Request body**

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | 1–120 chars |
| `email` | string | Must be a valid email; case-insensitively unique. Duplicate → `409 CONFLICT` |
| `password` | string | Initial credential, 8–512 chars |
| `phone` | string? | Optional, ≤30 chars |

**Response `201`** — `data.user` (no `passwordHash` ever):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "…",
      "organizationId": "…",
      "role": "CHW",
      "name": "…",
      "email": "…",
      "phone": null,
      "active": true,
      "createdAt": "…",
      "updatedAt": "…"
    }
  }
}
```

### `GET /api/v1/users` (ADMIN, SUPERVISOR read-only)

Lists the authenticated user's organization users, newest first. Optional query
`?role=ADMIN|CHW|SUPERVISOR` filters by role.

**Response `200`** — `data.users: []` (each item shaped like `data.user` above).

### `GET /api/v1/users/:id` (ADMIN, SUPERVISOR read-only)

Returns one organization user. Users outside the caller's organization (or unknown ids)
return `404 NOT_FOUND` — cross-organization rows are never visible.

### `PATCH /api/v1/users/:id` (ADMIN)

Updates a CHW's `name`, `email`, `phone`, and/or `password`. Body fields optional.
Duplicate email (case-insensitive) → `409 CONFLICT`. Cross-org/unknown → `404`.

### `POST /api/v1/users/:id/deactivate` (ADMIN)

Sets `active = false`. Deactivation takes effect immediately: the user's existing JWT
stops authorizing requests because every protected route re-checks the `active` flag in
the database (`authenticate`). Historical patient/visit records are **not** deleted. An
admin cannot deactivate their own account (`400 VALIDATION_ERROR`).

### `POST /api/v1/users/:id/reactivate` (ADMIN)

Sets `active = true`, restoring access.

## Patients (organization-scoped)

Every patient belongs to exactly one organization. All queries are scoped to the
authenticated user's `organizationId`; no cross-organization access is possible.

### Authorization matrix

| Operation | ADMIN | CHW | SUPERVISOR |
| --- | --- | --- | --- |
| Create patient | ✅ | ✅ | – |
| Read patients / view patient | ✅ | ✅ | ✅ |
| Update patient | ✅ | ✅ | – |

### `POST /api/v1/patients` (CHW, ADMIN)

**Request body**

| Field | Type | Notes |
| --- | --- | --- |
| `firstName` | string | Required, 1–120 chars |
| `lastName` | string | Required, 1–120 chars |
| `uniqueId` | string? | Organization-local identifier used by the CHW, ≤64 chars |
| `clientGeneratedId` | string? | UUID for offline-first sync; **idempotency key**, unique per organization |
| `dateOfBirth` | string? | `YYYY-MM-DD`, must be a real calendar date |
| `gender` | string? | ≤20 chars |
| `phone` | string? | ≤40 chars |
| `address` | string? | ≤255 chars |

**Offline retry safety**: when a `clientGeneratedId` is provided and a patient with the
same `(organizationId, clientGeneratedId)` already exists, the existing patient is
returned (still `201`) instead of inserting a duplicate. This is the only idempotency
concept; `clientGeneratedId` is immutable after creation.

**Response `201`** — `data.patient`. `createdBy` is the creating user's id.

### `GET /api/v1/patients` (all roles)

Lists the organization's patients, most recently updated first. Optional query
`?search=<term>` matches `firstName`, `lastName`, `uniqueId`, or `phone` (case-insensitive).

**Response `200`** — `data.patients: []`.

### `GET /api/v1/patients/:id` (all roles)

**Response `200`** — `data.patient`. Cross-org or unknown ids → `404 NOT_FOUND`.

### `PATCH /api/v1/patients/:id` (CHW, ADMIN)

Partial update of `uniqueId`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `phone`,
`address` (send `null` to clear an optional field). `clientGeneratedId` is not mutable.
Cross-org/unknown → `404`.

## Visits (vertical slice: create → review → confirm → timeline)

Auth matrices (all visits endpoints): **CHW/ADMIN** write; **SUPERVISOR** read-only.

### `POST /api/v1/visits` — text visit (CHW, ADMIN) `Content-Type: application/json`

```json
{ "patientId": "<uuid>", "transcript": "Patient reported ...", "visitedAt": "2026-09-19T10:00:00Z", "notes": "...", "clientGeneratedId": "<uuid, optional>" }
```

Creates a `DRAFT` visit, persists the transcript, then runs the transcript through
AI structuring (`processVisit`). On AI success → `aiStatus: VALIDATED` with
`aiGeneratedJson`; on AI failure → `aiStatus: FAILED` + `aiError` (visit is still
created with its transcript intact for manual review). Cross-org/unknown patient → `404`.
Repeated `clientGeneratedId` is idempotent (returns the existing visit, `201`).

### `POST /api/v1/visits` — voice visit (CHW, ADMIN) `Content-Type: multipart/form-data`

Form fields: `patientId`, optional `visitedAt`/`clientGeneratedId`/`notes`; file field
`audio`. Runs the upload through STT (`transcribeAudio`; `STT_LIMITS` bounds upload
size) then the same create path. On STT failure → `400 VALIDATION_ERROR` and **no visit
row is created** (retry as text).

### `GET /api/v1/visits/:id` (all roles)

Full visit record including `aiGeneratedJson`, `confirmedJson`, `aiStatus`, `status`.

### `PATCH /api/v1/visits/:id` (CHW, ADMIN) — review

Body: `{ "notes"? , "reviewNotes"? }` (send `null` to clear). Moves `status` to
`UNDER_REVIEW`.

### `POST /api/v1/visits/:id/confirm` (CHW, ADMIN)

```json
{ "confirmedJson": { "summary": {"text","sourceType"}, "reportedConcerns": [{"text","sourceType"}], "missingInformation": [], "suggestedFollowUps": [] }, "reviewNotes": "optional" }
```

Writes `confirmedJson`, `confirmedBy`, `confirmedAt`, `status: CONFIRMED`. Works
identically when `aiStatus` is `VALIDATED` or `FAILED` (manual fallback). The AI draft
is never overwritten.

### `GET /api/v1/patients/:id/timeline` (all roles)

`{ "patientId", "visits": [...newest first by visitedAt], "followUps": [] }`. Timeline
entries expose `summary` (from `aiGeneratedJson`), `transcript`, `status`, `confirmedAt`.

### `GET *` / unknown routes

**Response `404`**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

## Conventions for future endpoints

- Versioned under `/api/v1`.
- Request bodies are validated with Zod; invalid input returns `400 VALIDATION_ERROR`
  with per-field `details`.
- Auth is bearer-token based (`Authorization: Bearer <jwt>`); protected routes return
  `401` when absent/invalid and `403` when the user lacks permission.
- Collection endpoints return arrays inside `data` (e.g. `data.users`, `data.patients`).
- `organizationId` is never accepted from the request; it always comes from the
  authenticated user.
- Create endpoints return `201`; mutable resources are updated with `PATCH`.
- Timestamps are ISO 8601 UTC strings.