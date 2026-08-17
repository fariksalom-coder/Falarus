-- 142_daily_text_questions.sql
--
-- 3-blok (o'qish) matnidan keyin beriladigan tushunish savollari.
-- Admin SQL konsoli yoki kontent paneli orqali to'ldiradi.
--
-- QOIDA: o'quvchi bu testdan kamida 70% to'plamaguncha o'qish bloki
-- YAKUNLANMAYDI va keyingi vazifaga o'ta olmaydi. Shu sababli javob kaliti
-- (`correct_index`) brauzerga yuborilmaydi — tekshiruv faqat serverda.

CREATE TABLE IF NOT EXISTS public.daily_text_questions (
  id            bigserial PRIMARY KEY,
  day_number    integer NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  question_ru   text    NOT NULL,
  option_a      text    NOT NULL,
  option_b      text    NOT NULL,
  option_c      text    NOT NULL,
  option_d      text    NOT NULL,
  correct_index smallint NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_text_questions_day_sort_key UNIQUE (day_number, sort_order)
);

CREATE INDEX IF NOT EXISTS daily_text_questions_day_idx
  ON public.daily_text_questions (day_number, sort_order);

-- Admin konsoli uchun huquqlar (kontent bilan to'ldirish)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_text_questions TO falarus_content_sql;
GRANT USAGE, SELECT ON SEQUENCE public.daily_text_questions_id_seq TO falarus_content_sql;

-- Qolgan kontent jadvallari bilan bir xil rejim (ilova `falarus` roli jadval
-- EGASI, egalar RLS'ni chetlab o'tadi — ilovaga ta'sir qilmaydi).
ALTER TABLE public.daily_text_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_sql_console ON public.daily_text_questions;
CREATE POLICY content_sql_console ON public.daily_text_questions
  FOR ALL TO falarus_content_sql
  USING (true) WITH CHECK (true);

-- Javoblar SERVERDA qayd etiladi (iboralar bilan bir xil model): bir savolga
-- bir marta javob beriladi, ball qayd etilgan javoblardan sanaladi.
CREATE TABLE IF NOT EXISTS public.user_text_question_answers (
  user_id     bigint      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id bigint      NOT NULL REFERENCES public.daily_text_questions(id) ON DELETE CASCADE,
  choice      smallint    NOT NULL CHECK (choice BETWEEN 0 AND 3),
  is_correct  boolean     NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS user_text_question_answers_user_idx
  ON public.user_text_question_answers (user_id);

-- Eng yaxshi natija (faqat oshadi) — «70% to'plandimi» shundan ko'rinadi.
ALTER TABLE public.user_kunlik_day_progress
  ADD COLUMN IF NOT EXISTS text_questions_correct integer NOT NULL DEFAULT 0;
