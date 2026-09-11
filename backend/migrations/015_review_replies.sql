-- Instructor review replies: track whether a course review has been answered.
-- Backs the instructor dashboard "Pending Reviews" metric (unreplied reviews).
-- Idempotent — safe to re-run by the backend migration runner.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;