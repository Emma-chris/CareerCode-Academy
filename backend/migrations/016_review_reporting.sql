-- Instructor review reporting: mark abusive reviews for admin review.
-- Idempotent — safe to re-run by the backend migration runner.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;