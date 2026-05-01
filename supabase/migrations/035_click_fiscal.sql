-- Click fiscalization (OFД): receipt tracking per approved Click payment

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS fiscal_status TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_receipt_id TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_raw_response JSONB,
  ADD COLUMN IF NOT EXISTS fiscal_error TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_attempt_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_fiscal_status_check'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE payments ADD CONSTRAINT payments_fiscal_status_check
      CHECK (
        fiscal_status IS NULL
        OR fiscal_status IN ('pending', 'success', 'failed')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_fiscal_retry
  ON payments (fiscal_status, fiscal_attempt_count)
  WHERE status = 'approved'
    AND click_merchant_payment_id IS NOT NULL;
