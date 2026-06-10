-- Drop 3-month tariff: remove prices, remap legacy rows, tighten CHECK constraints.

DELETE FROM tariff_prices WHERE tariff_type = 'three_months';

UPDATE payments SET tariff_type = 'month' WHERE tariff_type = '3months';

UPDATE subscriptions SET plan_type = 'monthly' WHERE plan_type = 'three_months';

UPDATE subscription_payment_requests SET plan_type = 'monthly' WHERE plan_type = 'three_months';

UPDATE users SET plan_name = '1 OY' WHERE plan_name = '3 OY';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tariff_prices_tariff_type_check'
  ) THEN
    ALTER TABLE tariff_prices DROP CONSTRAINT tariff_prices_tariff_type_check;
  END IF;
END $$;

ALTER TABLE tariff_prices ADD CONSTRAINT tariff_prices_tariff_type_check
  CHECK (tariff_type IN ('month', 'year'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_tariff_type_check'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_tariff_type_check;
  END IF;
END $$;

ALTER TABLE payments ADD CONSTRAINT payments_tariff_type_check
  CHECK (tariff_type IS NULL OR tariff_type IN ('month', 'year'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_type_check'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_type_check;
  END IF;
END $$;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('monthly', 'yearly'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payment_requests_plan_type_check'
  ) THEN
    ALTER TABLE subscription_payment_requests DROP CONSTRAINT subscription_payment_requests_plan_type_check;
  END IF;
END $$;

ALTER TABLE subscription_payment_requests ADD CONSTRAINT subscription_payment_requests_plan_type_check
  CHECK (plan_type IN ('monthly', 'yearly'));
