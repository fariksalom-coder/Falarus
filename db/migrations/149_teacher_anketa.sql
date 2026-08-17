-- O'qituvchi anketasi: prototipdagi 12 qadam uchun yetishmayotgan maydonlar.
--
-- Mavjud `teacher_profiles` allaqachon ism, tajriba, ta'lim, sertifikat,
-- mutaxassislik va narxni saqlaydi. Bu yerda faqat YO'Q bo'lgani qo'shiladi:
-- shaxsiy/pasport ma'lumotlari, video-prezentatsiya va anketa holati.
--
-- Hujjat FAYLLARI alohida jadvalda — bitta o'qituvchida bir nechta hujjat
-- bo'ladi va har biri alohida tekshiruvdan o'tadi.

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IS NULL OR gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS passport_issued_by text,
  ADD COLUMN IF NOT EXISTS passport_issued_at date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS video_url text,
  -- Anketa qaysi qadamgacha to'ldirilgan (1..12). Foydalanuvchi qaytib
  -- kelganda o'sha joydan davom etadi.
  ADD COLUMN IF NOT EXISTS anketa_step smallint NOT NULL DEFAULT 1
    CHECK (anketa_step BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS anketa_submitted_at timestamptz;

-- Pasport raqami takrorlanmasin (bo'sh qiymatlar cheklanmaydi).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teacher_profiles_passport
  ON public.teacher_profiles (passport_number)
  WHERE passport_number IS NOT NULL AND passport_number <> '';

CREATE TABLE IF NOT EXISTS public.teacher_documents (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL
    REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  kind text NOT NULL
    CHECK (kind IN ('passport', 'diploma', 'certificate', 'video', 'other')),
  file_url text NOT NULL,
  original_name text NOT NULL DEFAULT '',
  -- Moderator tekshiruvi: yuklangan hujjat darhol ishonchli hisoblanmaydi.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_documents_teacher
  ON public.teacher_documents (teacher_user_id, created_at DESC);
