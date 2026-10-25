-- Dars doskasi, 4-bosqich: chizmalar (pero, marker, matn) sahifa bo'yicha va oq varaqlar.
-- Chizmalar DARS bo'yicha saqlanadi: har bir o'quvchining o'z belgilari.

ALTER TABLE public.teacher_lesson_boards
  ADD COLUMN IF NOT EXISTS blank integer,
  ADD COLUMN IF NOT EXISTS blank_count integer NOT NULL DEFAULT 0;

-- page_key: `m<material_id>:<sahifa>` yoki `b<oq varaq>`; strokes — shared/lessonRoom.ts dagi Stroke[].
CREATE TABLE IF NOT EXISTS public.teacher_lesson_ink (
  lesson_kind text NOT NULL CHECK (lesson_kind IN ('lesson', 'trial')),
  lesson_id bigint NOT NULL,
  page_key text NOT NULL,
  strokes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_kind, lesson_id, page_key)
);
