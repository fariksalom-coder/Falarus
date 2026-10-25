-- O'qituvchining dars materiallari (PDF, rasm, audio, video) va dars doskasi.
-- Fayllar private-uploads/ da: faqat egasi va o'sha darsning o'quvchisi (dars vaqtida) ko'radi.

CREATE TABLE IF NOT EXISTS public.teacher_materials (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('pdf', 'image', 'audio', 'video')),
  mime text NOT NULL,
  size_bytes bigint NOT NULL,
  private_path text NOT NULL,
  original_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_materials_teacher ON public.teacher_materials (teacher_user_id, created_at DESC);

-- Darsda hozir ko'rsatilayotgan material, sahifa va ruxsatlar. Real vaqt kanali
-- (server/services/lessonRoom.service.ts) yozib boradi; `version` — oxirgi qo'llangan o'zgarish raqami.
CREATE TABLE IF NOT EXISTS public.teacher_lesson_boards (
  lesson_kind text NOT NULL CHECK (lesson_kind IN ('lesson', 'trial')),
  lesson_id bigint NOT NULL,
  material_id bigint REFERENCES public.teacher_materials(id) ON DELETE SET NULL,
  page integer NOT NULL DEFAULT 1 CHECK (page >= 1),
  student_can_draw boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_kind, lesson_id)
);
