-- Maxsus (rasmli) reaksiyalar: support galereyadan rasm yuklab, uni
-- reaksiya sifatida qo'sha oladi.
--
-- KALIT TUSHUNCHASI: `emoji` ustuni endi ikki xil bo'lishi mumkin —
--   * unicode belgi        → '👍'
--   * maxsus rasm kaliti   → ':falarus:'
-- Ikkalasi ham `community_message_reactions.emoji` ga yoziladi, ya'ni
-- reaksiya hisoblash mantig'i o'zgarmaydi. Rasmning manzili faqat
-- ko'rsatish uchun kerak va shu jadvalda yashaydi.

ALTER TABLE public.community_reaction_emojis
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS label     TEXT;

-- Kalit uzunligi kengaytiriladi: ':falarus-logo:' kabi nomlar 16 belgiga
-- sig'maydi. Unicode emojilar baribir qisqa.
ALTER TABLE public.community_reaction_emojis
  DROP CONSTRAINT IF EXISTS community_reaction_emojis_emoji_check;
ALTER TABLE public.community_reaction_emojis
  ADD CONSTRAINT community_reaction_emojis_emoji_check
  CHECK (char_length(emoji) BETWEEN 1 AND 32);

ALTER TABLE public.community_message_reactions
  DROP CONSTRAINT IF EXISTS community_message_reactions_emoji_check;
ALTER TABLE public.community_message_reactions
  ADD CONSTRAINT community_message_reactions_emoji_check
  CHECK (char_length(emoji) BETWEEN 1 AND 32);

-- Rasmli reaksiyada manzil bo'lishi shart bo'lgan holat: kalit `:...:`
-- ko'rinishida bo'lsa, rasmsiz qolib ketmasin.
ALTER TABLE public.community_reaction_emojis
  DROP CONSTRAINT IF EXISTS community_reaction_emojis_image_pair_check;
ALTER TABLE public.community_reaction_emojis
  ADD CONSTRAINT community_reaction_emojis_image_pair_check
  CHECK (emoji NOT LIKE ':%:' OR image_url IS NOT NULL);

COMMENT ON COLUMN public.community_reaction_emojis.image_url IS
  'Maxsus reaksiya rasmi (/uploads/storage/...). Unicode emojida NULL.';
COMMENT ON COLUMN public.community_reaction_emojis.label IS
  'Rasmli reaksiyaning nomi — ekran o''qigichlar va tooltip uchun.';
