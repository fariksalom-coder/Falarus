ALTER TABLE public.kiosk_attempts
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'adult'
  CHECK (audience IN ('child', 'teen', 'adult'));
CREATE INDEX IF NOT EXISTS kiosk_attempts_audience_recent
  ON public.kiosk_attempts(audience, created_at DESC);
