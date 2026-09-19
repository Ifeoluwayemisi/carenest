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

### Planned error codes

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
- MongoDB-style list endpoints return `{ items, page, pageSize, total }` unless specified
  otherwise.
- Timestamps are ISO 8601 UTC strings.