-- 139_xp_only_from_phrases.sql
--
-- XP endi FAQAT lug'atdagi ibora testlaridan yig'iladi (har bir to'g'ri
-- javob — 1 XP). Eski formula grammatika, so'zlar, juftlik, o'qish,
-- gapirish, streak va vaqt uchun ham ball berardi.
--
-- Shuning uchun `users.total_points` qayta hisoblanadi. Bu QAYTARIB
-- BO'LMAYDIGAN o'zgarish, shuning uchun eski qiymatlar avval zaxiraga
-- ko'chiriladi: kerak bo'lsa `users_total_points_backup_20260801` dan
-- tiklash mumkin.

-- 1) Zaxira (faqat bir marta yaratiladi)
CREATE TABLE IF NOT EXISTS public.users_total_points_backup_20260801 AS
SELECT id AS user_id, total_points, now() AS backed_up_at
FROM public.users
WHERE total_points IS NOT NULL AND total_points > 0;

-- 2) Yangi formula bo'yicha qayta hisoblash.
--    Bir kunda eng ko'pi 30 ta javob sanaladi (shared/xpFormula.ts bilan bir xil).
UPDATE public.users u
SET total_points = COALESCE((
  SELECT SUM(LEAST(GREATEST(COALESCE(p.phrases_correct, 0), 0), 30))
  FROM public.user_kunlik_day_progress p
  WHERE p.user_id = u.id
), 0);

-- 3) Reyting jadvalini ham moslashtiramiz (top ro'yxati shu yerdan olinadi).
UPDATE public.leaderboard l
SET total_points = u.total_points,
    updated_at = now()
FROM public.users u
WHERE l.user_id = u.id;
