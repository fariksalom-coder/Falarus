-- 144_drop_practice_ru_correct.sql
--
-- Gapirish bo'limidan BAZADAGI etalon javob butunlay olib tashlanadi.
--
-- Sabab: tekshiruvni endi to'liq AI qiladi — u o'zbekcha topshiriq bilan
-- o'quvchi aytgan gapni solishtirib, to'g'ri yoki xatoligini o'zi baholaydi
-- (`server/lib/openai.ts` → `checkTranslation`). Etalon javob hech qayerda
-- o'qilmaydi, shuning uchun uni saqlab turishning ma'nosi yo'q — aks holda
-- admin uni to'ldirishda davom etardi va u jimgina eskirib borardi.
--
-- QAYTARIB BO'LMAYDI: ustun o'chirilishidan oldin barcha qiymatlar
-- `daily_practice_prompts_ru_correct_backup_20260801` jadvaliga ko'chiriladi.
-- Kerak bo'lsa shu jadvaldan tiklash mumkin.

CREATE TABLE IF NOT EXISTS public.daily_practice_prompts_ru_correct_backup_20260801 AS
SELECT id, day_number, sort_order, uz_text, ru_correct, now() AS backed_up_at
FROM public.daily_practice_prompts;

ALTER TABLE public.daily_practice_prompts
  DROP COLUMN IF EXISTS ru_correct;
