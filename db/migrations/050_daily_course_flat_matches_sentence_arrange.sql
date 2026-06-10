-- Flatten match exercise: one row per pair + block_sort_order (replaces *_match_sets + *_match_pairs).
-- Grammar: add word-bank "compose sentence" tasks (daily_grammar_sentence_arrange).

-- ---------- Grammar matches (single table) ----------
CREATE TABLE IF NOT EXISTS public.daily_grammar_matches (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  block_sort_order integer NOT NULL DEFAULT 0,
  pair_sort_order integer NOT NULL DEFAULT 0,
  left_text text NOT NULL,
  right_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_number, block_sort_order, pair_sort_order)
);

CREATE INDEX IF NOT EXISTS idx_daily_grammar_matches_day_block
  ON public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order);

-- Migrate from legacy two-table layout if present
INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
SELECT s.day_number, s.sort_order, p.sort_order, p.left_text, p.right_text
FROM public.daily_grammar_match_pairs p
JOIN public.daily_grammar_match_sets s ON s.id = p.match_set_id
ON CONFLICT (day_number, block_sort_order, pair_sort_order) DO NOTHING;

DROP POLICY IF EXISTS daily_grammar_match_pairs_select_auth ON public.daily_grammar_match_pairs;
DROP POLICY IF EXISTS daily_grammar_match_sets_select_auth ON public.daily_grammar_match_sets;
DROP TABLE IF EXISTS public.daily_grammar_match_pairs;
DROP TABLE IF EXISTS public.daily_grammar_match_sets;

ALTER TABLE public.daily_grammar_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_grammar_matches_select_auth ON public.daily_grammar_matches FOR SELECT TO authenticated USING (true);

-- ---------- Vocabulary matches (single table) ----------
CREATE TABLE IF NOT EXISTS public.daily_vocab_matches (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  block_sort_order integer NOT NULL DEFAULT 0,
  pair_sort_order integer NOT NULL DEFAULT 0,
  left_text text NOT NULL,
  right_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_number, block_sort_order, pair_sort_order)
);

CREATE INDEX IF NOT EXISTS idx_daily_vocab_matches_day_block
  ON public.daily_vocab_matches (day_number, block_sort_order, pair_sort_order);

INSERT INTO public.daily_vocab_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
SELECT s.day_number, s.sort_order, p.sort_order, p.left_text, p.right_text
FROM public.daily_vocab_match_pairs p
JOIN public.daily_vocab_match_sets s ON s.id = p.match_set_id
ON CONFLICT (day_number, block_sort_order, pair_sort_order) DO NOTHING;

DROP POLICY IF EXISTS daily_vocab_match_pairs_select_auth ON public.daily_vocab_match_pairs;
DROP POLICY IF EXISTS daily_vocab_match_sets_select_auth ON public.daily_vocab_match_sets;
DROP TABLE IF EXISTS public.daily_vocab_match_pairs;
DROP TABLE IF EXISTS public.daily_vocab_match_sets;

ALTER TABLE public.daily_vocab_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_vocab_matches_select_auth ON public.daily_vocab_matches FOR SELECT TO authenticated USING (true);

-- ---------- Grammar: compose sentence from word bank ----------
CREATE TABLE IF NOT EXISTS public.daily_grammar_sentence_arrange (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  prompt_lang text NOT NULL CHECK (prompt_lang IN ('uz', 'ru')),
  prompt_text text NOT NULL,
  word_bank text[] NOT NULL DEFAULT '{}',
  answer_ru text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_grammar_sentence_arrange_day
  ON public.daily_grammar_sentence_arrange (day_number, sort_order);

ALTER TABLE public.daily_grammar_sentence_arrange ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_grammar_sentence_arrange_select_auth
  ON public.daily_grammar_sentence_arrange FOR SELECT TO authenticated USING (true);
