-- O'qituvchi paneli v2 (prototip: "Кабинет преподавателя").
--
-- Panel prototipida bor, lekin bazada YO'Q bo'lgan uchta narsa qo'shiladi:
--
--   1) O'QUVCHI HAQIDA ESLATMA — ustoz o'quvchi kartochkasida o'zi uchun
--      yozib qo'yadigan qayd ("kelishik bilan qiynaladi"). Dars hisobotidan
--      farqi bor: hisobot bitta darsga bog'lanadi va o'quvchiga ham tegishli,
--      eslatma esa faqat ustozning shaxsiy daftari.
--
--   2) DARS HISOBOTIDAGI yetishmagan maydonlar — mavzu, darsga qo'yilgan
--      baho va sinov darsida aniqlangan daraja. Qolgani (nima yaxshi o'tdi,
--      nima ustida ishlash kerak, uy vazifasi) `teacher_lesson_feedback` da
--      allaqachon bor.
--
--   3) BIR MARTALIK BO'SH VAQT — hozir bo'sh vaqt faqat HAFTALIK qoida
--      ko'rinishida qo'shiladi. Prototipdagi "Добавить свободное время"
--      oynasida esa aniq sana bor va "har hafta takrorlash" — ixtiyoriy.
--      `teacher_availability_exceptions.is_available = true` shuning uchun
--      mo'ljallangan edi, unga slot uzunligi yetishmayotgan edi.

CREATE TABLE IF NOT EXISTS public.teacher_student_notes (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL
    REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_pair
  ON public.teacher_student_notes (teacher_user_id, student_user_id, created_at DESC);

ALTER TABLE public.teacher_lesson_feedback
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lesson_rating smallint
    CHECK (lesson_rating IS NULL OR lesson_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS determined_level text;

ALTER TABLE public.teacher_availability_exceptions
  ADD COLUMN IF NOT EXISTS slot_minutes smallint NOT NULL DEFAULT 60
    CHECK (slot_minutes BETWEEN 15 AND 240);
