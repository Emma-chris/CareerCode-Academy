-- Schools-based pathway: add school_id to learning_paths (our Schools terminology)
ALTER TABLE learning_paths ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_learning_paths_school ON learning_paths(school_id);
-- Note: slug remains unique (school-slug-level vs category-level) so no extra unique needed.
-- school_id nullable for backward compat with category-based paths.
