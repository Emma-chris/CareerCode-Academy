-- Platform currency — single source of truth, admin-only
INSERT INTO system_settings (key, value, category, description) VALUES
  ('platform_currency', 'NGN', 'payments', 'ISO 4217 currency code for all new payments/courses (admin-only). Existing payments retain their stored currency.'),
  ('platform_currency_locale', 'en-NG', 'payments', 'Intl locale for formatting (e.g., en-NG for NGN, en-US for USD)'),
  ('platform_currency_symbol', '₦', 'payments', 'Display symbol fallback')
ON CONFLICT (key) DO NOTHING;
