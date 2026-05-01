-- Click card_token auto-pay: encrypted tokens, audit log, subscription billing dates

CREATE TABLE IF NOT EXISTS card_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_card_token TEXT NOT NULL,
  masked_phone TEXT,
  masked_card TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_tokens_user ON card_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_card_tokens_active ON card_tokens(user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS click_payment_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  click_payment_id TEXT,
  merchant_trans_id TEXT,
  error_code INTEGER,
  error_note TEXT,
  request_safe JSONB,
  response_safe JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_click_payment_logs_user ON click_payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_click_payment_logs_created ON click_payment_logs(created_at DESC);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_payment_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_token_id BIGINT REFERENCES card_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_payment_retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_payment_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_pay_due
  ON subscriptions (next_payment_date)
  WHERE auto_payment_enabled = true AND status = 'active';

ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_notice_uz TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_channel TEXT,
  ADD COLUMN IF NOT EXISTS click_merchant_payment_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_channel_check'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE payments ADD CONSTRAINT payments_payment_channel_check
      CHECK (payment_channel IS NULL OR payment_channel IN ('manual', 'click_button', 'click_auto_token', 'click_auto_cron'));
  END IF;
END $$;
