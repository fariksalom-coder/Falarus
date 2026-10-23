-- O'QITUVCHI ONBORDINGI v2 (TZ: 8 qadam, ikki yo'l, dars narxi + komissiya).
--
-- Listing to'lovi modeli to'xtatiladi: katalogda ko'rinish endi faqat admin
-- tasdig'iga bog'liq (profile_status = 'active'). Eski ustunlar (listing_paid_until,
-- free_lessons_used, monthly_course_price_*) tarix uchun QOLADI, kod ularni o'qimaydi.
-- Pasport va manzil anketadan olib tashlanadi; mavjud qiymatlar o'chirilmaydi.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS onboarding_path text CHECK (onboarding_path IS NULL OR onboarding_path IN ('certified', 'experienced')),
  ADD COLUMN IF NOT EXISTS birth_country text,
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'russian',
  ADD COLUMN IF NOT EXISTS proficiency text,
  ADD COLUMN IF NOT EXISTS about_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule jsonb,
  ADD COLUMN IF NOT EXISTS lesson_price_uzs integer CHECK (lesson_price_uzs IS NULL OR lesson_price_uzs > 0),
  ADD COLUMN IF NOT EXISTS video_duration_sec integer,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step smallint NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS certified_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS review_step smallint CHECK (review_step IS NULL OR review_step BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS onboarding_v2_at timestamptz;

-- Yangi anketada yosh so'ralmaydi.
ALTER TABLE public.teacher_profiles ALTER COLUMN age DROP NOT NULL;

ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_profile_status_check;
ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_profile_status_check
  CHECK (profile_status IN ('draft', 'pending_review', 'needs_revision', 'active', 'paused', 'rejected'));

-- Hujjatlar endi YOPIQ joyda: private_path to'lsa fayl faqat egasi va adminga beriladi.
ALTER TABLE public.teacher_documents
  ADD COLUMN IF NOT EXISTS private_path text,
  ADD COLUMN IF NOT EXISTS mime text,
  ADD COLUMN IF NOT EXISTS size_bytes integer;
ALTER TABLE public.teacher_documents ALTER COLUMN file_url SET DEFAULT '';

-- Admin sozlaydigan narx chegaralari, komissiya shkalasi va shartlar versiyasi (bitta qator).
CREATE TABLE IF NOT EXISTS public.teacher_onboarding_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  price_min_uzs integer NOT NULL DEFAULT 30000 CHECK (price_min_uzs > 0),
  price_max_uzs integer NOT NULL DEFAULT 500000,
  commission_tiers jsonb NOT NULL DEFAULT '[{"up_to":20,"percent":33},{"up_to":50,"percent":28},{"up_to":200,"percent":25},{"up_to":400,"percent":22},{"up_to":null,"percent":18}]'::jsonb,
  terms_version text NOT NULL DEFAULT '2026-10-23',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CHECK (price_max_uzs >= price_min_uzs)
);
INSERT INTO public.teacher_onboarding_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Har bir rozilik alohida saqlanadi (sana + versiya + shu paytdagi shkala).
CREATE TABLE IF NOT EXISTS public.teacher_terms_acceptances (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  commission_tiers jsonb NOT NULL,
  lesson_price_uzs integer,
  ip text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_terms_acceptances_teacher ON public.teacher_terms_acceptances (teacher_user_id, accepted_at DESC);

-- Video bo'lib-bo'lib yuklanadi: aloqa uzilsa shu joydan davom etadi.
CREATE TABLE IF NOT EXISTS public.teacher_video_uploads (
  id text PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  mime text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  received_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'done', 'rejected')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_video_uploads_teacher ON public.teacher_video_uploads (teacher_user_id, created_at DESC);

-- Moderatsiya tarixi: kim, qachon, qanday qaror.
CREATE TABLE IF NOT EXISTS public.teacher_review_events (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'needs_revision')),
  step smallint,
  comment text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_review_events_teacher ON public.teacher_review_events (teacher_user_id, created_at DESC);

-- Mavjud o'qituvchilar: yo'l sertifikat bor-yo'qligidan, ta'lim/sertifikat yangi shaklga.
UPDATE public.teacher_profiles SET
  onboarding_path = CASE WHEN jsonb_typeof(certificates) = 'array' AND jsonb_array_length(certificates) > 0 THEN 'certified' ELSE 'experienced' END,
  onboarding_v2_at = now()
WHERE onboarding_v2_at IS NULL;

COMMIT;
