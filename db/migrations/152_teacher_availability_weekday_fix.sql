-- Bo'sh vaqt qoidasidagi hafta kuni: 0..6 (0 = yakshanba).
--
-- MUAMMO: jadval `teacher_availability_rules.weekday` ni Postgres `dow` bilan
-- solishtiradi (0 = yakshanba, 6 = shanba), lekin jadval CHECK sharti 1..7
-- edi. Natijada YAKSHANBAGA bo'sh vaqt qo'shib bo'lmasdi (baza xato berardi),
-- 7 deb yozilgan qoida esa hech qachon kalendarga tushmasdi.

UPDATE public.teacher_availability_rules SET weekday = 0 WHERE weekday = 7;

ALTER TABLE public.teacher_availability_rules
  DROP CONSTRAINT IF EXISTS teacher_availability_rules_weekday_check;

ALTER TABLE public.teacher_availability_rules
  ADD CONSTRAINT teacher_availability_rules_weekday_check
  CHECK (weekday BETWEEN 0 AND 6);
