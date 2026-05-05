-- Kunlik reja (daily course): grammar, vocabulary, reading, practice — keyed by day_number 1–42.
-- Backend reads via service role; RLS allows authenticated SELECT for future PostgREST use.

CREATE TABLE IF NOT EXISTS public.daily_grammar_topics (
  day_number integer PRIMARY KEY CHECK (day_number >= 1 AND day_number <= 42),
  title text NOT NULL DEFAULT '',
  theory_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_grammar_mcqs (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  quiz_kind text NOT NULL CHECK (quiz_kind IN ('rule', 'sentence')),
  sort_order integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_index smallint NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_grammar_mcqs_day_kind
  ON public.daily_grammar_mcqs (day_number, quiz_kind, sort_order);

CREATE TABLE IF NOT EXISTS public.daily_grammar_match_sets (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_grammar_match_sets_day
  ON public.daily_grammar_match_sets (day_number, sort_order);

CREATE TABLE IF NOT EXISTS public.daily_grammar_match_pairs (
  id bigserial PRIMARY KEY,
  match_set_id bigint NOT NULL REFERENCES public.daily_grammar_match_sets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  left_text text NOT NULL,
  right_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_grammar_match_pairs_set
  ON public.daily_grammar_match_pairs (match_set_id, sort_order);

-- Vocabulary (daily): intro text + MCQ + pairs (parallel to main vocabulary tables).

CREATE TABLE IF NOT EXISTS public.daily_vocab_intro (
  day_number integer PRIMARY KEY CHECK (day_number >= 1 AND day_number <= 42),
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_vocab_mcqs (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_index smallint NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_vocab_mcqs_day ON public.daily_vocab_mcqs (day_number, sort_order);

CREATE TABLE IF NOT EXISTS public.daily_vocab_match_sets (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_vocab_match_sets_day ON public.daily_vocab_match_sets (day_number, sort_order);

CREATE TABLE IF NOT EXISTS public.daily_vocab_match_pairs (
  id bigserial PRIMARY KEY,
  match_set_id bigint NOT NULL REFERENCES public.daily_vocab_match_sets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  left_text text NOT NULL,
  right_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_vocab_match_pairs_set ON public.daily_vocab_match_pairs (match_set_id, sort_order);

-- Reading: passage + clickable-word lexemes (Russian surface form + Uzbek gloss + optional audio).

CREATE TABLE IF NOT EXISTS public.daily_reading_passages (
  day_number integer PRIMARY KEY CHECK (day_number >= 1 AND day_number <= 42),
  title text NOT NULL DEFAULT '',
  body_ru text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_reading_lexemes (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL REFERENCES public.daily_reading_passages(day_number) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  word_ru text NOT NULL,
  translation_uz text NOT NULL,
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_reading_lexemes_day ON public.daily_reading_lexemes (day_number, sort_order);

-- Practice: Uzbek prompt → expected Russian translation (same idea as speaking_tasks).

CREATE TABLE IF NOT EXISTS public.daily_practice_prompts (
  id bigserial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 42),
  sort_order integer NOT NULL DEFAULT 0,
  prompt_uz text NOT NULL,
  expected_ru text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_practice_prompts_day ON public.daily_practice_prompts (day_number, sort_order);

-- RLS (content readable by authenticated users; writes via service role / admin only).

ALTER TABLE public.daily_grammar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_grammar_mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_grammar_match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_grammar_match_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vocab_intro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vocab_mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vocab_match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vocab_match_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reading_lexemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_practice_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_grammar_topics_select_auth ON public.daily_grammar_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_grammar_mcqs_select_auth ON public.daily_grammar_mcqs FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_grammar_match_sets_select_auth ON public.daily_grammar_match_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_grammar_match_pairs_select_auth ON public.daily_grammar_match_pairs FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_vocab_intro_select_auth ON public.daily_vocab_intro FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_vocab_mcqs_select_auth ON public.daily_vocab_mcqs FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_vocab_match_sets_select_auth ON public.daily_vocab_match_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_vocab_match_pairs_select_auth ON public.daily_vocab_match_pairs FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_reading_passages_select_auth ON public.daily_reading_passages FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_reading_lexemes_select_auth ON public.daily_reading_lexemes FOR SELECT TO authenticated USING (true);
CREATE POLICY daily_practice_prompts_select_auth ON public.daily_practice_prompts FOR SELECT TO authenticated USING (true);
