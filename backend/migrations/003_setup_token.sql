-- Add setup_token and setup_token_expires to users table for instructor password setup flow
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS setup_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS setup_token_expires TIMESTAMPTZ;
