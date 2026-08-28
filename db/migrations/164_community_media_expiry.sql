-- Chat mediasining muddati: 100 soatdan keyin fayl diskdan o'chiriladi.
--
-- NIMA UCHUN XABAR O'CHIRILMAYDI: matnli xabar bor-yo'g'i bir necha yuz
-- bayt (388 xabar = 176 kB), joyni yeydigan narsa — fayllar. Shuning uchun
-- suhbat tarixi saqlanadi, faqat fayl olib tashlanadi.
--
-- `media_url` va `media_kind` ATAYLAB joyida qoldiriladi: chatda xabar
-- o'rnida "muddati tugadi" ko'rsatish uchun uning qanday media bo'lgani
-- bilinishi kerak. Faylning yo'qligi `media_deleted_at` bilan belgilanadi.

ALTER TABLE public.community_group_messages
  ADD COLUMN IF NOT EXISTS media_deleted_at TIMESTAMPTZ;

-- Tozalovchi ish shu indeks bilan yuradi: hali o'chirilmagan va eski
-- media xabarlarni tez topadi.
CREATE INDEX IF NOT EXISTS idx_community_messages_media_cleanup
  ON public.community_group_messages (created_at)
  WHERE media_url IS NOT NULL AND media_deleted_at IS NULL;

COMMENT ON COLUMN public.community_group_messages.media_deleted_at IS
  'Fayl diskdan o''chirilgan vaqt. NULL — fayl hali joyida.';
