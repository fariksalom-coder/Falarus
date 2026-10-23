-- 215: o'quvchi uchun yangi ustozlar katalogi.
--
-- specializations — ustoz anketaning 5-qadamida 1–4 yo'nalish tanlaydi, o'quvchi
--   katalogda shu bo'yicha saralaydi. Tajriba (experience_years) va tillar
--   (languages, «ru:native» ko'rinishida) ustunlari avvaldan bor.
-- teacher_lesson_reviews — pullik dars o'tgandan keyin o'quvchi ustozni 4 mezon
--   bo'yicha (1–5) baholaydi va izoh yozadi. Bitta darsga bitta sharh.
--   Eski teacher_student_reviews (sinov darslari uchun) tegilmaydi.
-- teacher_conversations — to'langan darsdan keyin ustoz va o'quvchi o'rtasida
--   bitta umumiy chat (sinov darsiga bog'lanmagan).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS specializations text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.teacher_lesson_reviews (
  id bigserial PRIMARY KEY,
  lesson_id bigint NOT NULL UNIQUE REFERENCES public.teacher_lessons(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  support smallint NOT NULL CHECK (support BETWEEN 1 AND 5),
  honesty smallint NOT NULL CHECK (honesty BETWEEN 1 AND 5),
  progress smallint NOT NULL CHECK (progress BETWEEN 1 AND 5),
  preparation smallint NOT NULL CHECK (preparation BETWEEN 1 AND 5),
  overall numeric(2, 1) NOT NULL CHECK (overall BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1500),
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_reviews_teacher
  ON public.teacher_lesson_reviews (teacher_user_id, created_at DESC) WHERE NOT hidden;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_conversations_pair
  ON public.teacher_conversations (teacher_user_id, student_user_id) WHERE trial_lesson_id IS NULL;

-- Ilova bazaga `falarus` roli bilan ulanadi; migratsiya postgres nomidan yuritilsa ham jadval unga tegishli bo'lsin.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus') THEN
    ALTER TABLE public.teacher_lesson_reviews OWNER TO falarus;
    ALTER SEQUENCE public.teacher_lesson_reviews_id_seq OWNER TO falarus;
  END IF;
END $$;

COMMIT;
