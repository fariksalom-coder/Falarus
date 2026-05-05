-- O‘qish: kun 14–40 uchun `daily_reading_lexemes` ni `daily_vocab_words` bilan boyitish.
-- Sabab: matnda ko‘p so‘z bosiladi, lekin leksima jadvalida ko‘pincha faqat qisqa «MATN lug‘ati» bor;
-- lug‘at bo‘limidagi rus-O‘zbek juftliklari matnda ham uchraydi — ularni bosilganda tarjima chiqishi uchun qo‘shamiz.

-- `054_seed_kunlik_day_01.sql` UNIQUE indeksni vaqtincha olgan; `ON CONFLICT` uchun qayta yaratiladi.
DELETE FROM public.daily_reading_lexemes l
WHERE COALESCE(trim(l.text_id), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM public.daily_reading_lexemes l2
    WHERE l2.text_id = l.text_id
      AND l2.word_ru_normalized = l.word_ru_normalized
      AND l2.id < l.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_reading_lexemes_text_word_norm
  ON public.daily_reading_lexemes (text_id, word_ru_normalized);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
SELECT DISTINCT ON (
  p.text_id,
  lower(replace(trim(v.word_ru), 'ё', 'е'))
)
  p.text_id,
  trim(v.word_ru),
  lower(replace(trim(v.word_ru), 'ё', 'е')),
  trim(v.word_uz),
  NULL::text
FROM public.daily_vocab_words v
INNER JOIN public.daily_reading_passages p ON p.day_number = v.day_number
WHERE v.day_number >= 14 AND v.day_number <= 40
  AND trim(v.word_ru) <> ''
ORDER BY p.text_id, lower(replace(trim(v.word_ru), 'ё', 'е')), v.sort_order, v.id
ON CONFLICT (text_id, word_ru_normalized) DO NOTHING;
