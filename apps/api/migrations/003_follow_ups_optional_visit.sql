-- 003_follow_ups_optional_visit.sql — follow-ups may exist without a source visit.
-- The MVP API allows creating a standalone follow-up for a patient (visitId is
-- optional); the 001 schema forced visit_id NOT NULL. Dropping the constraint
-- (the FK + ON DELETE CASCADE remain) unblocks that without changing any core table.

ALTER TABLE follow_ups ALTER COLUMN visit_id DROP NOT NULL;