-- Xabarlarga emoji reaksiya (Telegramdagi kabi).
--
-- Bitta foydalanuvchi bitta xabarga bir nechta TURLI emoji qo'ya oladi,
-- lekin bir xilini ikki marta emas — buni birlamchi kalitning o'zi
-- ta'minlaydi. Qayta bosilsa reaksiya olib tashlanadi (toggle), buni
-- server hal qiladi.
--
-- `ON DELETE CASCADE`: xabar o'chsa yoki foydalanuvchi hisobi o'chsa,
-- reaksiya ham ketadi — yetim yozuv qolmasin.

CREATE TABLE IF NOT EXISTS public.community_message_reactions (
  message_id BIGINT      NOT NULL REFERENCES public.community_group_messages(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Emoji uzunligi cheklanadi: bu maydonga ixtiyoriy matn yozib bo'lmasin.
-- Bitta emoji modifikatorlar bilan 16 baytgacha chiqishi mumkin
-- (masalan, teri rangi yoki ZWJ birikmalari), shuning uchun chegara keng.
ALTER TABLE public.community_message_reactions
  DROP CONSTRAINT IF EXISTS community_message_reactions_emoji_check;
ALTER TABLE public.community_message_reactions
  ADD CONSTRAINT community_message_reactions_emoji_check
  CHECK (char_length(emoji) BETWEEN 1 AND 16);

-- Xabarlar ro'yxati yuklanganda reaksiyalar `message_id IN (...)` bilan
-- olinadi — shu indeks aynan shuning uchun.
CREATE INDEX IF NOT EXISTS idx_community_reactions_message
  ON public.community_message_reactions (message_id);

COMMENT ON TABLE public.community_message_reactions IS
  'Muloqot chatidagi xabarlarga qo''yilgan emoji reaksiyalar.';
