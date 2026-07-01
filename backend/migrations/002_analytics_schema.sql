-- CareerCode Academy Analytics Schema
-- Run after 001_full_schema.sql: psql $DATABASE_URL -f backend/migrations/002_analytics_schema.sql
-- All statements use IF NOT EXISTS — safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- VISITORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  device_type VARCHAR(50) DEFAULT 'desktop',
  browser VARCHAR(100),
  os VARCHAR(100),
  referral_source VARCHAR(255),
  landing_page TEXT,
  first_visit TIMESTAMPTZ DEFAULT NOW(),
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON visitors(last_visit);
CREATE INDEX IF NOT EXISTS idx_visitors_referral_source ON visitors(referral_source);
CREATE INDEX IF NOT EXISTS idx_visitors_country ON visitors(country);
CREATE INDEX IF NOT EXISTS idx_visitors_device_type ON visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at);

-- ============================================================
-- PAGE VIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  route_name VARCHAR(255),
  time_spent_sec INTEGER DEFAULT 0,
  is_exit_page BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page_url ON page_views(page_url);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_route_name ON page_views(route_name);

-- ============================================================
-- CLICK EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  element_selector VARCHAR(500),
  element_text VARCHAR(500),
  element_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_click_events_visitor_id ON click_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_click_events_page_url ON click_events(page_url);
CREATE INDEX IF NOT EXISTS idx_click_events_element_text ON click_events(element_text);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);

-- ============================================================
-- SCROLL EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scroll_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  depth_25 BOOLEAN DEFAULT false,
  depth_50 BOOLEAN DEFAULT false,
  depth_75 BOOLEAN DEFAULT false,
  depth_100 BOOLEAN DEFAULT false,
  max_depth INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scroll_events_visitor_id ON scroll_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_scroll_events_page_url ON scroll_events(page_url);
CREATE INDEX IF NOT EXISTS idx_scroll_events_created_at ON scroll_events(created_at);

-- ============================================================
-- USER JOURNEYS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pages_visited TEXT[] DEFAULT '{}',
  conversion_type VARCHAR(50),
  converted BOOLEAN DEFAULT false,
  enrolled_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  dropped_at_page TEXT,
  journey_duration_sec INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_journeys_visitor_id ON user_journeys(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_converted ON user_journeys(converted);
CREATE INDEX IF NOT EXISTS idx_user_journeys_created_at ON user_journeys(created_at);
