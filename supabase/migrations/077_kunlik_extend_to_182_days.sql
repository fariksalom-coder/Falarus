-- Kunlik kurs: kunlar 43–182 (jami 182 kun). CHECK cheklovlarni kengaytirish, `text_id` trigerini 100+ uchun tuzatish,
-- spiral takrorlash uchun minimal kontent (keyinroq boyitiladi).

-- ---------- 1) Eski day_number <= 42 CHECK cheklovlarini olib tashlash ----------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, t.relname AS tbl
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%day_number >= 1%'
      AND pg_get_constraintdef(c.oid) LIKE '%day_number <= 42%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- ---------- 2) Yangi cheklov: 1–182 ----------
ALTER TABLE public.daily_grammar_topics
  ADD CONSTRAINT daily_grammar_topics_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_grammar_mcqs
  ADD CONSTRAINT daily_grammar_mcqs_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_grammar_matches
  ADD CONSTRAINT daily_grammar_matches_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_grammar_sentence_arrange
  ADD CONSTRAINT daily_grammar_sentence_arrange_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_vocab_words
  ADD CONSTRAINT daily_vocab_words_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_reading_passages
  ADD CONSTRAINT daily_reading_passages_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

ALTER TABLE public.daily_practice_prompts
  ADD CONSTRAINT daily_practice_prompts_day_number_check CHECK (day_number >= 1 AND day_number <= 182);

-- ---------- 3) text_id trigeri: LPAD(..., 2) 100+ kunni buzardi; tuzatish ----------
CREATE OR REPLACE FUNCTION public.set_daily_reading_passage_text_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.text_id IS NULL OR trim(NEW.text_id) = '' THEN
    NEW.text_id :=
      'kunlik-oqish-' ||
      CASE
        WHEN NEW.day_number >= 100 THEN NEW.day_number::text
        ELSE LPAD(NEW.day_number::text, 2, '0')
      END;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- 4) Takrorlanmaslik: 43–182 bo‘yicha eski spiral qatorlarni tozalash ----------
DELETE FROM public.daily_practice_prompts WHERE day_number >= 43 AND day_number <= 182;

DELETE FROM public.daily_reading_lexemes
WHERE text_id IN (SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 43 AND day_number <= 182);

DELETE FROM public.daily_reading_passages WHERE day_number >= 43 AND day_number <= 182;

DELETE FROM public.daily_vocab_words WHERE day_number >= 43 AND day_number <= 182;

DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 43 AND day_number <= 182;
DELETE FROM public.daily_grammar_matches WHERE day_number >= 43 AND day_number <= 182;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 43 AND day_number <= 182;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 43 AND day_number <= 182;

-- ---------- 5) Minimal kontent (spiral takrorlash) ----------
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
SELECT
  d,
  format('Spiral takrorlash — hafta %s, kun %s', (d + 6) / 7, d),
  format(
    $theory$
**Kun %s.** Bu bosqichda avvalgi mavzularni takrorlang: otlar, fellar zamonlari, kelishiklar va predloglar.

Har kuni qisqa matn va lug‘at bilan ishlang. Grammatik qoidani eslab, 2–3 ta o‘zingiz misol tuzing.
$theory$,
    d
  )
FROM generate_series(43, 182) AS d
ON CONFLICT (day_number) DO NOTHING;

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
SELECT
  d,
  'rule',
  0,
  format('Kun %s: «Men» olmoshining ruschasini tanlang.', d),
  'ты',
  'я',
  'он',
  'мы',
  1
FROM generate_series(43, 182) AS d;

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
SELECT
  d,
  format('Spiral matn — kun %s', d),
  format(
    $body$
Сегодня я учу новые слова: книга, город и время. Друг говорит о работе и семье. Урок русского языка мне нравится.

Это день номер %s. Я продолжаю практиковаться каждый день.
$body$,
    d
  ),
  CASE
    WHEN d >= 100 THEN 'kunlik-oqish-' || d::text
    ELSE 'kunlik-oqish-' || LPAD(d::text, 2, '0')
  END
FROM generate_series(43, 182) AS d;

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
SELECT d, 0, 'kitob', 'книга'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 1, 'shahar', 'город'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 2, 'vaqt', 'время'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 3, 'do‘st', 'друг'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 4, 'ish', 'работа'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 5, 'oila', 'семья'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 6, 'dars', 'урок'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 7, 'til', 'язык'
FROM generate_series(43, 182) AS d;

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
SELECT d, 0, format('Men rus tilini o‘rganaman — kun %s.', d), format('Я учу русский язык — день %s.', d)
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 1, 'Bugun men yangi so‘zlarni takrorlayman.', 'Сегодня я повторяю новые слова.'
FROM generate_series(43, 182) AS d
UNION ALL
SELECT d, 2, 'Matnni ovoz chiqarib o‘qing.', 'Прочитайте текст вслух.'
FROM generate_series(43, 182) AS d;
