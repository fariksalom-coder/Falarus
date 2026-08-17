-- 122_teacher_profile_extended.sql
-- O'qituvchi profilini kengaytirish: ta'lim, sertifikat, natijalar, haftalik jadval,
-- FalaRus tavsiyasi. Barcha ustunlar ixtiyoriy (default bilan) — mavjud qatorlar buzilmaydi.
-- DIQQAT: hali serverda ishga tushirilmagan (lokal tayyorlik). Deploy paytida qo'llanadi.

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS achievements        text,
  ADD COLUMN IF NOT EXISTS students_total       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS students_success     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS students_failed      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS education            jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificates         jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_availability  jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_recommended       boolean NOT NULL DEFAULT false;

-- Tavsiya etilgan o'qituvchilarni tez topish uchun (ro'yxatda oldinga chiqarish).
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_recommended
  ON teacher_profiles (is_recommended)
  WHERE is_recommended = true;
