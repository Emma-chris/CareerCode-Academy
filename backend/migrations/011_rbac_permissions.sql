-- RBAC per-user dashboard permissions (super_admin checkbox)
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_dashboards TEXT[] DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_users_allowed_dashboards ON users USING GIN (allowed_dashboards);
COMMENT ON COLUMN users.allowed_dashboards IS 'NULL = full access (backward compat); empty array = no dashboards; otherwise list of /admin/* paths allowed. Only editable by super_admin.';

-- Additional system settings seeded for completeness
INSERT INTO system_settings (key, value, category, description) VALUES
  ('platform_name', 'CareerCode Academy', 'general', 'Platform display name'),
  ('support_email', 'hello@careercode.academy', 'general', 'Support contact email')
ON CONFLICT (key) DO NOTHING;
