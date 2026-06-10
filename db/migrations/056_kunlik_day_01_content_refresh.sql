-- Kunlik kun 1: yangi kontent (salomlashish / xayrlashish) — 054 bilan bir xil DELETE tartibi, keyin INSERT.

DELETE FROM public.daily_practice_prompts WHERE day_number = 1;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 1
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 1;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 1;

DELETE FROM public.daily_vocab_words WHERE day_number = 1;

DELETE FROM public.daily_grammar_matches WHERE day_number = 1;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 1;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 1;
DELETE FROM public.daily_grammar_topics WHERE day_number = 1;

-- ---------- Grammar: tema ----------
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  1,
  'Salomlashish va xayrlashish (Приветствия и прощания)',
  $theory$
1. Nazariy qism (o‘zbek tilida)

Rus tilida odam bilan salomlashish vaqtga va hurmat darajasiga bog‘liq.

Salomlashish (ruscha | o‘zbekcha | qachon)
• Доброе утро! — Xayrli tong! — ertalab (soat 12:00 gacha)
• Добрый день! — Xayrli kun! — kun davomida (12:00 – 17:00)
• Добрый вечер! — Xayrli kech! — kechqurun (17:00 dan keyin)
• Здравствуйте! — Assalomu alaykum! — rasmiy, notanish yoki katta yoshli odam bilan
• Привет! — Salom! — do‘stlar, tanishlar orasida

Xayrlashish variantlari (ruscha | o‘zbekcha)
• До свидания! — Ko‘rishguncha! (rasmiy)
• Пока! — Xayr! (norasmiy)
• Доброй ночи! — Xayrli tun! (uxlashdan oldin)

Muhim:
«Здравствуйте» — bu siz yoki sizlar (hurmat) uchun ishlatiladi.
«Привет» — faqat «sen» uchun.

E’tibor bering: hozirgi zamonda «men» (я) va «u» (он, она) dan keyin «быть» fe’li odatda aytilmaydi. Masalan: Я студент (Men talabaman), Он врач (U shifokor).
$theory$
);

-- ---------- Grammar: TEST 1 (4 ta variant) ----------
INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (
    1,
    'rule',
    0,
    '«Xayrli tong» rus tilida qanday?',
    'Добрый день',
    'Доброе утро',
    'Добрый вечер',
    'Привет',
    1
  ),
  (
    1,
    'rule',
    1,
    'Universitetda professor bilan ertalab qanday salomlashasiz?',
    'Привет',
    'Пока',
    'Здравствуйте',
    'Доброй ночи',
    2
  ),
  (
    1,
    'rule',
    2,
    '«Ko‘rishguncha» so‘zining sinonimi qaysi?',
    'Пока',
    'До свидания',
    'Привет',
    'Добрый день',
    1
  ),
  (
    1,
    'rule',
    3,
    'Uxlashdan oldin nima deysiz?',
    'Добрый вечер',
    'Доброе утро',
    'Доброй ночи',
    'Здравствуйте',
    2
  );

-- ---------- Grammar: TEST 3 (gap tuzish) ----------
INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (1, 0, 'uz', 'Xayrli tong', ARRAY['утро', 'Доброе', 'день', 'Привет'], 'Доброе утро'),
  (1, 1, 'uz', 'Ko‘rishguncha', ARRAY['До', 'свидания', 'Пока', 'Привет'], 'До свидания'),
  (1, 2, 'uz', 'Sashaga norasmiy salom', ARRAY['Привет', 'Саша', 'Здравствуйте', 'утро'], 'Привет, Саша'),
  (1, 3, 'uz', 'Annaga rasmiy salom', ARRAY['Здравствуйте', 'Анна', 'Пока', 'день'], 'Здравствуйте, Анна');

-- ---------- Grammar: TEST 2 (juftlik: chap o‘zbekcha, o‘ng ruscha) ----------
INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (1, 0, 0, 'Xayrli kech', 'Добрый вечер'),
  (1, 0, 1, 'Xayrli kun', 'Добрый день'),
  (1, 0, 2, 'Salom', 'Привет'),
  (1, 0, 3, 'Xayr', 'Пока');

-- ---------- Lug‘at: 15 ta so‘z ----------
INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (1, 0, 'Tong', 'Утро'),
  (1, 1, 'Kun', 'День'),
  (1, 2, 'Kech', 'Вечер'),
  (1, 3, 'Tun', 'Ночь'),
  (1, 4, 'Salom', 'Привет'),
  (1, 5, 'Xayr', 'Пока'),
  (1, 6, 'Assalomu alaykum', 'Здравствуйте'),
  (1, 7, 'Ko‘rishguncha', 'До свидания'),
  (1, 8, 'Yaxshi', 'Хороший'),
  (1, 9, 'Bugun', 'Сегодня'),
  (1, 10, 'Ertalab', 'Утром'),
  (1, 11, 'Kechqurun', 'Вечером'),
  (1, 12, 'Do‘st', 'Друг'),
  (1, 13, 'Ona', 'Мама'),
  (1, 14, 'O‘qituvchi', 'Учитель');

-- ---------- O‘qish matni + lug‘at (lemma takrorlanmasin) ----------
INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  1,
  'Mening birinchi kunim',
  $body$
Сегодня мой первый день. Я говорю маме: «Доброе утро!» Папа пьёт кофе. Я говорю папе: «Привет!» Потом я иду в университет. Я говорю преподавателю: «Здравствуйте!» Вечером я звоню другу. Я говорю: «Добрый вечер!» Друг говорит: «Пока!»
$body$,
  'kunlik-oqish-01'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-01', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-01', 'мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-01', 'первый', 'первый', 'Birinchi', NULL),
  ('kunlik-oqish-01', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-01', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-01', 'говорю', 'говорю', 'Aytaman', NULL),
  ('kunlik-oqish-01', 'маме', 'маме', 'Onamga', NULL),
  ('kunlik-oqish-01', 'Доброе', 'доброе', 'Xayrli (salomlashishda)', NULL),
  ('kunlik-oqish-01', 'утро', 'утро', 'Tong', NULL),
  ('kunlik-oqish-01', 'Папа', 'папа', 'Dada', NULL),
  ('kunlik-oqish-01', 'пьёт', 'пьёт', 'Ichyapti', NULL),
  ('kunlik-oqish-01', 'кофе', 'кофе', 'Kofe', NULL),
  ('kunlik-oqish-01', 'Привет', 'привет', 'Salom', NULL),
  ('kunlik-oqish-01', 'папе', 'папе', 'Dadaga', NULL),
  ('kunlik-oqish-01', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-01', 'иду', 'иду', 'Ketyapman', NULL),
  ('kunlik-oqish-01', 'в', 'в', 'Yo‘nalish (в университет)', NULL),
  ('kunlik-oqish-01', 'университет', 'университет', 'Universitet', NULL),
  ('kunlik-oqish-01', 'преподавателю', 'преподавателю', 'O‘qituvchiga', NULL),
  ('kunlik-oqish-01', 'Здравствуйте', 'здравствуйте', 'Assalomu alaykum', NULL),
  ('kunlik-oqish-01', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-01', 'звоню', 'звоню', 'Qo‘ng‘iroq qilaman', NULL),
  ('kunlik-oqish-01', 'другу', 'другу', 'Do‘stimga', NULL),
  ('kunlik-oqish-01', 'Добрый', 'добрый', 'Xayrli (salomlashishda)', NULL),
  ('kunlik-oqish-01', 'вечер', 'вечер', 'Kech', NULL),
  ('kunlik-oqish-01', 'Друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-01', 'говорит', 'говорит', 'Deydi', NULL),
  ('kunlik-oqish-01', 'Пока', 'пока', 'Xayr', NULL);

-- ---------- Gapirish (10 ta) ----------
INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (1, 0, 'Xayrli tong, o‘qituvchi!', 'Доброе утро, учитель!'),
  (1, 1, 'Salom, do‘stim!', 'Привет, мой друг!'),
  (1, 2, 'Ko‘rishguncha, onajon.', 'До свидания, мамочка.'),
  (1, 3, 'Xayrli tun, dada.', 'Доброй ночи, папа.'),
  (1, 4, 'Assalomu alaykum, boshliq.', 'Здравствуйте, начальник.'),
  (1, 5, 'Xayr, akam.', 'Пока, мой брат.'),
  (1, 6, 'Xayrli kech, qo‘shnilar.', 'Добрый вечер, соседи.'),
  (1, 7, 'Bugun qanday kun?', 'Какой сегодня день?'),
  (1, 8, 'Kechirasiz, hozir vaqtim yo‘q.', 'Извините, сейчас у меня нет времени.'),
  (1, 9, 'Yana ko‘rishguncha!', 'До свидания!');
