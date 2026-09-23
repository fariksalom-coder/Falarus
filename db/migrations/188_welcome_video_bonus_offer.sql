-- One-time registration video sequence and 10-minute 3-for-6 offer.
CREATE TABLE IF NOT EXISTS public.welcome_video_offers (
  user_id BIGINT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sequence', 'standard', 'offer', 'claimed', 'expired')),
  next_video_index SMALLINT NOT NULL DEFAULT 0 CHECK (next_video_index BETWEEN 0 AND 3),
  offer_expires_at TIMESTAMPTZ,
  payment_id BIGINT REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'offer') = (offer_expires_at IS NOT NULL) OR status = 'claimed' OR status = 'expired')
);

CREATE INDEX IF NOT EXISTS idx_welcome_video_offers_active
  ON public.welcome_video_offers (offer_expires_at)
  WHERE status = 'offer';
