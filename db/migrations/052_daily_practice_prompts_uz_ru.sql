-- Align daily practice rows with speaking_tasks naming: uz_text + ru_correct.

ALTER TABLE public.daily_practice_prompts RENAME COLUMN prompt_uz TO uz_text;
ALTER TABLE public.daily_practice_prompts RENAME COLUMN expected_ru TO ru_correct;
