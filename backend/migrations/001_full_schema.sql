-- CareerCode Academy Full Schema
-- Run against NeonDB once: psql $DATABASE_URL -f backend/migrations/001_full_schema.sql
-- All statements use IF NOT EXISTS — safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'super_admin')),
  avatar TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMPTZ,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  thumbnail TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN DEFAULT false,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  course_id UUID UNIQUE NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  layout_style VARCHAR(50) DEFAULT 'professional',
  stamp_url TEXT,
  signature_url TEXT,
  logo_url TEXT,
  show_stamp BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  instructor_name VARCHAR(200) DEFAULT 'Udokamma Emmanuel',
  org_name VARCHAR(200) DEFAULT 'Career Code WID Ltd',
  org_rc VARCHAR(100) DEFAULT 'RC 8824091',
  requires_exam BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT,
  video_thumbnail TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  resources JSONB DEFAULT '[]',
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_lessons JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  provider VARCHAR(50) NOT NULL,
  reference VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_url TEXT,
  verification_code VARCHAR(255) UNIQUE NOT NULL,
  certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]',
  image_url TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(100),
  state VARCHAR(100),
  professional_title VARCHAR(200),
  years_experience VARCHAR(50),
  experience_years VARCHAR(50),
  specialization VARCHAR(100),
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  profile_image_url TEXT,
  bio TEXT,
  teaching_experience TEXT,
  interested_courses TEXT,
  availability VARCHAR(100),
  motivation TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  learning_outcomes TEXT,
  prerequisites TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  lesson_count INTEGER NOT NULL DEFAULT 0,
  teaching_format VARCHAR(100),
  technologies TEXT,
  projects TEXT,
  recommended_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_url TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(live_class_id, student_id)
);

CREATE TABLE IF NOT EXISTS recurring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('class', 'workshop', 'meeting', 'webinar')),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recurrence_pattern VARCHAR(10) NOT NULL CHECK (recurrence_pattern IN ('daily','weekly','biweekly','monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  start_date DATE NOT NULL,
  end_date DATE,
  meeting_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentoring_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Mentoring Session',
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'booked', 'cancelled', 'completed')),
  meeting_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS completed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  goal_hours REAL NOT NULL DEFAULT 5,
  goal_topics TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);

-- ============================================================
-- QUIZZES
-- ============================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  time_limit INTEGER NOT NULL DEFAULT 0,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer VARCHAR(500) NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

-- ============================================================
-- LEARNING PATHS
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'GitBranch',
  color VARCHAR(100) DEFAULT 'from-blue-600 to-cyan-600',
  level VARCHAR(20) DEFAULT 'beginner',
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(path_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning_path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);

-- ============================================================
-- CMS & CONTENT
-- ============================================================

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  content JSONB DEFAULT '{}',
  meta JSONB DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CODING CHALLENGES
-- ============================================================

CREATE TABLE IF NOT EXISTS coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  starter_code TEXT DEFAULT '',
  test_code TEXT DEFAULT '',
  language VARCHAR(50) DEFAULT 'javascript',
  difficulty VARCHAR(20) DEFAULT 'easy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  passed BOOLEAN DEFAULT false,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WISHLISTS & SUPPORT
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BROADCASTS & AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  audience VARCHAR(50) NOT NULL DEFAULT 'all',
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS & PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  watch_position NUMERIC DEFAULT 0,
  watch_percentage NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  shuffle_questions BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  instructions TEXT,
  certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
  random_questions_count INTEGER DEFAULT 0,
  negative_marking BOOLEAN DEFAULT false,
  negative_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'mcq',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer VARCHAR(500) NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'in_progress',
  flagged_answers JSONB DEFAULT '[]',
  manual_score INTEGER,
  reviewed BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

-- ============================================================
-- PAYOUTS & PROCTORING
-- ============================================================

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payment_method VARCHAR(100),
  payment_details TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_proctoring_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID UNIQUE NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  s3_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS _schema_migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LESSON NOTES (new)
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================================
-- ALTER TABLE — ADD COLUMNS (safe for existing DBs, no-ops on fresh)
-- ============================================================

ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS experience_years VARCHAR(50);

ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE course_proposals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_thumbnail TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS watch_position NUMERIC DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS watch_percentage NUMERIC DEFAULT 0;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error', 'enrollment', 'payment', 'progress', 'certificate', 'system'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('paystack', 'flutterwave', 'manual'));

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL;

ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS requires_exam BOOLEAN DEFAULT false;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS random_questions_count INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_percentage NUMERIC DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS certificate_template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL;

ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS flagged_answers JSONB DEFAULT '[]';
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS manual_score INTEGER;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT false;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_course ON forum_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_thread ON forum_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_receiver ON direct_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_course ON wishlists(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning_paths(slug);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_coding_challenges_lesson ON coding_challenges(lesson_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_lpe_user ON learning_path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_lpe_path ON learning_path_enrollments(path_id);
CREATE INDEX IF NOT EXISTS idx_payouts_instructor ON payouts(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_recording_attempt ON exam_proctoring_recordings(attempt_id);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO system_settings (key, value, category, description)
VALUES ('commission_rate', '30', 'payouts', 'Platform commission percentage')
ON CONFLICT (key) DO NOTHING;
