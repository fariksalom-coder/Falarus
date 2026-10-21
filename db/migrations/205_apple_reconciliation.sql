BEGIN;
ALTER TABLE store_purchase_ownership ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT;
CREATE INDEX IF NOT EXISTS subscriptions_apple_original ON subscriptions(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
COMMIT;
