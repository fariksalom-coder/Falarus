-- 136_daily_phrase_mcqs.sql
--
-- Kunlik ibora testlari: ruscha ibora + 4 ta variant.
-- Admin kontent panelidan va SQL konsolidan to'ldiriladi.
--
-- RLS: qolgan barcha kontent jadvallari kabi yoqiladi va `falarus_content_sql`
-- roli uchun ochiq policy beriladi. Ilova `falarus` roli bilan ulanadi va u
-- jadval EGASI — egalar RLS'ni chetlab o'tadi, shuning uchun ilovaga ta'sir
-- qilmaydi (bu ilgari yangi jadvalda 0 qator ko'rinishiga sabab bo'lgan tuzoq).

CREATE TABLE IF NOT EXISTS public.daily_phrase_mcqs (
  id            bigserial PRIMARY KEY,
  day_number    integer  NOT NULL,
  sort_order    integer  NOT NULL DEFAULT 0,
  phrase_ru     text     NOT NULL,
  option_a      text     NOT NULL,
  option_b      text     NOT NULL,
  option_c      text     NOT NULL,
  option_d      text     NOT NULL,
  correct_index smallint NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_phrase_mcqs_day_sort_key UNIQUE (day_number, sort_order)
);

CREATE INDEX IF NOT EXISTS daily_phrase_mcqs_day_idx
  ON public.daily_phrase_mcqs (day_number, sort_order);

-- Admin konsoli uchun huquqlar (kontent bilan to'ldirish)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_phrase_mcqs TO falarus_content_sql;
GRANT USAGE, SELECT ON SEQUENCE public.daily_phrase_mcqs_id_seq TO falarus_content_sql;

ALTER TABLE public.daily_phrase_mcqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_sql_console ON public.daily_phrase_mcqs;
CREATE POLICY content_sql_console ON public.daily_phrase_mcqs
  FOR ALL TO falarus_content_sql
  USING (true) WITH CHECK (true);
