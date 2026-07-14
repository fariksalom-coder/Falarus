-- Restructure Russian language course pricing (2026-07):
--   • Remove legacy 30-day plan ('month') entirely — no new signups.
--   • Introduce 90-day plan ('three_month') at prior year-plan pricing.
--   • Raise 1-year plan to a higher tier (~4× the 3-month price).
--
-- Existing purchases are protected: users.plan_expires_at + subscriptions.expires_at
-- already carry a concrete end-date, so removing the 'month' price row does NOT
-- shorten anyone's active window. Historic payments rows with tariff_type='month'
-- keep their value for accounting; only the price catalog changes.

BEGIN;

-- 1. Drop legacy monthly price rows across all currencies.
DELETE FROM tariff_prices WHERE tariff_type = 'month';

-- 2. Widen the CHECK constraint to accept the new 3-month value.
ALTER TABLE tariff_prices DROP CONSTRAINT IF EXISTS tariff_prices_tariff_type_check;
ALTER TABLE tariff_prices ADD CONSTRAINT tariff_prices_tariff_type_check
  CHECK (tariff_type = ANY (ARRAY['three_month'::text, 'year'::text]));

-- 2a. Widen the subscriptions plan_type constraint too. The existing constraint
--     accepted 'three_months' (with an 's'); our shared code writes the singular
--     'three_month' so tariff_prices and subscriptions share one value.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type = ANY (ARRAY['monthly'::text, 'three_month'::text, 'three_months'::text, 'yearly'::text]));

-- 3. Insert the new 3-month tier (values chosen by the business:
--    UZS 299_000 / RUB 1990 / USD 19).
INSERT INTO tariff_prices (tariff_type, currency, price, updated_at) VALUES
  ('three_month', 'UZS',  299000, NOW()),
  ('three_month', 'RUB',    1990, NOW()),
  ('three_month', 'USD',      19, NOW())
ON CONFLICT (tariff_type, currency) DO UPDATE SET
  price      = EXCLUDED.price,
  updated_at = EXCLUDED.updated_at;

-- 3. Bump the 1-year tier to the new pricing
--    (UZS 1_197_000 / RUB 5970 / USD 76 — 4× the 3-month price).
UPDATE tariff_prices SET price = 1197000, updated_at = NOW()
  WHERE tariff_type = 'year' AND currency = 'UZS';
UPDATE tariff_prices SET price =    5970, updated_at = NOW()
  WHERE tariff_type = 'year' AND currency = 'RUB';
UPDATE tariff_prices SET price =      76, updated_at = NOW()
  WHERE tariff_type = 'year' AND currency = 'USD';

COMMIT;
