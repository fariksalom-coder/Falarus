-- Single vocabulary table per day: Uzbek + Russian (cards, «найди пару», MCQ derive on client/API later).
-- Migrates rows from daily_vocab_matches: left_text = Russian, right_text = Uzbek (adjust if your data used the opposite).

CREATE TABLE IF NOT EXISTS public.daily_vocab_words (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  word_uz text NOT NULL,
  word_ru text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_number, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_daily_vocab_words_day ON public.daily_vocab_words (day_number, sort_order);

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
SELECT
  m.day_number,
  ((ROW_NUMBER() OVER (PARTITION BY m.day_number ORDER BY m.block_sort_order, m.pair_sort_order, m.id)) - 1)::integer AS sort_order,
  trim(m.right_text) AS word_uz,
  trim(m.left_text) AS word_ru
FROM public.daily_vocab_matches m
ON CONFLICT (day_number, sort_order) DO NOTHING;

DROP POLICY IF EXISTS daily_vocab_matches_select_auth ON public.daily_vocab_matches;
DROP POLICY IF EXISTS daily_vocab_mcqs_select_auth ON public.daily_vocab_mcqs;
DROP POLICY IF EXISTS daily_vocab_intro_select_auth ON public.daily_vocab_intro;

DROP TABLE IF EXISTS public.daily_vocab_matches;
DROP TABLE IF EXISTS public.daily_vocab_mcqs;
DROP TABLE IF EXISTS public.daily_vocab_intro;

ALTER TABLE public.daily_vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_vocab_words_select_auth ON public.daily_vocab_words FOR SELECT TO authenticated USING (true);
