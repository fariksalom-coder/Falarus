-- Repair: production error "Could not find the 'product_code' column of 'payments' in the schema cache"
-- if migration 030 was never applied or failed mid-transaction. Idempotent.
-- After running in Supabase SQL Editor, PostgREST reloads schema (NOTIFY below).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_code TEXT;

UPDATE payments
SET product_code = 'russian'
WHERE product_code IS NULL OR TRIM(product_code) = '';

ALTER TABLE payments
  ALTER COLUMN product_code SET DEFAULT 'russian';

ALTER TABLE payments
  ALTER COLUMN product_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_product_code_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_product_code_check
      CHECK (product_code IN ('russian', 'patent', 'vnzh'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_user_product_status
  ON payments(user_id, product_code, status);

NOTIFY pgrst, 'reload schema';
