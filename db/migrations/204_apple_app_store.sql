-- Apply before deploying the Apple authentication/purchase frontend and backend.
BEGIN;
ALTER TABLE user_oauth_identities
  ADD COLUMN IF NOT EXISTS apple_refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS apple_client_id TEXT;

CREATE TABLE IF NOT EXISTS apple_auth_challenges (
  nonce_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS apple_auth_challenges_expiry ON apple_auth_challenges(expires_at);

-- Keep the anonymous ownership tombstone after account deletion: a receipt
-- cannot be used to unlock another user's account or to extend access twice.
CREATE TABLE IF NOT EXISTS store_purchase_ownership (
  store TEXT NOT NULL,
  original_transaction_id TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (store, original_transaction_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_store_proof_unique
  ON payments(payment_proof_url)
  WHERE payment_channel IN ('app_store', 'google_play');

CREATE TABLE IF NOT EXISTS account_file_deletion_jobs (
  user_id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION delete_own_account(p_user_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  INSERT INTO account_file_deletion_jobs(user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  IF to_regclass('public.users_total_points_backup_20260801') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.users_total_points_backup_20260801 WHERE user_id=$1' USING p_user_id;
  END IF;
  DELETE FROM users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;
COMMIT;
