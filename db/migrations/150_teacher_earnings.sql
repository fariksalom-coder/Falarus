-- O'qituvchi daromadi.
--
-- NEGA ALOHIDA JADVAL KERAK:
--   Sinov darsi puli sayt orqali o'tadi va `teacher_trial_lessons.payment_id`
--   da yozilgan — u YERDAN hisoblanadi, bu jadvalga takrorlanmaydi.
--   Oylik kurs puli esa sayt orqali o'tmaydi: buni
--   `teacher_monthly_course_confirmations` ning mavjudligi ko'rsatadi —
--   agar pul sayt orqali o'tganda, o'quvchi va ustozdan "kursga yozildimi"
--   deb alohida so'rash kerak bo'lmasdi.
--
-- Shuning uchun bu jadval — QO'LDA kiritiladigan daromad daftari:
-- ustoz oylik kurs yoki boshqa manbadan olgan pulini o'zi yozib boradi.

CREATE TABLE IF NOT EXISTS public.teacher_earnings (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL
    REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'monthly'
    CHECK (source IN ('monthly', 'extra', 'other')),
  student_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  amount_uzs numeric(12,2) NOT NULL CHECK (amount_uzs > 0),
  earned_on date NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher_date
  ON public.teacher_earnings (teacher_user_id, earned_on DESC);
