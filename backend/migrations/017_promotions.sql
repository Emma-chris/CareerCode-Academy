-- Promotional events: time-boxed discounts available only to special marketing
-- events. Default/standing course discounts (courses.discount_percentage) are
-- deprecated — pricing is full price unless an active promotion applies.
-- Idempotent — safe to re-run by the backend migration runner.

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE,
  discount_percent DECIMAL(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  scope VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'category', 'course')),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (
    (scope = 'all' AND category_id IS NULL AND course_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL AND course_id IS NULL)
    OR (scope = 'course' AND course_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_window
  ON promotions (is_active, starts_at, ends_at);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promotion_title TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_discount_percent DECIMAL(5, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_discount_amount DECIMAL(10, 2);