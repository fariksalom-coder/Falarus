-- 143_restore_legacy_points.sql
--
-- Reyting TARIXI tiklanadi.
--
-- 139-migratsiyada XP formulasi faqat ibora testlariga o'tkazilgan va shu
-- sababli barcha eski ball nolga tushgan edi. Bu noto'g'ri: platformada
-- undan oldin ming(lab) foydalanuvchi yig'gan natija bor va reyting o'sha
-- joydan davom etishi kerak.
--
-- Yechim: eski jami ball `legacy_points` ustunida MUZLATIB qo'yiladi va
-- bundan buyon u BAZA sifatida ishlatiladi:
--
--     total_points = legacy_points + (ibora testlaridagi to'g'ri javoblar)
--
-- Ya'ni tarix saqlanadi, yangi ball esa faqat iboralardan yig'iladi
-- (`shared/xpFormula.ts`).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS legacy_points integer NOT NULL DEFAULT 0;

-- 139 dan OLDINGI qiymatlar (o'sha migratsiya olgan zaxiradan).
UPDATE public.users u
SET legacy_points = b.total_points
FROM public.users_total_points_backup_20260801 b
WHERE b.user_id = u.id
  AND u.legacy_points = 0;

-- Jami ballni darhol qayta yig'amiz (baza + iboralar).
UPDATE public.users u
SET total_points = u.legacy_points + COALESCE((
  SELECT SUM(LEAST(GREATEST(COALESCE(p.phrases_correct, 0), 0), 30))
  FROM public.user_kunlik_day_progress p
  WHERE p.user_id = u.id
), 0);

-- Reyting jadvalini ham moslashtiramiz (top ro'yxati shu yerdan olinadi).
UPDATE public.leaderboard l
SET total_points = u.total_points,
    updated_at = now()
FROM public.users u
WHERE l.user_id = u.id;
