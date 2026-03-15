-- Payments table for subscription payment flow (currency, proof upload, admin verify)
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tariff_type TEXT NOT NULL CHECK (tariff_type IN ('month', '3months', 'year')),
  currency TEXT NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  payment_proof_url TEXT,
  payment_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id BIGINT REFERENCES admins(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Supabase Storage: create bucket "payment-proofs" via dashboard or API if needed.
-- RLS: allow authenticated uploads or service role uploads from backend.
