-- Relslarga layk va kommentariya.
--
-- KOMMENTARIYA ALOHIDA JADVALDA EMAS: u guruh xabarining o'zi, faqat
-- `reel_id` bilan belgilangan. Sabab — talab shunday: kommentariya
-- savol-javob guruhida ham ko'rinishi kerak. Alohida jadval bo'lsa,
-- xabarni ikki joyga yozib, keyin ularni sinxron ushlab turish kerak
-- bo'lardi: tahrirlash, o'chirish, moderatsiya — hammasi ikki marta.
-- Bitta manba esa o'z-o'zidan to'g'ri qoladi.

ALTER TABLE public.community_group_messages
  ADD COLUMN IF NOT EXISTS reel_id BIGINT
    REFERENCES public.community_reels(id) ON DELETE CASCADE;

-- Bitta relsning kommentariyalarini tez topish uchun.
CREATE INDEX IF NOT EXISTS idx_community_messages_reel
  ON public.community_group_messages (reel_id, created_at)
  WHERE reel_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.community_group_messages.reel_id IS
  'Xabar shu relsga kommentariya bo''lsa — uning id si. Oddiy xabarda NULL.';

-- Layklar. Bitta odam bitta relsni bir marta yoqtiradi — buni birlamchi
-- kalitning o'zi ta'minlaydi; qayta bosilsa yozuv o'chiriladi (toggle).
CREATE TABLE IF NOT EXISTS public.community_reel_likes (
  reel_id    BIGINT      NOT NULL REFERENCES public.community_reels(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reel_likes_reel
  ON public.community_reel_likes (reel_id);

COMMENT ON TABLE public.community_reel_likes IS
  'Relslarga qo''yilgan layklar. Takroriy bosish yozuvni o''chiradi.';
