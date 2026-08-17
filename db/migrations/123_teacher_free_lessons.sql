-- 123_teacher_free_lessons.sql
-- Yangi model: o'qituvchi BEPUL ro'yxatда 3 ta dars o'tadi; 4-darsdan listing to'lovi
-- (1-oy 69 000, keyingi oylar 300 000 so'm). Narx 299000 -> 300000.

-- Bepul o'tilgan darslar hisoblagichi (>=3 bo'lsa faol qolish uchun to'lov shart).
ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS free_lessons_used integer NOT NULL DEFAULT 0;

-- Oylik listing narxi 299000 -> 300000.
UPDATE teacher_listing_plans
  SET price_amount = 300000
  WHERE code = 'teacher_listing_month_uzs';
