-- 034_lesson_questions_json_schema.sql
-- Flexible lesson task storage for choice/matching/sentence/fill/reorder.

CREATE TABLE IF NOT EXISTS public.lessons (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  lesson_path TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('choice', 'matching', 'sentence', 'fill', 'reorder')),
  prompt TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.question_content (
  question_id BIGINT PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_answers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  lesson_id BIGINT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_correct BOOLEAN,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_lesson ON public.questions(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(type);
CREATE INDEX IF NOT EXISTS idx_question_content_content_gin ON public.question_content USING GIN (content);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_question_created ON public.user_answers(user_id, question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_answers_lesson_created ON public.user_answers(lesson_id, created_at DESC);
