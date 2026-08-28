-- Muloqot (savol-javob) guruhiga media qo'shish: rasm, video, ovozli xabar
-- va dumaloq video xabar.
--
-- Uchala ustun ham NULL bo'la oladi va standart qiymatsiz — shuning uchun
-- mavjud yozuvlarga ham, eski kodga ham ta'sir qilmaydi: media yo'q xabar
-- avvalgidek faqat `content` bilan yashaydi.
--
-- `content` NOT NULL bo'lib qoladi. Faqat mediadan iborat xabarda u bo'sh
-- satr bo'ladi — ustun cheklovini o'zgartirmaslik uchun ataylab shunday.

ALTER TABLE public.community_group_messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_kind TEXT,
  ADD COLUMN IF NOT EXISTS media_ms   INTEGER;

-- Ruxsat etilgan turlar. `video_note` — Telegramdagi kabi dumaloq video xabar;
-- u oddiy `video` dan faqat ko'rinishi bilan farq qiladi, shuning uchun
-- alohida tur sifatida saqlanadi (kvadrat kadr, dumaloq niqob bilan chiziladi).
ALTER TABLE public.community_group_messages
  DROP CONSTRAINT IF EXISTS community_group_messages_media_kind_check;
ALTER TABLE public.community_group_messages
  ADD CONSTRAINT community_group_messages_media_kind_check
  CHECK (media_kind IS NULL OR media_kind IN ('image', 'video', 'voice', 'video_note'));

-- Media bor xabarda manzil ham bo'lishi shart va aksincha — yarim yozuv
-- qolib ketmasin.
ALTER TABLE public.community_group_messages
  DROP CONSTRAINT IF EXISTS community_group_messages_media_pair_check;
ALTER TABLE public.community_group_messages
  ADD CONSTRAINT community_group_messages_media_pair_check
  CHECK ((media_url IS NULL) = (media_kind IS NULL));

COMMENT ON COLUMN public.community_group_messages.media_url IS
  'Yuklangan fayl manzili (/uploads/storage/...). Media yo''q bo''lsa NULL.';
COMMENT ON COLUMN public.community_group_messages.media_kind IS
  'image | video | voice | video_note';
COMMENT ON COLUMN public.community_group_messages.media_ms IS
  'Ovozli va video xabar uzunligi (millisekund). Rasmda NULL.';
