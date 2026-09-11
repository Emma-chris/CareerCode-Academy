-- Career Pipeline: on-platform job applications, portfolios, projects, guided mode
-- Idempotent — safe to re-run by the backend migration runner.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN DEFAULT true;

-- Student applications to jobs and internships (guarded so exactly one target is set)
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_note TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected')),
  status_timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (job_id IS NOT NULL OR internship_id IS NOT NULL)
);

-- Student project submissions (mentor review -> auto portfolio item)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  source_url TEXT,
  demo_url TEXT,
  image_url TEXT,
  skills TEXT[] DEFAULT '{}',
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public-facing portfolio items (auto-created from approved projects)
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  skills TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guided mode (opt-in, per learning path)
CREATE TABLE IF NOT EXISTS guided_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (mode IN ('active', 'paused')),
  day_index INTEGER NOT NULL DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, path_id)
);

CREATE TABLE IF NOT EXISTS guided_loop_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guided_enrollment_id UUID NOT NULL REFERENCES guided_enrollments(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  state JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(guided_enrollment_id, lesson_id)
);

-- Daily check-ins (guided mode momentum / accountability)
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  productive INTEGER CHECK (productive BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  blocks_completed INTEGER DEFAULT 0,
  claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_user ON portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_guided_entries_enrollment ON guided_loop_entries(guided_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);