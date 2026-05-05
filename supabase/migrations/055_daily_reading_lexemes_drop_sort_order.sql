-- Lexeme tartibi sort_order ustuni bo‘lmasa ham id bo‘yicha beriladi (054 seed bilan mos).

ALTER TABLE public.daily_reading_lexemes DROP COLUMN IF EXISTS sort_order;

DROP INDEX IF EXISTS public.idx_daily_reading_lexemes_text_sort;

CREATE INDEX IF NOT EXISTS idx_daily_reading_lexemes_text_id
  ON public.daily_reading_lexemes (text_id);
