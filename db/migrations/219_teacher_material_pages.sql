-- Dars materiallari, 2-bosqich: PowerPoint/Word fayllar serverda PDF ga aylantiriladi,
-- sahifalar yengil rasm (WebP) bo'lib beriladi; o'qituvchi materialni aniq darsga biriktira oladi.

ALTER TABLE public.teacher_materials
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS error text,
  -- Asl fayl turi (pptx, docx …) — PDF ga aylantirilgan bo'lsa.
  ADD COLUMN IF NOT EXISTS source_kind text;

DO $$ BEGIN
  ALTER TABLE public.teacher_materials ADD CONSTRAINT teacher_materials_status_check CHECK (status IN ('processing', 'ready', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- «Shu dars uchun» — o'qituvchi darsga oldindan tayyorlagan materiallar.
CREATE TABLE IF NOT EXISTS public.teacher_lesson_materials (
  lesson_kind text NOT NULL CHECK (lesson_kind IN ('lesson', 'trial')),
  lesson_id bigint NOT NULL,
  material_id bigint NOT NULL REFERENCES public.teacher_materials(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_kind, lesson_id, material_id)
);
