-- Add refund metadata to payments and allow refunded status.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS click_refund_raw JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'refunded'));
