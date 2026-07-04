-- CareerCode Academy Schools & Programs
-- Run: psql $DATABASE_URL -f backend/migrations/004_schools.sql

-- Schools (top-level institutional groupings)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (within schools, e.g. "Frontend Development" under "School of Software Development")
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  career_outcomes JSONB DEFAULT '[]',
  duration VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(50),
  main_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: which courses belong to which programs
CREATE TABLE IF NOT EXISTS program_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(program_id, course_id)
);

-- Add program_id to courses (optional — courses can exist outside programs)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_programs_school_id ON programs(school_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_program_id ON program_courses(program_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_course_id ON program_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_program_id ON courses(program_id);

-- Seed the 5 schools
INSERT INTO schools (name, slug, description, icon, color, sort_order) VALUES
  ('School of Software Development', 'software-development', 'Focused on preparing students for careers in software engineering and application development.', 'Code2', 'from-blue-500 to-cyan-500', 1),
  ('School of Data & Artificial Intelligence', 'data-ai', 'Focused on data-driven careers and emerging technologies in AI and machine learning.', 'Database', 'from-purple-500 to-pink-500', 2),
  ('School of Design & Creative Technology', 'design-creative', 'Focused on creating digital experiences and visual communication.', 'Palette', 'from-pink-500 to-rose-500', 3),
  ('School of Business & Digital Careers', 'business-digital', 'Focused on modern business and digital economy skills.', 'Briefcase', 'from-amber-500 to-orange-500', 4),
  ('School of Career Readiness', 'career-readiness', 'Focused on preparing students for employment and professional success.', 'GraduationCap', 'from-emerald-500 to-teal-500', 5)
ON CONFLICT (slug) DO NOTHING;

-- Showcase Videos (unified table for school, program, course videos)
CREATE TABLE IF NOT EXISTS showcase_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('school', 'program', 'course')),
  entity_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  provider VARCHAR(20) DEFAULT 'html5' CHECK (provider IN ('html5', 'youtube', 'vimeo')),
  views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES showcase_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  watch_duration INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showcase_videos_entity ON showcase_videos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_user ON video_analytics(user_id);
