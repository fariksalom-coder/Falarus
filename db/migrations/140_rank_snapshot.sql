-- 140_rank_snapshot.sql
--
-- Bosh sahifadagi o'rin yonidagi strelka uchun: foydalanuvchi ko'tarildimi
-- yoki tushdimi.
--
-- Taqqoslash nuqtasi — SHU KUNNING BIRINCHI tekshiruvidagi o'rin. Har safar
-- yangilansa, farq doim 0 bo'lib qolardi (o'zini o'zi bilan solishtirish);
-- kunlik suratga olish esa "bugun nima o'zgardi" degan tushunarli ma'no beradi.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rank_snapshot integer,
  ADD COLUMN IF NOT EXISTS rank_snapshot_date date;
