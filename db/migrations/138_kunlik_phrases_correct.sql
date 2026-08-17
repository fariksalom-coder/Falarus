-- 138_kunlik_phrases_correct.sql
--
-- Ibora testlarida nechta to'g'ri javob berilgani — har biri uchun 1 XP.
-- `phrases_done` (137) bajarilgan/bajarilmaganni bildiradi, bu ustun esa
-- ballni hisoblash uchun kerak.
--
-- Qiymat FAQAT oshadi (`mergeKunlikDayPatch` MAX_KEYS): mashqni qayta
-- ishlaganda kamroq to'g'ri javob berilsa, oldingi natija saqlanib qoladi.

ALTER TABLE public.user_kunlik_day_progress
  ADD COLUMN IF NOT EXISTS phrases_correct integer NOT NULL DEFAULT 0;
