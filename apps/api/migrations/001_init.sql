-- 001_init.sql — CareNest core schema (MVP foundation)
-- Entities: organizations, users, patients, visits, follow_ups.
-- All application queries use parameterized statements.

-- Utility: fresh UUIDs use gen_random_uuid() (built-in since PostgreSQL 13).

-- Organizations ---------------------------------------------------------------

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (roles: ADMIN, CHW, SUPERVISOR) --------------------------------------

CREATE TYPE user_role AS ENUM ('ADMIN', 'CHW', 'SUPERVISOR');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'CHW',
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  phone           TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_organization ON users (organization_id);
CREATE INDEX idx_users_role ON users (role);

-- Patients -------------------------------------------------------------------

CREATE TABLE patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unique_id       TEXT,                 -- organization-local identifier used by the CHW
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  date_of_birth   DATE,
  gender          TEXT,
  phone           TEXT,
  address         TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_organization ON patients (organization_id);
CREATE INDEX idx_patients_name ON patients (last_name, first_name);

-- Visits ---------------------------------------------------------------------
-- status lifecycle: DRAFT -> UNDER_REVIEW -> CONFIRMED (human review required
-- before a visit becomes confirmed/final).

CREATE TYPE visit_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'CONFIRMED');
CREATE TYPE visit_ai_status AS ENUM ('PENDING', 'READY', 'VALIDATED', 'FAILED');

CREATE TABLE visits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chw_id             UUID NOT NULL REFERENCES users(id),
  visit_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  notes              TEXT,             -- CHW notes and observations
  transcript         TEXT,             -- raw speech-to-text transcript (if recorded by voice)

  -- AI structuring fields. ai_generated_json always separates patient-reported
  -- information, CHW observations, and AI suggestions so they stay
  -- distinguishable. AI output must pass schema validation before storage.
  ai_generated_json  JSONB,
  ai_status          visit_ai_status NOT NULL DEFAULT 'PENDING',
  ai_validated       BOOLEAN NOT NULL DEFAULT false,
  ai_reviewed_at     TIMESTAMPTZ,

  -- Human review / confirmation
  review_notes       TEXT,             -- what the CHW corrected or added
  status             visit_status NOT NULL DEFAULT 'DRAFT',
  confirmed_by       UUID REFERENCES users(id),
  confirmed_at       TIMESTAMPTZ,

  -- Synchronization metadata (offline-first)
  client_generated_id UUID,
  idempotency_key    TEXT UNIQUE,
  synced_at          TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_organization ON visits (organization_id);
CREATE INDEX idx_visits_patient ON visits (patient_id);
CREATE INDEX idx_visits_status ON visits (status);
CREATE INDEX idx_visits_synced ON visits (synced_at) WHERE synced_at IS NULL;

-- Follow-ups -----------------------------------------------------------------

CREATE TYPE follow_up_status AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

CREATE TABLE follow_ups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  visit_id           UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assigned_to        UUID REFERENCES users(id),
  summary            TEXT NOT NULL,
  due_date           DATE,
  status             follow_up_status NOT NULL DEFAULT 'OPEN',

  -- Synchronization metadata
  client_generated_id UUID,
  idempotency_key    TEXT UNIQUE,
  synced_at          TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_organization ON follow_ups (organization_id);
CREATE INDEX idx_follow_ups_visit ON follow_ups (visit_id);
CREATE INDEX idx_follow_ups_status ON follow_ups (status);