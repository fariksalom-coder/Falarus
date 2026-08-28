-- Faqat mediadan iborat xabarga ruxsat.
--
-- 162-migratsiya media ustunlarini qo'shdi, lekin jadvalda ilgaridan
-- `content_check` turgan edi: `char_length(content) > 0`. Ya'ni rasm yoki
-- ovozli xabarni izohsiz yuborib bo'lmasdi — fayl diskka tushib, INSERT
-- cheklovga urilardi va foydalanuvchi «Xabar yuborilmadi» ko'rardi.
--
-- Yangi qoida avvalgi kafolatni saqlaydi (xabar bo'm-bo'sh bo'lmasin),
-- faqat "bo'sh emas" ta'rifi kengayadi: matn YOKI media bo'lishi kifoya.
-- Uzunlik chegarasi o'zgarmaydi.

ALTER TABLE public.community_group_messages
  DROP CONSTRAINT IF EXISTS community_group_messages_content_check;

ALTER TABLE public.community_group_messages
  ADD CONSTRAINT community_group_messages_content_check
  CHECK (
    char_length(content) <= 2000
    AND (char_length(content) > 0 OR media_url IS NOT NULL)
  );
