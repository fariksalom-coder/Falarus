-- 146_user_onboarding.sql
--
-- Ro'yxatdan o'tgandan keyingi so'rovnoma.
--
-- Loyihaga moslashtirildi: `users.id` bu yerda BIGINT (uuid emas), shuning
-- uchun `user_id` ham bigint. Supabase auth ishlatilmaydi — RLS policy'lar
-- kerak emas, ruxsat JWT middleware darajasida tekshiriladi.
--
-- Alohida jadval: `users` ni shishirmaydi va keyin savol qo'shish oson.
-- Qiymatlar CHECK bilan qotirilmagan — noto'g'ri qiymat kelsa ro'yxatdan
-- o'tish buzilmasligi kerak; tekshiruv API darajasida (`ALLOWED` ro'yxati).

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id          bigint PRIMARY KEY
                     REFERENCES public.users(id) ON DELETE CASCADE,

  -- Savol javoblari (barchasi NULL bo'lishi mumkin = o'tkazib yuborilgan)
  age_range        text,
  country          text,
  region           text,
  goal             text,
  level            text,
  daily_minutes    smallint CHECK (daily_minutes IS NULL OR daily_minutes BETWEEN 5 AND 240),
  source           text,

  -- Avtomatik yig'iladigan attribution (so'rovnoma javobiga ishonch past)
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  referrer         text,
  landing_path     text,
  device_type      text,

  -- Holat
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  skipped_count    smallint NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Analitika uchun indekslar
CREATE INDEX IF NOT EXISTS idx_onboarding_goal
  ON public.user_onboarding (goal) WHERE goal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_source
  ON public.user_onboarding (source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_country
  ON public.user_onboarding (country, region);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed
  ON public.user_onboarding (completed_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.set_onboarding_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

-- Frontend har safar so'rovnomani ko'rsatmasligi uchun tez tekshiruv.
-- Eslatma: mavjud `users.onboarded` ustunidan FARQLI — u ro'yxatdan o'tish
-- bosqichini bildiradi, bu esa aynan so'rovnoma to'ldirilganini.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
