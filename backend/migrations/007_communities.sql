-- ============================================================
-- 007_communities.sql
-- Community management: communities, members, rules, invites
-- ============================================================

-- Communities (top-level, like Discord servers)
CREATE TABLE IF NOT EXISTS communities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(250) UNIQUE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  category      VARCHAR(100) NOT NULL DEFAULT 'General',
  visibility    VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'restricted')),
  join_policy   VARCHAR(20) DEFAULT 'open' CHECK (join_policy IN ('open', 'approval', 'invite_only')),
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count  INTEGER DEFAULT 1,
  channel_count INTEGER DEFAULT 0,
  is_archived   BOOLEAN DEFAULT false,
  rules         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Community members
CREATE TABLE IF NOT EXISTS community_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  is_muted     BOOLEAN DEFAULT false,
  is_banned    BOOLEAN DEFAULT false,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Community rules
CREATE TABLE IF NOT EXISTS community_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Community invites
CREATE TABLE IF NOT EXISTS community_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code          VARCHAR(32) UNIQUE NOT NULL,
  max_uses      INTEGER,
  use_count     INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add community_id to community_channels (optional FK for channel grouping within communities)
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_rules_community ON community_rules(community_id);
CREATE INDEX IF NOT EXISTS idx_community_invites_code ON community_invites(code);
CREATE INDEX IF NOT EXISTS idx_community_channels_community ON community_channels(community_id);
