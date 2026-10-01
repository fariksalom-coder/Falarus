-- Enable the trial day without renumbering paid course days.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.daily_grammar_matches DROP CONSTRAINT IF EXISTS daily_grammar_matches_day_number_check;
ALTER TABLE public.daily_grammar_matches ADD CONSTRAINT daily_grammar_matches_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_grammar_mcqs DROP CONSTRAINT IF EXISTS daily_grammar_mcqs_day_number_check;
ALTER TABLE public.daily_grammar_mcqs ADD CONSTRAINT daily_grammar_mcqs_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_grammar_sentence_arrange DROP CONSTRAINT IF EXISTS daily_grammar_sentence_arrange_day_number_check;
ALTER TABLE public.daily_grammar_sentence_arrange ADD CONSTRAINT daily_grammar_sentence_arrange_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_grammar_topics DROP CONSTRAINT IF EXISTS daily_grammar_topics_day_number_check;
ALTER TABLE public.daily_grammar_topics ADD CONSTRAINT daily_grammar_topics_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_practice_prompts DROP CONSTRAINT IF EXISTS daily_practice_prompts_day_number_check;
ALTER TABLE public.daily_practice_prompts ADD CONSTRAINT daily_practice_prompts_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_reading_passages DROP CONSTRAINT IF EXISTS daily_reading_passages_day_number_check;
ALTER TABLE public.daily_reading_passages ADD CONSTRAINT daily_reading_passages_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.daily_vocab_words DROP CONSTRAINT IF EXISTS daily_vocab_words_day_number_check;
ALTER TABLE public.daily_vocab_words ADD CONSTRAINT daily_vocab_words_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.kun_suhbat_urinish DROP CONSTRAINT IF EXISTS kun_suhbat_urinish_day_number_check;
ALTER TABLE public.kun_suhbat_urinish ADD CONSTRAINT kun_suhbat_urinish_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.user_kunlik_day_progress DROP CONSTRAINT IF EXISTS user_kunlik_day_progress_day_number_check;
ALTER TABLE public.user_kunlik_day_progress ADD CONSTRAINT user_kunlik_day_progress_day_number_check CHECK (day_number BETWEEN 0 AND 182);
ALTER TABLE public.kun_suhbat_savol DROP CONSTRAINT IF EXISTS kun_suhbat_savol_manba_kun_check;
ALTER TABLE public.kun_suhbat_savol ADD CONSTRAINT kun_suhbat_savol_manba_kun_check CHECK (manba_kun BETWEEN 0 AND 182);

COMMIT;
