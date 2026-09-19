-- 002_foundation_hardening.sql — CareNest foundation hardening.
-- Designed to run after 001_init.sql was already applied (does not assume a
-- fresh database). All statements are transactional-safe to re-run via the
-- migration runner (each file runs exactly once).

-- 1. Auto-maintained updated_at -----------------------------------------------
-- A single trigger function keeps updated_at honest for sync + recent activity
-- instead of relying on every service remembering to set it.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Case-insensitive unique emails --------------------------------------------
-- Prevents duplicate auth identities from capitalization. Existing values are
-- normalized to lowercase; registration/login normalization is service-layer.

UPDATE users SET email = lower(email) WHERE email <> lower(email);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));

-- 3. Organization-scoped client-generated IDs (idempotent offline sync) --------
-- client_generated_id is the single idempotency concept. The generic global
-- idempotency_key is removed so there is one way to identify a client-created
-- record. Uniqueness is scoped per organization.

-- patients: becomes syncable offline too.
ALTER TABLE patients ADD COLUMN client_generated_id UUID;
CREATE UNIQUE INDEX patients_org_client_uidx
  ON patients (organization_id, client_generated_id);

-- visits: drop the duplicate global idempotency_key, keep client_generated_id.
ALTER TABLE visits DROP COLUMN IF EXISTS idempotency_key;
CREATE UNIQUE INDEX visits_org_client_uidx
  ON visits (organization_id, client_generated_id);

-- follow_ups: same treatment (follow-ups may be created offline in the MVP).
ALTER TABLE follow_ups DROP COLUMN IF EXISTS idempotency_key;
CREATE UNIQUE INDEX follow_ups_org_client_uidx
  ON follow_ups (organization_id, client_generated_id);

-- 4. Visit occurrence time represents the field visit, not server arrival ------
-- The client supplies the visit timestamp. created_at remains the server-side
-- record creation/arrival time. Existing rows are backfilled from visit_date,
-- which is then removed (its DEFAULT CURRENT_DATE trap is gone).

ALTER TABLE visits ADD COLUMN visited_at TIMESTAMPTZ;
UPDATE visits
   SET visited_at = COALESCE(visit_date::timestamptz, created_at)
 WHERE visited_at IS NULL;
ALTER TABLE visits ALTER COLUMN visited_at SET NOT NULL;
ALTER TABLE visits DROP COLUMN IF EXISTS visit_date;

-- 5. AI draft vs human-confirmed result ----------------------------------------
-- ai_generated_json (AI draft) is never overwritten by review; confirmed_json
-- holds the human-confirmed structured result. ai_error records AI
-- validation/processing failures.

ALTER TABLE visits ADD COLUMN confirmed_json JSONB;
ALTER TABLE visits ADD COLUMN ai_error TEXT;

-- 6. Indexes for sync-pull and patient timeline queries -------------------------
-- The client owns its pending sync queue, so the partial index used only to
-- find server rows not yet synced (idx_visits_synced) is removed.

DROP INDEX IF EXISTS idx_visits_synced;

CREATE INDEX idx_visits_sync     ON visits    (organization_id, updated_at);
CREATE INDEX idx_patients_sync   ON patients  (organization_id, updated_at);
CREATE INDEX idx_follow_ups_sync ON follow_ups (organization_id, updated_at);
CREATE INDEX idx_visits_timeline ON visits (patient_id, visited_at DESC);

-- 7. updated_at triggers --------------------------------------------------------
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_follow_ups_updated_at BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();