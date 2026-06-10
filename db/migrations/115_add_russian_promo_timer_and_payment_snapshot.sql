-- Russian promo timer fields (per-user, first visit to tariffs starts countdown).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS russian_promo_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS russian_promo_expires_at TIMESTAMPTZ;

-- Payment pricing snapshot fields (audit of discounted/base amount).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_meta JSONB;
