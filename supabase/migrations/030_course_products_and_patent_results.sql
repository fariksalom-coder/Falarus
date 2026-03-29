-- Product-aware payments for separate course sales + patent final results.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_code TEXT NOT NULL DEFAULT 'russian';

UPDATE payments
SET product_code = 'russian'
WHERE product_code IS NULL OR product_code = '';

ALTER TABLE payments
  ALTER COLUMN tariff_type DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_tariff_type_check'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_tariff_type_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_product_code_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_product_code_check
      CHECK (product_code IN ('russian', 'patent', 'vnzh'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_tariff_type_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_tariff_type_check
      CHECK (tariff_type IS NULL OR tariff_type IN ('month', '3months', 'year'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_user_product_status
  ON payments(user_id, product_code, status);

CREATE TABLE IF NOT EXISTS patent_variant_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_number INTEGER NOT NULL CHECK (variant_number BETWEEN 1 AND 11),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  total_count INTEGER NOT NULL CHECK (total_count > 0),
  score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, variant_number)
);

CREATE INDEX IF NOT EXISTS idx_patent_variant_results_user
  ON patent_variant_results(user_id);
