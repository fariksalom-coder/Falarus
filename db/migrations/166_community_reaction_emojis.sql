-- Reaksiya emojilarini support hisobi boshqaradi.
--
-- Ilgari ro'yxat kodda qattiq yozilgan edi — yangi emoji qo'shish uchun
-- deploy kerak bo'lardi. Endi u bazada va oltin (support) hisobi uni
-- o'zi to'ldiradi.
--
-- ESKI REAKSIYALAR SAQLANADI: ro'yxatdan chiqarilgan emoji bilan
-- qo'yilgan reaksiyalar o'chirilmaydi (tarix buzilmasin). Ular chatda
-- ko'rinaveradi, faqat yangi qo'yish uchun taklif etilmaydi —
-- `community_message_reactions` da hech qanday FK yo'q, ataylab shunday.

CREATE TABLE IF NOT EXISTS public.community_reaction_emojis (
  emoji      TEXT        PRIMARY KEY,
  sort_order INTEGER     NOT NULL DEFAULT 100,
  created_by INTEGER     REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_reaction_emojis_emoji_check
    CHECK (char_length(emoji) BETWEEN 1 AND 16)
);

-- Hozirgi sakkizta — kodda turgan to'plamning o'zi. `ON CONFLICT` bilan,
-- ya'ni migratsiyani qayta yurgizsa ham xato bermaydi.
INSERT INTO public.community_reaction_emojis (emoji, sort_order) VALUES
  ('👍', 10), ('❤️', 20), ('🔥', 30), ('😁', 40),
  ('😮', 50), ('😢', 60), ('🙏', 70), ('👏', 80)
ON CONFLICT (emoji) DO NOTHING;

COMMENT ON TABLE public.community_reaction_emojis IS
  'Chatda taklif etiladigan reaksiya emojilari. Support hisobi boshqaradi.';
