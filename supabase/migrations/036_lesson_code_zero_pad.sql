-- BIGINT `lesson_id` cannot store leading zeros (1 and 01 are the same value).
-- For display / exports / admin: generated text `lesson_code` — lessons 1–9 → '01'..'09', 10+ unchanged.

ALTER TABLE public.questions
  DROP COLUMN IF EXISTS lesson_code;

ALTER TABLE public.questions
  ADD COLUMN lesson_code text
  GENERATED ALWAYS AS (
    CASE
      WHEN lesson_id >= 1 AND lesson_id <= 9 THEN lpad(lesson_id::text, 2, '0')
      ELSE lesson_id::text
    END
  ) STORED;

COMMENT ON COLUMN public.questions.lesson_code IS
  'Display-only zero-padded lesson id for 1–9 (01..09). FK remains lesson_id (bigint).';

ALTER TABLE public.user_answers
  DROP COLUMN IF EXISTS lesson_code;

ALTER TABLE public.user_answers
  ADD COLUMN lesson_code text
  GENERATED ALWAYS AS (
    CASE
      WHEN lesson_id >= 1 AND lesson_id <= 9 THEN lpad(lesson_id::text, 2, '0')
      ELSE lesson_id::text
    END
  ) STORED;

COMMENT ON COLUMN public.user_answers.lesson_code IS
  'Display-only; mirrors questions.lesson_code rules.';
