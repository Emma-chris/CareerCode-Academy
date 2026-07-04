-- CareerCode Academy Career Center
-- Run: psql $DATABASE_URL -f backend/migrations/005_career_center.sql

-- Job listings (posted by admin/employer)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  company VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(200),
  type VARCHAR(50) DEFAULT 'full-time' CHECK (type IN ('full-time', 'part-time', 'contract', 'remote', 'hybrid')),
  salary_range VARCHAR(100),
  application_url TEXT,
  logo_url TEXT,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internships
CREATE TABLE IF NOT EXISTS internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  company VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(200),
  type VARCHAR(50) DEFAULT 'remote' CHECK (type IN ('remote', 'onsite', 'hybrid')),
  duration VARCHAR(100),
  requirements TEXT,
  stipend VARCHAR(100),
  application_url TEXT,
  logo_url TEXT,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alumni directory
CREATE TABLE IF NOT EXISTS alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graduation_year INTEGER,
  current_company VARCHAR(200),
  current_position VARCHAR(200),
  linkedin_url TEXT,
  portfolio_url TEXT,
  testimonial TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_expires ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_internships_active ON internships(is_active);
CREATE INDEX IF NOT EXISTS idx_alumni_featured ON alumni(is_featured);
