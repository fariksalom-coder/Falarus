-- 222_answer_variants.sql
--
-- Bir nechta to'g'ri javob.
--
-- 1) daily_grammar_sentence_arrange.alt_answers — «Gap tuzish» faqat bitta so'z tartibini
--    qabul qilardi, rus tilida esa tartib ko'pincha erkin («Где метро, извините?»).
-- 2) daily_practice_prompts.ru_reference — 4-blok tarjimasi uchun tekshirilgan namunalar.
--    Hukmni AI chiqaradi, namuna unga so'zlarning ma'nosini ko'rsatadi (gpt-4o-mini
--    «sochiq» = полотенце ni «soch» = волосы deb, to'g'ri javobni xato degan).
--    144-migratsiyadagi ru_correct dan farqi: bitta "yagona javob" emas, misollar ro'yxati.

ALTER TABLE public.daily_grammar_sentence_arrange
  ADD COLUMN IF NOT EXISTS alt_answers text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.daily_practice_prompts
  ADD COLUMN IF NOT EXISTS ru_reference text[] NOT NULL DEFAULT '{}';
