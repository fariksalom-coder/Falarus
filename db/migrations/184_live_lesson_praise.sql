-- Relative age is optional; never infer it from the student's name or gender.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age_group TEXT
  CHECK (age_group IS NULL OR age_group IN ('younger', 'older', 'peer'));

CREATE TABLE IF NOT EXISTS public.live_lesson_praise_usage (
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phrase)
);
CREATE INDEX IF NOT EXISTS live_lesson_praise_usage_recent
  ON public.live_lesson_praise_usage (user_id, used_at);
