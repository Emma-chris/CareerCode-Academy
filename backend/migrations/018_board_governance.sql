-- Board of directors oversight for platform operations and policies.
-- Tracks board members, platform policies subject to board review/approval,
-- and formal resolutions passed by the board.
-- Idempotent — safe to re-run by the backend migration runner.

CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'operations'
    CHECK (category IN ('pricing', 'content', 'community', 'data', 'finance', 'operations', 'governance')),
  summary VARCHAR(500),
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  published BOOLEAN DEFAULT false,
  proposed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  body TEXT,
  passed BOOLEAN DEFAULT true,
  meeting_date DATE NOT NULL,
  passed_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_policies_status ON board_policies (status, published);
CREATE INDEX IF NOT EXISTS idx_board_members_active ON board_members (is_active, sort_order);