CREATE TABLE IF NOT EXISTS public.kiosk_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.kiosk_settings (id, config) VALUES (1,
  '{"enabled":true,"campaignKey":"russian-quiz","courseTitle":"Русский для работы · 182 дня","courseTitleUz":"Ish uchun rus tili · 182 kun","discountPercent":20,"minimumCorrect":0,"validityHours":15,"questionSeconds":20,"originalPrice":null,"currency":"RUB"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.kiosk_coupons (
  id UUID PRIMARY KEY,
  campaign_key TEXT NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
  course_title TEXT NOT NULL,
  course_title_uz TEXT NOT NULL,
  original_price NUMERIC(14,2),
  currency TEXT NOT NULL CHECK (currency IN ('RUB','UZS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by BIGINT REFERENCES public.admins(id) ON DELETE SET NULL,
  redemption_note TEXT,
  UNIQUE (campaign_key, phone)
);

CREATE TABLE IF NOT EXISTS public.kiosk_attempts (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ru','uz')),
  source TEXT NOT NULL DEFAULT 'website',
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed')),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND 10),
  question_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  coupon_id UUID REFERENCES public.kiosk_coupons(id)
);
CREATE INDEX IF NOT EXISTS kiosk_attempts_recent ON public.kiosk_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS kiosk_attempts_phone ON public.kiosk_attempts(phone);
CREATE INDEX IF NOT EXISTS kiosk_coupons_recent ON public.kiosk_coupons(created_at DESC);
