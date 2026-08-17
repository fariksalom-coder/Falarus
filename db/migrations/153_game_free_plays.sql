-- O'yinlardan bepul foydalanish hisobi.
--
-- Qoida: to'lov qilmagan o'quvchi o'yinlarni JAMI 3 marta ochadi, keyin
-- to'lov oynasi chiqadi. Premium (to'lovi tasdiqlangan) o'quvchida chek yo'q.
--
-- NEGA BAZADA: hisob brauzerda (localStorage) saqlansa, uni tozalash bilan
-- cheksiz o'ynash mumkin bo'lardi. Shuning uchun har ochilish serverda
-- yoziladi va chek server tomonda tekshiriladi.
--
-- Har yozuv o'yin nomi bilan saqlanadi: keyinchalik qaysi o'yin ko'proq
-- ochilgani ko'rinadi.

CREATE TABLE IF NOT EXISTS public.user_game_plays (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_game_plays_user
  ON public.user_game_plays (user_id, created_at DESC);
