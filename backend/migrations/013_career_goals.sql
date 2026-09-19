-- Career Goals: curated role-first pathways that bundle an ordered set of courses.
-- Each goal syncs to a linked learning_path (slug: career-goal-<goal-slug>) so
-- enrollment, per-path progress, XP celebration and guided mode work unchanged.

CREATE TABLE IF NOT EXISTS career_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  summary TEXT,
  icon VARCHAR(50) DEFAULT 'Target',
  color VARCHAR(100) DEFAULT 'from-blue-600 to-cyan-600',
  desired_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  salary_band VARCHAR(60),
  duration_estimate VARCHAR(60),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_goal_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  phase VARCHAR(30) NOT NULL DEFAULT 'core',
  UNIQUE(goal_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_career_goal_courses_goal ON career_goal_courses(goal_id);

-- Link each career goal to its auto-synced learning path (one-directional FK to avoid a cycle).
ALTER TABLE learning_paths ADD COLUMN IF NOT EXISTS career_goal_id UUID REFERENCES career_goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_learning_paths_career_goal ON learning_paths(career_goal_id);