-- XP business model + discount codes (1000 XP = 100 NGN)
-- Provides redeem → discount code flow and checkout integration

-- System settings for XP business model (admin customizable)
INSERT INTO system_settings (key, value, category, description) VALUES
  ('xp_to_ngn_rate', '0.1', 'xp', 'Conversion rate: NGN per 1 XP (0.1 = 1000 XP = 100 NGN)'),
  ('xp_redeem_enabled', 'true', 'xp', 'Enable XP redemption for discounts'),
  ('xp_min_redeem', '1000', 'xp', 'Minimum XP redeemable per transaction (must be multiple)'),
  ('xp_redeem_step', '1000', 'xp', 'XP redeem step / increments'),
  ('xp_max_discount_percent', '50', 'xp', 'Maximum discount percent of course price applicable via XP (0-100)'),
  ('xp_code_expiry_days', '30', 'xp', 'Discount code expiry in days after generation')
ON CONFLICT (key) DO NOTHING;

-- Discount codes generated from XP redemption
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_redeemed INT NOT NULL CHECK (xp_redeemed > 0),
  discount_amount INT NOT NULL CHECK (discount_amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_user ON discount_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_status ON discount_codes(status);

-- Extend payments to store XP discount linkage
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS xp_discount INT NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_before_discount DECIMAL(10,2);
CREATE INDEX IF NOT EXISTS idx_payments_discount_code ON payments(discount_code_id);
