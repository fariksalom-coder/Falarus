-- Rahmat / Multicard hosted checkout: store invoice uuid; extend payment_channel.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS multicard_invoice_uuid TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_channel_check'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_payment_channel_check;
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_channel_check
  CHECK (
    payment_channel IS NULL
    OR payment_channel IN (
      'manual',
      'click_button',
      'click_auto_token',
      'click_auto_cron',
      'rahmat'
    )
  );
