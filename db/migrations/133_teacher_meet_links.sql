-- 133_teacher_meet_links.sql
-- Yangi model: METNI O'QITUVCHI O'ZI OCHADI.
--   1. O'qituvchi kabinetda "Yangi dars" ochadi: kun, soat, davomiylik, mavzu.
--   2. Havolani o'zi qo'yishi mumkin (Google Meet / Zoom) — bo'sh qoldirsa,
--      FalaRus'ning o'z video xonasi ishlatiladi.
--   3. O'quvchida "Kirish" tugmasi faqat belgilangan vaqtda faollashadi.

-- Tashqi havola (bo'sh bo'lsa xona orqali FalaRus video xonasi ishlatiladi).
ALTER TABLE public.teacher_meet_sessions
  ADD COLUMN IF NOT EXISTS join_url text,
  ADD COLUMN IF NOT EXISTS created_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL;

-- Endi dars admin bergan xonasiz ham bo'la oladi (tashqi havola bilan).
ALTER TABLE public.teacher_meet_sessions
  ALTER COLUMN room_id DROP NOT NULL;

-- Dars yo xonaga, yo havolaga bog'langan bo'lishi shart.
ALTER TABLE public.teacher_meet_sessions
  DROP CONSTRAINT IF EXISTS teacher_meet_sessions_target_check;
ALTER TABLE public.teacher_meet_sessions
  ADD CONSTRAINT teacher_meet_sessions_target_check
  CHECK (room_id IS NOT NULL OR (join_url IS NOT NULL AND char_length(join_url) > 0));

-- O'quvchining kelgusi darslarini tez topish uchun.
CREATE INDEX IF NOT EXISTS idx_teacher_meet_sessions_start_status
  ON public.teacher_meet_sessions (starts_at, status);
