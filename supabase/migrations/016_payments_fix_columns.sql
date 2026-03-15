-- Fix: add missing columns to payments if table was created with different schema
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tariff_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES admins(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure constraint on status if column was just added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
