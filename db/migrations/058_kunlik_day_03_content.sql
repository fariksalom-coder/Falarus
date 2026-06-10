-- Kunlik kun 3: Davlat va millat (Страна и национальность).

DELETE FROM public.daily_practice_prompts WHERE day_number = 3;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 3
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 3;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 3;

DELETE FROM public.daily_vocab_words WHERE day_number = 3;

DELETE FROM public.daily_grammar_matches WHERE day_number = 3;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 3;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 3;
DELETE FROM public.daily_grammar_topics WHERE day_number = 3;

-- ---------- Grammar: tema ----------
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  3,
  'Davlat va millat (Страна и национальность)',
  $theory$
Qayerdan ekanligingizni aytish uchun «Я из + davlat (rod. pad.)» ishlatiladi. Masalan: Я из Узбекистана.

• «Откуда вы?» — Qayerdansiz? (rasmiy)
• «Откуда ты?» — Qayerdansan? (norasmiy)

Tayanch so‘zlar (davlat → из + rod. pad.; millat erkak / ayol):

• Узбекистан → из Узбекистана → узбек / узбечка
• Россия → из России → русский / русская
• Китай → из Китая → китаец / китаянка
• Турция → из Турции → турок / турчанка
• США (Америка) → из США (из Америки) → американец / американка

Muhim grammatika:
• «Откуда?» (qayerdan?) — предлог из.
• «Куда?» (qayerga?) — предлог в (в Россию, в Узбекистан). Hozircha eslab qoling.

Millat va davlat nomlari katta harf bilan yoziladi.
$theory$
);

-- ---------- Grammar: TEST 1 ----------
INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (
    3,
    'rule',
    0,
    '«Откуда вы?» so‘ro‘g‘ining ma’nosi qaysi?',
    'Qayerga borasiz?',
    'Qayerda yashaysiz?',
    'Qayerdansiz?',
    'Kim siz?',
    2
  ),
  (
    3,
    'rule',
    1,
    '«Я из Узбекистана» tarjimasi qaysi?',
    'Men O‘zbekistondaman',
    'Men O‘zbekistonga boryapman',
    'Men O‘zbekistonda yashayman',
    'Men O‘zbekistonni sevaman',
    0
  ),
  (
    3,
    'rule',
    2,
    'Qaysi shakl to‘g‘ri? (Россия)',
    'из Россия',
    'из Россию',
    'из России',
    'с России',
    2
  ),
  (
    3,
    'rule',
    3,
    'Erkak «Men turkman» desa, u qaysi davlat vakili?',
    'Туркменистан',
    'Турция',
    'Таджикистан',
    'Казахстан',
    1
  );

-- ---------- Grammar: TEST 2 (chap davlat, o‘ng millat erkak) ----------
INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (3, 0, 0, 'Китай', 'Китаец'),
  (3, 0, 1, 'Россия', 'Русский'),
  (3, 0, 2, 'США', 'Американец'),
  (3, 0, 3, 'Турция', 'Турок');

-- ---------- Grammar: TEST 3 ----------
INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (
    3,
    0,
    'uz',
    '(я, из, Узбекистан → род. падеж)',
    ARRAY['Я', 'из', 'Узбекистана', 'России', 'Турции'],
    'Я из Узбекистана'
  ),
  (
    3,
    1,
    'uz',
    '(вы, откуда)',
    ARRAY['Откуда', 'вы?', 'ты?', 'из'],
    'Откуда вы?'
  ),
  (
    3,
    2,
    'uz',
    '(Анна, из, Россия)',
    ARRAY['Анна', 'из', 'России', 'Узбекистана', 'Китая'],
    'Анна из России'
  ),
  (
    3,
    3,
    'uz',
    '(Али, узбек)',
    ARRAY['Али', '–', 'узбек', 'русский', 'из'],
    'Али – узбек'
  );

-- ---------- Lug‘at: 15 ta so‘z ----------
INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (3, 0, 'Davlat', 'Страна'),
  (3, 1, 'Qayerdan?', 'Откуда?'),
  (3, 2, 'O‘zbekiston', 'Узбекистан'),
  (3, 3, 'O‘zbek', 'Узбек'),
  (3, 4, 'O‘zbek ayol', 'Узбечка'),
  (3, 5, 'Rossiya', 'Россия'),
  (3, 6, 'Rus', 'Русский'),
  (3, 7, 'Rus ayol', 'Русская'),
  (3, 8, 'Xitoy', 'Китай'),
  (3, 9, 'Xitoylik (erkak)', 'Китаец'),
  (3, 10, 'Xitoylik (ayol)', 'Китаянка'),
  (3, 11, 'Turkiya', 'Турция'),
  (3, 12, 'Turk', 'Турок'),
  (3, 13, 'Turk ayol', 'Турчанка'),
  (3, 14, 'Amerika', 'Америка (США)');

-- ---------- O‘qish ----------
INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  3,
  'Откуда они?',
  $body$
В нашей группе иностранные студенты. Меня зовут Пётр. Я из России. Я русский. Моя подруга Анна тоже из России. Она русская. А это мой друг Рахим. Он из Узбекистана. Рахим – узбек. А вот Мария. Откуда она? Она из США. Мария – американка. Рахим спрашивает: «Мария, вы говорите по-русски?» Мария отвечает: «Немного». Отлично!
$body$,
  'kunlik-oqish-03'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-03', 'В', 'в', 'Joylashuv (qayerda?)', NULL),
  ('kunlik-oqish-03', 'нашей', 'нашей', 'Bizning (род. ж.)', NULL),
  ('kunlik-oqish-03', 'группе', 'группе', 'Guruhda', NULL),
  ('kunlik-oqish-03', 'иностранные', 'иностранные', 'Xorijiy, chet ellik', NULL),
  ('kunlik-oqish-03', 'студенты', 'студенты', 'Talabalar', NULL),
  ('kunlik-oqish-03', 'Меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-03', 'зовут', 'зовут', 'Chaqirishadi, ism qo‘yiladi', NULL),
  ('kunlik-oqish-03', 'Пётр', 'петр', 'Pyotr (ism)', NULL),
  ('kunlik-oqish-03', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-03', 'из', 'из', '...dan', NULL),
  ('kunlik-oqish-03', 'России', 'россии', 'Rossiyadan (род.)', NULL),
  ('kunlik-oqish-03', 'русский', 'русский', 'Rus (erkak millati)', NULL),
  ('kunlik-oqish-03', 'Моя', 'моя', 'Mening (ayol rodi)', NULL),
  ('kunlik-oqish-03', 'подруга', 'подруга', 'Qiz do‘st', NULL),
  ('kunlik-oqish-03', 'Анна', 'анна', 'Anna (ism)', NULL),
  ('kunlik-oqish-03', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-03', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-03', 'русская', 'русская', 'Rus (ayol millati)', NULL),
  ('kunlik-oqish-03', 'А', 'а', 'Esa, va (qarama-qarshilik)', NULL),
  ('kunlik-oqish-03', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-03', 'мой', 'мой', 'Mening (erkak rodi)', NULL),
  ('kunlik-oqish-03', 'друг', 'друг', 'Erkak do‘st', NULL),
  ('kunlik-oqish-03', 'Рахим', 'рахим', 'Rahim (ism)', NULL),
  ('kunlik-oqish-03', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-03', 'Узбекистана', 'узбекистана', 'O‘zbekistondan (род.)', NULL),
  ('kunlik-oqish-03', 'узбек', 'узбек', 'O‘zbek (erkak)', NULL),
  ('kunlik-oqish-03', 'Вот', 'вот', 'Mana', NULL),
  ('kunlik-oqish-03', 'Мария', 'мария', 'Mariya (ism)', NULL),
  ('kunlik-oqish-03', 'Откуда', 'откуда', 'Qayerdan?', NULL),
  ('kunlik-oqish-03', 'США', 'сша', 'AQSH', NULL),
  ('kunlik-oqish-03', 'американка', 'американка', 'Amerikalik ayol', NULL),
  ('kunlik-oqish-03', 'спрашивает', 'спрашивает', 'So‘raydi', NULL),
  ('kunlik-oqish-03', 'говорите', 'говорите', 'Siz gapirasiz', NULL),
  ('kunlik-oqish-03', 'по-русски', 'по-русски', 'Ruscha', NULL),
  ('kunlik-oqish-03', 'отвечает', 'отвечает', 'Javob beradi', NULL),
  ('kunlik-oqish-03', 'Немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-03', 'Отлично', 'отлично', 'Ajoyib', NULL);

-- ---------- Gapirish (10 ta) ----------
INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (3, 0, 'Qayerdansiz?', 'Откуда вы?'),
  (3, 1, 'Men O‘zbekistondanman.', 'Я из Узбекистана.'),
  (3, 2, 'U koreys.', 'Он кореец.'),
  (3, 3, 'Siz amerikalikmisiz?', 'Вы американец?'),
  (3, 4, 'Ular Xitoydan.', 'Они из Китая.'),
  (3, 5, 'Men turkman.', 'Я турок.'),
  (3, 6, 'Sizning do‘stingiz qayerdan?', 'Откуда ваш друг?'),
  (3, 7, 'U fransuz.', 'Он француз.'),
  (3, 8, 'Ular qayerda yashaydilar?', 'Где они живут?'),
  (3, 9, 'U rus, u esa ukrain.', 'Он русский, а она украинка.');
