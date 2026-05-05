-- Kunlik kun 8: Raqamlar 11–20 (числа 11–20).

DELETE FROM public.daily_practice_prompts WHERE day_number = 8;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 8
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 8;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 8;

DELETE FROM public.daily_vocab_words WHERE day_number = 8;

DELETE FROM public.daily_grammar_matches WHERE day_number = 8;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 8;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 8;
DELETE FROM public.daily_grammar_topics WHERE day_number = 8;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  8,
  'Raqamlar 11–20 (Числа 11–20)',
  $theory$
Rus tilida 11 dan 20 gacha:

11 — одиннадцать, 12 — двенадцать, 13 — тринадцать, 14 — четырнадцать, 15 — пятнадцать, 16 — шестнадцать, 17 — семнадцать, 18 — восемнадцать, 19 — девятнадцать, 20 — двадцать.

Qoida: 11–19 asosiy raqamga -надцать qo‘shiladi (пять → пятнадцать, шесть → шестнадцать). 20 — двадцать (keyinroq: 30 — тридцать, 40 — сорок…).

Yosh aytish:
• Мне тринадцать лет. — Menga o‘n uch yosh.
• Ему семнадцать лет. — Unga o‘n yetti yosh.
• Ей двадцать лет. — Unga yigirma yosh.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (8, 'rule', 0, '11 rus tilida qanday?', 'двенадцать', 'одиннадцать', 'тринадцать', 'четырнадцать', 1),
  (8, 'rule', 1, '15 rus tilida qanday?', 'четырнадцать', 'шестнадцать', 'пятнадцать', 'семнадцать', 2),
  (8, 'rule', 2, '20 rus tilida qanday?', 'двадцать', 'девятнадцать', 'восемнадцать', 'двенадцать', 0),
  (8, 'rule', 3, '«Menga o‘n yetti yosh» rus tilida?', 'Мне шестнадцать лет', 'Мне семнадцать лет', 'Мне восемнадцать лет', 'Мне пятнадцать лет', 1),
  (8, 'rule', 4, '13 rus tilida qanday?', 'двенадцать', 'четырнадцать', 'тринадцать', 'одиннадцать', 2),
  (8, 'rule', 5, '18 rus tilida qanday?', 'семнадцать', 'девятнадцать', 'шестнадцать', 'восемнадцать', 3),
  (8, 'rule', 6, '12 rus tilida qanday?', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 1),
  (8, 'rule', 7, '16 rus tilida qanday?', 'пятнадцать', 'семнадцать', 'шестнадцать', 'восемнадцать', 2),
  (8, 'rule', 8, '19 rus tilida qanday?', 'восемнадцать', 'двадцать', 'девятнадцать', 'семнадцать', 2),
  (8, 'rule', 9, '14 rus tilida qanday?', 'тринадцать', 'пятнадцать', 'четырнадцать', 'двенадцать', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (8, 0, 0, 'O‘n bir', 'Одиннадцать'),
  (8, 0, 1, 'O‘n ikki', 'Двенадцать'),
  (8, 0, 2, 'O‘n uch', 'Тринадцать'),
  (8, 0, 3, 'O‘n to‘rt', 'Четырнадцать'),
  (8, 0, 4, 'O‘n besh', 'Пятнадцать'),
  (8, 0, 5, 'O‘n olti', 'Шестнадцать'),
  (8, 0, 6, 'O‘n yetti', 'Семнадцать'),
  (8, 0, 7, 'Yigirma', 'Двадцать');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (8, 0, 'uz', 'Menga o‘n uch yosh', ARRAY['Мне', 'тринадцать', 'лет.', 'Ему', 'восемнадцать'], 'Мне тринадцать лет.'),
  (8, 1, 'uz', 'U o‘n sakkiz yoshda (erkak)', ARRAY['Ему', 'восемнадцать', 'лет.', 'Мне', 'пятнадцать'], 'Ему восемнадцать лет.'),
  (8, 2, 'uz', 'Menga yigirma yosh', ARRAY['Мне', 'двадцать', 'лет.', 'Ей', 'семнадцать'], 'Мне двадцать лет.'),
  (8, 3, 'uz', 'Unga o‘n besh yosh (ayol)', ARRAY['Ей', 'пятнадцать', 'лет.', 'Он', 'студент'], 'Ей пятнадцать лет.'),
  (8, 4, 'uz', 'O‘n ikki raqami', ARRAY['Двенадцать', 'Одиннадцать', 'Тринадцать'], 'Двенадцать'),
  (8, 5, 'uz', '(u, o‘n yetti, yosh)', ARRAY['Ему', 'семнадцать', 'лет.', 'Ей', 'двадцать'], 'Ему семнадцать лет.'),
  (8, 6, 'uz', '(ona, o‘n to‘qqiz)', ARRAY['Ей', 'девятнадцать', 'лет.', 'Мне', 'восемнадцать'], 'Ей девятнадцать лет.'),
  (8, 7, 'uz', 'Sinfdagi talabalar soni (20)', ARRAY['В', 'нашем', 'классе', 'двадцать', 'студентов.', 'десять'], 'В нашем классе двадцать студентов.'),
  (8, 8, 'uz', '(biz, sonlar, o‘rgandik)', ARRAY['Мы', 'изучали', 'числа.', 'Сегодня', 'учитель'], 'Мы изучали числа.'),
  (8, 9, 'uz', '(men, ruscha, hisoblayman)', ARRAY['Я', 'умею', 'считать', 'по-русски.', 'не'], 'Я умею считать по-русски.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (8, 0, 'O‘n bir', 'Одиннадцать'),
  (8, 1, 'O‘n ikki', 'Двенадцать'),
  (8, 2, 'O‘n uch', 'Тринадцать'),
  (8, 3, 'O‘n to‘rt', 'Четырнадцать'),
  (8, 4, 'O‘n besh', 'Пятнадцать'),
  (8, 5, 'O‘n olti', 'Шестнадцать'),
  (8, 6, 'O‘n yetti', 'Семнадцать'),
  (8, 7, 'O‘n sakkiz', 'Восемнадцать'),
  (8, 8, 'O‘n to‘qqiz', 'Девятнадцать'),
  (8, 9, 'Yigirma', 'Двадцать'),
  (8, 10, 'Hisoblamoq', 'Считать'),
  (8, 11, 'Raqam / son', 'Число'),
  (8, 12, 'Qancha / nechta', 'Сколько'),
  (8, 13, 'Ko‘p', 'Много'),
  (8, 14, 'Oz', 'Мало');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  8,
  'Sonlar 11–20',
  $body$
В нашем классе двадцать студентов. Мне восемнадцать лет. Моей подруге Малике – девятнадцать лет. Нашему преподавателю – тридцать пять лет. Он очень хороший учитель. Сегодня мы изучали числа от одиннадцати до двадцати. Это не очень трудно. Я выучил все числа. Теперь я умею считать по-русски. Это здорово!
$body$,
  'kunlik-oqish-08'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-08', 'В', 'в', 'Joyda (...da)', NULL),
  ('kunlik-oqish-08', 'нашем', 'нашем', 'Bizning (predlog bilan)', NULL),
  ('kunlik-oqish-08', 'классе', 'классе', 'Sinfda', NULL),
  ('kunlik-oqish-08', 'двадцать', 'двадцать', 'Yigirma', NULL),
  ('kunlik-oqish-08', 'студентов', 'студентов', 'Talabalar (род. мн.)', NULL),
  ('kunlik-oqish-08', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-08', 'восемнадцать', 'восемнадцать', 'O‘n sakkiz', NULL),
  ('kunlik-oqish-08', 'лет', 'лет', 'Yosh (5–20 bilan)', NULL),
  ('kunlik-oqish-08', 'Моей', 'моей', 'Mening ...ga (я)', NULL),
  ('kunlik-oqish-08', 'подруге', 'подруге', 'Qiz do‘stimga', NULL),
  ('kunlik-oqish-08', 'Малике', 'малике', 'Malikaga', NULL),
  ('kunlik-oqish-08', 'девятнадцать', 'девятнадцать', 'O‘n to‘qqiz', NULL),
  ('kunlik-oqish-08', 'Нашему', 'нашему', 'Bizning ...ga (эр)', NULL),
  ('kunlik-oqish-08', 'преподавателю', 'преподавателю', 'O‘qituvchimizga', NULL),
  ('kunlik-oqish-08', 'тридцать', 'тридцать', 'O‘ttiz', NULL),
  ('kunlik-oqish-08', 'пять', 'пять', 'Besh', NULL),
  ('kunlik-oqish-08', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-08', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-08', 'хороший', 'хороший', 'Yaxshi', NULL),
  ('kunlik-oqish-08', 'учитель', 'учитель', 'O‘qituvchi', NULL),
  ('kunlik-oqish-08', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-08', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-08', 'изучали', 'изучали', 'O‘rgandik', NULL),
  ('kunlik-oqish-08', 'числа', 'числа', 'Sonlar', NULL),
  ('kunlik-oqish-08', 'от', 'от', '...dan', NULL),
  ('kunlik-oqish-08', 'одиннадцати', 'одиннадцати', 'O‘n birdan (род.)', NULL),
  ('kunlik-oqish-08', 'до', 'до', '...gacha', NULL),
  ('kunlik-oqish-08', 'двадцати', 'двадцати', 'Yigirmagacha (род.)', NULL),
  ('kunlik-oqish-08', 'Это', 'это', 'Bu', NULL),
  ('kunlik-oqish-08', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-08', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-08', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-08', 'выучил', 'выучил', 'Yodladim', NULL),
  ('kunlik-oqish-08', 'все', 'все', 'Barcha', NULL),
  ('kunlik-oqish-08', 'Теперь', 'теперь', 'Endi', NULL),
  ('kunlik-oqish-08', 'умею', 'умею', 'Bilaman (qo‘lda)', NULL),
  ('kunlik-oqish-08', 'считать', 'считать', 'Hisoblamoq', NULL),
  ('kunlik-oqish-08', 'по-русски', 'по-русски', 'Ruscha', NULL),
  ('kunlik-oqish-08', 'здорово', 'здорово', 'Zo‘r!', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (8, 0, 'Sinfingizda nechta o‘quvchi bor?', 'Сколько учеников в твоём классе?'),
  (8, 1, 'Bizning sinfimizda yigirma o‘quvchi bor.', 'В нашем классе двадцать учеников.'),
  (8, 2, 'Necha yoshdasiz?', 'Сколько вам лет?'),
  (8, 3, 'Menga o‘n sakkiz yosh.', 'Мне восемнадцать лет.'),
  (8, 4, 'O‘n besh sonini ayt.', 'Скажи число пятнадцать.'),
  (8, 5, 'O‘n besh.', 'Пятнадцать.'),
  (8, 6, 'O‘n ikki va sakkiz – nechta?', 'Двенадцать плюс восемь – сколько?'),
  (8, 7, 'Yigirma.', 'Двадцать.'),
  (8, 8, 'Sening ukang necha yoshda?', 'Сколько лет твоему брату?'),
  (8, 9, 'Ukamga o‘n to‘qqiz yosh.', 'Моему брату девятнадцать лет.');
