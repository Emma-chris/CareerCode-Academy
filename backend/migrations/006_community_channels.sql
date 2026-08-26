-- ============================================================
-- 006_community_channels.sql
-- Community Forums: channels, messages, reactions, threads,
-- pins, reports, moderation, invites
-- ============================================================

-- Channel categories
CREATE TABLE IF NOT EXISTS community_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(50),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Channels
CREATE TABLE IF NOT EXISTS community_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES community_categories(id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(150) NOT NULL,
  description   TEXT,
  type          VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'announcement', 'project_showcase')),
  is_public     BOOLEAN DEFAULT true,
  is_archived   BOOLEAN DEFAULT false,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id     UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id     UUID REFERENCES lessons(id) ON DELETE SET NULL,
  max_members   INTEGER,
  member_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Channel members
CREATE TABLE IF NOT EXISTS channel_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted     BOOLEAN DEFAULT false,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Channel messages
CREATE TABLE IF NOT EXISTS channel_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  edited            BOOLEAN DEFAULT false,
  deleted           BOOLEAN DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID REFERENCES users(id),
  parent_message_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL,
  is_thread_parent  BOOLEAN DEFAULT false,
  thread_count      INTEGER DEFAULT 0,
  attachment_url    TEXT,
  attachment_type   VARCHAR(50),
  attachment_name   VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Channel pins
CREATE TABLE IF NOT EXISTS channel_pins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
  pinned_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, message_id)
);

-- Community reports
CREATE TABLE IF NOT EXISTS community_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('message', 'user')),
  target_id   UUID NOT NULL,
  reason      VARCHAR(50) NOT NULL,
  description TEXT,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation actions
CREATE TABLE IF NOT EXISTS community_moderation_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id      UUID REFERENCES community_channels(id) ON DELETE SET NULL,
  action          VARCHAR(50) NOT NULL CHECK (action IN ('mute', 'unmute', 'ban', 'unban', 'warn', 'delete_message')),
  reason          TEXT,
  duration        INTERVAL,
  is_active       BOOLEAN DEFAULT true,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Channel invites
CREATE TABLE IF NOT EXISTS channel_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(32) UNIQUE NOT NULL,
  max_uses   INTEGER,
  use_count  INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_channel_messages_author ON channel_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_parent ON channel_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_channel_pins_channel ON channel_pins(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_invites_code ON channel_invites(code);
CREATE INDEX IF NOT EXISTS idx_community_channels_category ON community_channels(category_id);
CREATE INDEX IF NOT EXISTS idx_community_channels_course ON community_channels(course_id);
