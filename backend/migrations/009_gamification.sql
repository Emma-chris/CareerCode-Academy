-- Phase 1: Duolingo-style gamification
-- Adds hearts, streak freezes, daily goals, XP tracking to users
-- Adds daily_xp_log and xp_history tables

-- Gamification columns on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS hearts INT DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_hearts INT DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_heart_regeneration TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_xp_goal INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Daily XP tracking (one row per user per day)
CREATE TABLE IF NOT EXISTS daily_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_earned INT DEFAULT 0,
  goal_reached BOOLEAN DEFAULT false,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- XP history log (append-only)
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  source VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_xp_log_user_date ON daily_xp_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id, created_at DESC);
