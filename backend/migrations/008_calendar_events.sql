-- Migration 008: Calendar Events System
-- Production-ready calendar with full CRUD, visibility rules, and reminders

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'live_session', 'class', 'lecture', 'module_release',
    'assignment', 'quiz', 'exam', 'challenge', 'project_deadline',
    'code_review', 'mentorship', 'career_event', 'community_event',
    'announcement', 'workshop', 'meeting'
  )),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  location VARCHAR(500),
  meeting_url TEXT,
  meeting_platform VARCHAR(100),
  color VARCHAR(7),

  -- Academic associations (all optional)
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  cohort_id VARCHAR(100),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Community association
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES community_channels(id) ON DELETE SET NULL,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility VARCHAR(30) NOT NULL DEFAULT 'public' CHECK (visibility IN (
    'public', 'students_only', 'specific_program', 'specific_cohort',
    'specific_school', 'specific_community'
  )),
  visibility_target_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'draft', 'scheduled', 'live', 'completed', 'cancelled'
  )),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  max_attendees INTEGER,
  reminder_minutes INTEGER[] DEFAULT ARRAY[1440, 60, 15],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end ON calendar_events(end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course ON calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_instructor ON calendar_events(instructor_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_school ON calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_community ON calendar_events(community_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility ON calendar_events(visibility);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(start_datetime, end_datetime);

-- Track who has RSVP'd or is attending an event
CREATE TABLE IF NOT EXISTS calendar_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON calendar_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON calendar_event_rsvps(user_id);

-- Track event reminders that have been sent
CREATE TABLE IF NOT EXISTS calendar_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, minutes_before)
);

CREATE INDEX IF NOT EXISTS idx_reminders_event ON calendar_event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON calendar_event_reminders(user_id);
