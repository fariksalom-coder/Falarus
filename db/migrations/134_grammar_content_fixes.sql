-- 134_grammar_content_fixes.sql
--
-- Grammatika mashqlaridagi kontent xatolarini tuzatish (2026-07-31 auditi).
--
-- Audit uslubi: har bir "gap tuzish" topshirig'i uchun so'z bankidan javobni
-- YIG'IB BO'LADIMI degan savol backtracking bilan tekshirildi (ilova javobni
-- shunday tekshiradi: tanlangan tokenlar birlashtirilib, tinish belgisiz
-- solishtiriladi). 1801 topshiriqdan faqat bittasi yechilmas chiqdi.
--
-- Takroriy qo'llash xavfsiz: har UPDATE o'z shartini tekshiradi.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Gap tuzish: so'z bankida javobdagi so'z yetishmayapti
-- ─────────────────────────────────────────────────────────────
-- 178-kun: javob "…на русском языке." lekin bankda "языке" yo'q edi,
-- ya'ni o'quvchi to'g'ri javobni umuman yig'a olmasdi.
UPDATE daily_grammar_sentence_arrange
SET word_bank = word_bank || ARRAY['языке']
WHERE id = 1796
  AND NOT ('языке' = ANY (word_bank));

-- ─────────────────────────────────────────────────────────────
-- 2. Test: javob kaliti grammatik jihatdan NOTO'G'RI variantni ko'rsatgan
-- ─────────────────────────────────────────────────────────────
-- 153-kun, id=1693, mavzu "Запятая" (vergul):
--   A) «По-моему это правда.»   <- kalit shu edi, VERGULSIZ = XATO
--   B) «По-моему, это правда.»  <- to'g'ri
--   C) «Это, по-моему, правда.» <- bu ham to'g'ri
--   D) «Только первое»
-- "По-моему" kirish so'zi HAR DOIM vergul bilan ajratiladi, ya'ni kalit
-- grammatik xato variantni to'g'ri deb ko'rsatib turgan edi. B va C ikkalasi
-- ham to'g'ri bo'lgani uchun D varianti "ikkalasi ham" ga aylantirilib,
-- kalit D ga ko'chiriladi — shunda savolning yagona to'g'ri javobi bo'ladi.
UPDATE daily_grammar_mcqs
SET option_d = 'И второе, и третье',
    correct_index = 3
WHERE id = 1693
  AND correct_index = 0
  AND option_a = 'По-моему это правда.';

-- ─────────────────────────────────────────────────────────────
-- 3. Test: to'g'ri javobda o'zbekcha imlo xatosi
-- ─────────────────────────────────────────────────────────────
-- 3-kun, id=55: «Я из Узбекистана» = "Men O'zbekistondanman" (chiqish
-- kelishigi). Variantda "Men O'zbekistondaman" (= men O'zbekistondaman,
-- o'rin-payt) deb yozilgan — bitta "n" tushib qolgan va ma'no o'zgargan,
-- ya'ni to'g'ri javob aslida savolga mos kelmasdi.
UPDATE daily_grammar_mcqs
SET option_a = 'Men O‘zbekistondanman'
WHERE id = 55
  AND option_a = 'Men O‘zbekistondaman';

COMMIT;
