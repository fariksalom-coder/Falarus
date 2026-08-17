-- 137_kunlik_phrases_done.sql
--
-- Lug'at bo'limining 4-vazifasi (ibora testlari) bajarilgani.
--
-- MUHIM: bu ustun kunning "tugallandi" mezoniga QO'SHILMAYDI
-- (`shared/kunlikDayCompletion.ts`). Sabab: hozircha barcha 182 kunda
-- ibora testlari bo'sh — mezonlar qatoriga qo'shilsa, hamma kun birdan
-- "tugallanmagan" bo'lib qolardi, admin kontent qo'shgach esa allaqachon
-- yopilgan kunlar qaytadan ochilib ketardi.

ALTER TABLE public.user_kunlik_day_progress
  ADD COLUMN IF NOT EXISTS phrases_done boolean NOT NULL DEFAULT false;
