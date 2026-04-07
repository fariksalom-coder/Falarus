-- 035_questions_versioning_and_meta.sql
-- Hardening tasks model for production evolution.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS difficulty INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS skill TEXT NOT NULL DEFAULT 'grammar',
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_questions_skill ON public.questions(skill);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
