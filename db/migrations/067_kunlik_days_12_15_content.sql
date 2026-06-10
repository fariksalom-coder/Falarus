-- Kunlik kun 12–15: Predlog qatori (davomi), transport va vaqt, «о ком/чём», takrorlash.

-- ---------- Kun 12 ----------
DELETE FROM public.daily_practice_prompts WHERE day_number = 12;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 12
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 12;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 12;

DELETE FROM public.daily_vocab_words WHERE day_number = 12;

DELETE FROM public.daily_grammar_matches WHERE day_number = 12;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 12;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 12;
DELETE FROM public.daily_grammar_topics WHERE day_number = 12;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  12,
  'Predlog qatori: -Е / -И va shaxs olmoshlari',
  $theory$
Предложный падеж oxirlari: asosan -Е (музей → в музее, дом → в доме); -ь, -ия, -ие bilan tugagan so‘zlar -И (ночь → в ночи, аудитория → в аудитории, здание → в здании).

Shaxs olmoshlari + о: Я → обо мне; Ты → о тебе; Он → о нём / в нём; Она → о ней / в ней; Мы → о нас; Вы → о вас; Они → о них / в них.

во мне — «в» + «мне» uchun maxsus shakl (talaffuz).

Joy: во мне есть силы — в тебе есть талант — в нём / в нас / в вас / в них.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (12, 'rule', 0, '«Sen haqingda» predlog qatorida?', 'о тебе', 'о тебя', 'о тобой', 'о тебею', 0),
  (12, 'rule', 1, '«Men haqimda» — qaysi birikma?', 'о мне', 'обо мне', 'во мне', 'об мне', 1),
  (12, 'rule', 2, '«В нём» — qaysi olmosh?', 'она', 'он', 'оно', 'они', 1),
  (12, 'rule', 3, '«Ular haqida»?', 'о них', 'об них', 'о ниx', 'в них', 0),
  (12, 'rule', 4, '«На» bilan olmosh (на мне / на тебе…)?', 'только на мне', 'только на тебе', 'только на нём', 'все формы возможны', 3),
  (12, 'rule', 5, 'Qaysi joy nomi -И bilan tugaydi?', 'в парке', 'в школе', 'в аптеке', 'в аудитории', 3),
  (12, 'rule', 6, '«О ней» — qaysi olmosh?', 'он', 'она', 'оно', 'они', 1),
  (12, 'rule', 7, '«Мы говорим о …» (sizlar haqida)', 'о вы', 'о вас', 'о вами', 'о вах', 1),
  (12, 'rule', 8, '«Словарь» predlog qatorida?', 'в словаре', 'в словарь', 'в словарю', 'в словаром', 0),
  (12, 'rule', 9, '«Них» qaysi olmoshdan?', 'он, она, оно', 'они', 'мы', 'вы', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (12, 0, 0, 'Я', 'обо мне'),
  (12, 0, 1, 'Ты', 'о тебе'),
  (12, 0, 2, 'Он', 'о нём'),
  (12, 0, 3, 'Она', 'о ней'),
  (12, 0, 4, 'Мы', 'о нас'),
  (12, 0, 5, 'Вы', 'о вас'),
  (12, 0, 6, 'Они', 'о них'),
  (12, 0, 7, 'музей', 'в музее'),
  (12, 0, 8, 'ночь', 'в ночи'),
  (12, 0, 9, 'здание', 'в здании');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (12, 0, 'uz', '(я, думаю, о, ты)', ARRAY['Я', 'думаю', 'о', 'тебе.', 'ты', 'в'], 'Я думаю о тебе.'),
  (12, 1, 'uz', '(они, говорят, о, мы)', ARRAY['Они', 'говорят', 'о', 'нас.', 'вы', 'них'], 'Они говорят о нас.'),
  (12, 2, 'uz', '(преподаватель, рассказывает, о, он)', ARRAY['Преподаватель', 'рассказывает', 'о', 'нём.', 'ней', 'мы'], 'Преподаватель рассказывает о нём.'),
  (12, 3, 'uz', '(она, вспоминает, о, она)', ARRAY['Она', 'вспоминает', 'о', 'ней.', 'он', 'них'], 'Она вспоминает о ней.'),
  (12, 4, 'uz', '(все, знают, о, они)', ARRAY['Все', 'знают', 'о', 'них.', 'нас', 'тебе'], 'Все знают о них.'),
  (12, 5, 'uz', '(кто, думает, о, я)', ARRAY['Кто', 'думает', 'обо', 'мне?', 'тебе', 'нас'], 'Кто думает обо мне?'),
  (12, 6, 'uz', '(мы, читали, о, вы, в газете)', ARRAY['Мы', 'читали', 'о', 'вас', 'в', 'газете.', 'них'], 'Мы читали о вас в газете.'),
  (12, 7, 'uz', '(в, ты, есть, сила)', ARRAY['В', 'тебе', 'есть', 'сила.', 'о', 'тебе'], 'В тебе есть сила.'),
  (12, 8, 'uz', '(уверенность, в, он)', ARRAY['Уверенность', 'в', 'нём.', 'о', 'ней'], 'Уверенность в нём.'),
  (12, 9, 'uz', '(я, помню, о, они)', ARRAY['Я', 'помню', 'о', 'них.', 'нас', 'тебе'], 'Я помню о них.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (12, 0, 'Kim haqida?', 'О ком?'),
  (12, 1, 'Men haqimda', 'Обо мне'),
  (12, 2, 'Sen haqingda', 'О тебе'),
  (12, 3, 'U (erkak) haqida', 'О нём'),
  (12, 4, 'U (ayol) haqida', 'О ней'),
  (12, 5, 'Biz haqimizda', 'О нас'),
  (12, 6, 'Siz haqingizda', 'О вас'),
  (12, 7, 'Ular haqida', 'О них'),
  (12, 8, 'O‘ylamoq (kim haqida)', 'Думать (о ком?)'),
  (12, 9, 'Gapirmoq (kim haqida)', 'Говорить (о ком?)'),
  (12, 10, 'Eshitmoq (kim haqida)', 'Слышать (о ком?)'),
  (12, 11, 'Bilmoq (kim haqida)', 'Знать (о ком?)'),
  (12, 12, 'Qayg‘urmoq', 'Беспокоиться'),
  (12, 13, 'Faxrlanmoq', 'Гордиться'),
  (12, 14, 'Sabr', 'Терпение');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  12,
  'О ком мы говорим?',
  $body$
Сегодня на уроке русского языка мы много говорили о разных людях. Сначала преподаватель спросил о нашей семье. Я рассказал о маме, о папе и о сестре. Потом мы говорили о нашем друге. Его зовут Антон. Антон живёт в Петербурге, но мы часто думаем о нём. Антон всегда думает о нас.

Учитель сказал: «Вы – хорошие друзья. Вы много знаете друг о друге. Я горжусь вами».

А о ком вы часто думаете? Я думаю о своих родителях и о своём будущем. А вы?
$body$,
  'kunlik-oqish-12'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-12', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-12', 'уроке', 'уроке', 'Darsda', NULL),
  ('kunlik-oqish-12', 'говорили', 'говорили', 'Gaplashdik', NULL),
  ('kunlik-oqish-12', 'разных', 'разных', 'Har xil (род.)', NULL),
  ('kunlik-oqish-12', 'людях', 'людях', 'Odamlar haqida', NULL),
  ('kunlik-oqish-12', 'преподаватель', 'преподаватель', 'O‘qituvchi', NULL),
  ('kunlik-oqish-12', 'спросил', 'спросил', 'So‘radi', NULL),
  ('kunlik-oqish-12', 'семье', 'семье', 'Oilada', NULL),
  ('kunlik-oqish-12', 'рассказал', 'рассказал', 'So‘zlab berdim', NULL),
  ('kunlik-oqish-12', 'маме', 'маме', 'Onam haqida', NULL),
  ('kunlik-oqish-12', 'папе', 'папе', 'Dadam haqida', NULL),
  ('kunlik-oqish-12', 'сестре', 'сестре', 'Singlim haqida', NULL),
  ('kunlik-oqish-12', 'друге', 'друге', 'Do‘st haqida', NULL),
  ('kunlik-oqish-12', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-12', 'Петербурге', 'петербурге', 'Peterburgda', NULL),
  ('kunlik-oqish-12', 'думаем', 'думаем', 'O‘ylaymiz', NULL),
  ('kunlik-oqish-12', 'Учитель', 'учитель', 'O‘qituvchi', NULL),
  ('kunlik-oqish-12', 'хорошие', 'хорошие', 'Yaxshi', NULL),
  ('kunlik-oqish-12', 'друзья', 'друзья', 'Do‘stlar', NULL),
  ('kunlik-oqish-12', 'знаете', 'знаете', 'Bilasiz', NULL),
  ('kunlik-oqish-12', 'родителях', 'родителях', 'Ota-onam haqida', NULL),
  ('kunlik-oqish-12', 'будущем', 'будущем', 'Kelajak haqida', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (12, 0, 'Siz kim haqida gapiryapsiz? – Men do‘stim haqida gapiryapman.', 'О ком вы говорите? – Я говорю о своём друге.'),
  (12, 1, 'U o‘zi haqida ko‘p o‘ylaydi.', 'Он много думает о себе.'),
  (12, 2, 'Biz siz haqingizda yaxshi gaplarni eshitdik.', 'Мы слышали о вас хорошие слова.'),
  (12, 3, 'Unda (uning ichida) kuch bor.', 'В нём есть сила.'),
  (12, 4, 'Ular haqida nima deysiz?', 'Что вы скажете о них?'),
  (12, 5, 'Menda hech qanday shubha yo‘q.', 'Во мне нет никаких сомнений.'),
  (12, 6, 'Sening ichingda juda ko‘p sabr bor.', 'В тебе очень много терпения.'),
  (12, 7, 'Biz siz haqingizda tez-tez gaplashamiz.', 'Мы часто говорим о вас.'),
  (12, 8, 'U haqida hamma narsani bilaman.', 'Я знаю о нём всё.'),
  (12, 9, 'O‘qituvchi talabalar haqida qayg‘uradi.', 'Преподаватель беспокоится о студентах.');

-- ---------- Kun 13 ----------
DELETE FROM public.daily_practice_prompts WHERE day_number = 13;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 13
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 13;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 13;

DELETE FROM public.daily_vocab_words WHERE day_number = 13;

DELETE FROM public.daily_grammar_matches WHERE day_number = 13;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 13;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 13;
DELETE FROM public.daily_grammar_topics WHERE day_number = 13;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  13,
  'На чём? Vaqt (oy, yil, hafta)',
  $theory$
На чём? — transport: на автобусе, на метро, на поезде, на самолёте…

Vaqt: в мае, в 2024 году; на этой неделе, на каникулах.

Oy nomlari predlog qatorida: в январе … в декабре.

Transport uchun ko‘pincha НА; oy va yil uchun ko‘pincha В (shu mavzuda).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (13, 'rule', 0, '«Transportda» savoli?', 'на чём?', 'о чём?', 'в чём?', 'к чему?', 0),
  (13, 'rule', 1, '«Metro» bilan?', 'в метро', 'на метро', 'под метро', 'о метро', 1),
  (13, 'rule', 2, '«Автобус»?', 'в автобусе', 'на автобусе', 'об автобусе', 'при автобусе', 1),
  (13, 'rule', 3, '«Самолёт»?', 'в самолёте', 'на самолёте', 'о самолёте', 'самолётом', 1),
  (13, 'rule', 4, '«May oyida»?', 'в мае', 'в маю', 'на мае', 'о мае', 0),
  (13, 'rule', 5, 'Tug‘ilgan kun … (sentabr)', 'в сентябре', 'на сентябре', 'в сентябрь', 'о сентябре', 0),
  (13, 'rule', 6, '2024 yil?', 'в 2024 году', 'в 2024 годе', 'на 2024 году', 'в 2024 год', 0),
  (13, 'rule', 7, '«Hafta»?', 'в неделе', 'на неделе', 'о неделе', 'неделей', 1),
  (13, 'rule', 8, '«Я люблю ездить …» (mashina)', 'на машине', 'в машине', 'о машине', 'машине', 0),
  (13, 'rule', 9, 'Qaysi oy? — dekabr', 'Сейчас декабрь.', 'Сейчас в декабре.', 'Сейчас декабрём.', 'Сейчас о декабре.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (13, 0, 0, 'Автобус', 'на автобусе'),
  (13, 0, 1, 'Трамвай', 'на трамвае'),
  (13, 0, 2, 'Троллейбус', 'на троллейбусе'),
  (13, 0, 3, 'Поезд', 'на поезде'),
  (13, 0, 4, 'Самолёт', 'на самолёте'),
  (13, 0, 5, 'Корабль', 'на корабле'),
  (13, 0, 6, 'Метро', 'на метро'),
  (13, 0, 7, 'Машина', 'на машине'),
  (13, 0, 8, 'Велосипед', 'на велосипеде'),
  (13, 0, 9, 'Такси', 'на такси');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (13, 0, 'uz', '(я, еду, на, автобус)', ARRAY['Я', 'еду', 'на', 'автобусе.', 'в', 'метро'], 'Я еду на автобусе.'),
  (13, 1, 'uz', '(мы, поедем, на, поезд)', ARRAY['Мы', 'поедем', 'на', 'поезде.', 'в', 'город'], 'Мы поедем на поезде.'),
  (13, 2, 'uz', '(он, родился, в, май)', ARRAY['Он', 'родился', 'в', 'мае.', 'на', 'июне'], 'Он родился в мае.'),
  (13, 3, 'uz', '(встретимся, на, следующая, неделя)', ARRAY['Встретимся', 'на', 'следующей', 'неделе.', 'в', 'понедельник'], 'Встретимся на следующей неделе.'),
  (13, 4, 'uz', '(она, любит, путешествовать, на, самолёт)', ARRAY['Она', 'любит', 'путешествовать', 'на', 'самолёте.', 'в', 'поезде'], 'Она любит путешествовать на самолёте.'),
  (13, 5, 'uz', '(я, приехал, в, 2020, год)', ARRAY['Я', 'приехал', 'в', '2020', 'году.', 'на', 'метро'], 'Я приехал в 2020 году.'),
  (13, 6, 'uz', '(дети, катаются, на, велосипед)', ARRAY['Дети', 'катаются', 'на', 'велосипеде.', 'в', 'парке'], 'Дети катаются на велосипеде.'),
  (13, 7, 'uz', '(мы, были, на, каникулы, в, июнь)', ARRAY['Мы', 'были', 'на', 'каникулах', 'в', 'июне.', 'мае'], 'Мы были на каникулах в июне.'),
  (13, 8, 'uz', '(сколько, стоит, билет, на, поезд)', ARRAY['Сколько', 'стоит', 'билет', 'на', 'поезд?', 'в', 'метро'], 'Сколько стоит билет на поезд?'),
  (13, 9, 'uz', '(зимние, каникулы, начнутся, в, декабрь)', ARRAY['Зимние', 'каникулы', 'начнутся', 'в', 'декабре.', 'на', 'январе'], 'Зимние каникулы начнутся в декабре.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (13, 0, 'Nimada? (transport)', 'На чём?'),
  (13, 1, 'Avtobus', 'Автобус'),
  (13, 2, 'Tramvay', 'Трамвай'),
  (13, 3, 'Trolleybus', 'Троллейбус'),
  (13, 4, 'Metro', 'Метро'),
  (13, 5, 'Poyezd', 'Поезд'),
  (13, 6, 'Samolyot', 'Самолёт'),
  (13, 7, 'Kema', 'Корабль'),
  (13, 8, 'Mashina', 'Машина'),
  (13, 9, 'Velosiped', 'Велосипед'),
  (13, 10, 'Qachon? (oy)', 'В каком месяце?'),
  (13, 11, 'Yil', 'Год'),
  (13, 12, 'Hafta', 'Неделя'),
  (13, 13, 'Ta’til', 'Каникулы'),
  (13, 14, 'Tez', 'Быстро');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  13,
  'Как я езжу в университет',
  $body$
Каждое утро я езжу в университет. Обычно я езжу на автобусе или на трамвае. Мой дом находится в спальном районе, а университет – в центре. Когда я спешу, я еду на метро. Это быстро.

В прошлом году я купил машину. Теперь иногда я езжу на машине. Но в пробках это долго. В следующем году я хочу поехать в путешествие на поезде. Мне нравится смотреть в окно в поезде.

А вы на чём любите ездить?
$body$,
  'kunlik-oqish-13'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-13', 'Каждое', 'каждое', 'Har bir', NULL),
  ('kunlik-oqish-13', 'утро', 'утро', 'Ertalab', NULL),
  ('kunlik-oqish-13', 'езжу', 'езжу', 'Boraman (takroriy)', NULL),
  ('kunlik-oqish-13', 'Обычно', 'обычно', 'Odatda', NULL),
  ('kunlik-oqish-13', 'автобусе', 'автобусе', 'Avtobusda', NULL),
  ('kunlik-oqish-13', 'трамвае', 'трамвае', 'Tramvayda', NULL),
  ('kunlik-oqish-13', 'районе', 'районе', 'Tumanda', NULL),
  ('kunlik-oqish-13', 'центре', 'центре', 'Markazda', NULL),
  ('kunlik-oqish-13', 'спешу', 'спешу', 'Shoshilaman', NULL),
  ('kunlik-oqish-13', 'метро', 'метро', 'Metropolitenda', NULL),
  ('kunlik-oqish-13', 'прошлом', 'прошлом', 'O‘tgan', NULL),
  ('kunlik-oqish-13', 'купил', 'купил', 'Sotib oldim', NULL),
  ('kunlik-oqish-13', 'машину', 'машину', 'Mashina (vin.)', NULL),
  ('kunlik-oqish-13', 'пробках', 'пробках', 'Tirbandlikda', NULL),
  ('kunlik-oqish-13', 'следующем', 'следующем', 'Kelgusi', NULL),
  ('kunlik-oqish-13', 'путешествие', 'путешествие', 'Sayohat', NULL),
  ('kunlik-oqish-13', 'нравится', 'нравится', 'Yoqtadi', NULL),
  ('kunlik-oqish-13', 'окно', 'окно', 'Deraza', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (13, 0, 'Siz ishga nimada borasiz? – Men avtobusda boraman.', 'На чём вы ездите на работу? – Я езжу на автобусе.'),
  (13, 1, 'U qachon tug‘ilgan? – U mart oyida tug‘ilgan.', 'Когда он родился? – Он родился в марте.'),
  (13, 2, 'Kelasi haftada qaytib kelaman.', 'Я вернусь на следующей неделе.'),
  (13, 3, 'Qishgi ta’tilda men tog‘larga bordim.', 'На зимних каникулах я ездил в горы.'),
  (13, 4, 'Ustozim 1985 yilda universitetni bitirgan.', 'Мой учитель окончил университет в 1985 году.'),
  (13, 5, 'Bugun men taksida keldim.', 'Сегодня я приехал на такси.'),
  (13, 6, 'Bolalar maktabga piyoda boradilar.', 'Дети ходят в школу пешком.'),
  (13, 7, 'Biz yozda dengizga poyezdda bordik.', 'Летом мы ездили на море на поезде.'),
  (13, 8, 'Tez orada samolyotda uchamiz.', 'Скоро мы полетим на самолёте.'),
  (13, 9, 'U metroning qayerda ekanligini so‘radi.', 'Он спросил, где находится метро.');

-- ---------- Kun 14 ----------
DELETE FROM public.daily_practice_prompts WHERE day_number = 14;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 14
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 14;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 14;

DELETE FROM public.daily_vocab_words WHERE day_number = 14;

DELETE FROM public.daily_grammar_matches WHERE day_number = 14;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 14;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 14;
DELETE FROM public.daily_grammar_topics WHERE day_number = 14;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  14,
  'Предлог «О»: о ком? о чём?',
  $theory$
О + kim yoki nima haqida gap: Я думаю о маме. Мы говорим о работе.

Об + unli bilan boshlangan so‘z: об учёбе, об Ане.

Обо мне, обо всём, обо всех — maxsus shakllar.

Ko‘p fe‘llar: думать, говорить, рассказывать, спрашивать, писать, читать, мечтать, забывать — о ком? / о чём?
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (14, 'rule', 0, '«Men onam haqida o‘ylayman»?', 'Я думаю на маму.', 'Я думаю о маме.', 'Я думаю маму.', 'Я думаю у мамы.', 1),
  (14, 'rule', 1, '«О чём вы говорите?» nimani so‘raydi?', 'Kim?', 'Nima?', 'Qayerda?', 'Qachon?', 1),
  (14, 'rule', 2, 'Qayerda «об» kerak?', 'о работе', 'о учёбе', 'об учёбе', 'о ученике', 2),
  (14, 'rule', 3, '«Обо мне»?', 'Men haqimda', 'Sen', 'U', 'Biz', 0),
  (14, 'rule', 4, 'Qaysi fe‘l «о» bilan emas?', 'думать', 'говорить', 'работать', 'мечтать', 2),
  (14, 'rule', 5, '«Я мечтаю …» (sayohat)', 'на путешествие', 'в путешествии', 'о путешествии', 'путешествием', 2),
  (14, 'rule', 6, 'Qaysi gapda xato?', 'думать о родителях', 'рассказывать о друге', 'говорить о проблема', 'писать о природе', 2),
  (14, 'rule', 7, '«О студентах» — qaysi kelishik?', 'именительный', 'родительный', 'дательный', 'предложный', 3),
  (14, 'rule', 8, '«Hamma narsa haqida»?', 'о всём', 'о всего', 'об всего', 'обо всём', 3),
  (14, 'rule', 9, '«Ты думаешь …?» (sen)', 'о ты', 'о тебе', 'о тобой', 'о тебя', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (14, 0, 0, 'Думать', 'о маме'),
  (14, 0, 1, 'Говорить', 'о работе'),
  (14, 0, 2, 'Рассказывать', 'о фильме'),
  (14, 0, 3, 'Мечтать', 'о море'),
  (14, 0, 4, 'Писать', 'о будущем'),
  (14, 0, 5, 'Спрашивать', 'о студентах'),
  (14, 0, 6, 'Читать', 'о книге'),
  (14, 0, 7, 'Слышать', 'о новостях'),
  (14, 0, 8, 'Забывать', 'о встрече'),
  (14, 0, 9, 'Узнавать', 'о городе');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (14, 0, 'uz', '(я, думаю, о, книга)', ARRAY['Я', 'думаю', 'о', 'книге.', 'фильме', 'работу'], 'Я думаю о книге.'),
  (14, 1, 'uz', '(мы, говорили, о, фильм)', ARRAY['Мы', 'говорили', 'о', 'фильме.', 'кино', 'на'], 'Мы говорили о фильме.'),
  (14, 2, 'uz', '(он, рассказал, о, своя, семья)', ARRAY['Он', 'рассказал', 'о', 'своей', 'семье.', 'друге'], 'Он рассказал о своей семье.'),
  (14, 3, 'uz', '(преподаватель, спрашивает, о, домашнее задание)', ARRAY['Преподаватель', 'спрашивает', 'о', 'домашнем', 'задании.', 'уроке'], 'Преподаватель спрашивает о домашнем задании.'),
  (14, 4, 'uz', '(она, мечтает, о, путешествие)', ARRAY['Она', 'мечтает', 'о', 'путешествии.', 'море', 'работа'], 'Она мечтает о путешествии.'),
  (14, 5, 'uz', '(я, забыл, о, встреча)', ARRAY['Я', 'забыл', 'о', 'встрече.', 'урок', 'фильм'], 'Я забыл о встрече.'),
  (14, 6, 'uz', '(мы, читали, о, космос)', ARRAY['Мы', 'читали', 'о', 'космосе.', 'книге', 'море'], 'Мы читали о космосе.'),
  (14, 7, 'uz', '(ты, что, думаешь, о, это)', ARRAY['Что', 'ты', 'думаешь', 'об', 'этом?', 'она'], 'Что ты думаешь об этом?'),
  (14, 8, 'uz', '(напиши, о, свой, город)', ARRAY['Напиши', 'о', 'своём', 'городе.', 'Москве', 'работе'], 'Напиши о своём городе.'),
  (14, 9, 'uz', '(все, говорят, о, он)', ARRAY['Все', 'говорят', 'о', 'нём.', 'ней', 'нас'], 'Все говорят о нём.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (14, 0, 'Nima haqida?', 'О чём?'),
  (14, 1, 'Kim haqida?', 'О ком?'),
  (14, 2, 'O‘ylamoq', 'Думать'),
  (14, 3, 'Gapirmoq', 'Говорить'),
  (14, 4, 'Aytib bermoq', 'Рассказывать'),
  (14, 5, 'Yozmoq', 'Писать'),
  (14, 6, 'O‘qimoq (haqida)', 'Читать (о чём?)'),
  (14, 7, 'Orzu qilmoq', 'Мечтать'),
  (14, 8, 'So‘ramoq', 'Спрашивать'),
  (14, 9, 'Unutmoq', 'Забывать'),
  (14, 10, 'Eshitmoq', 'Слышать'),
  (14, 11, 'Kelajak', 'Будущее'),
  (14, 12, 'Sayohat', 'Путешествие'),
  (14, 13, 'Kashfiyot', 'Открытие'),
  (14, 14, 'Muhim masala', 'Важный вопрос');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  14,
  'О чём мы говорили на уроке?',
  $body$
Вчера на уроке мы долго говорили о разных вещах. Сначала преподаватель рассказал о своём детстве. Он сказал, что всегда мечтал о море. Потом мы спросили о его работе. Он ответил: «Моя работа – это моя любовь. Я всегда думаю о своих студентах».

А потом мы писали сочинение о каникулах. Я написал о поездке к бабушке. Она живёт в деревне. Я никогда не забываю о ней. После урока друзья спрашивали меня о планах на лето. Я ответил: «Я хочу узнать о новых странах».

А о чём вы любите говорить?
$body$,
  'kunlik-oqish-14'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-14', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-14', 'вещах', 'вещах', 'Narsalar haqida', NULL),
  ('kunlik-oqish-14', 'детстве', 'детстве', 'Bolalikda', NULL),
  ('kunlik-oqish-14', 'мечтал', 'мечтал', 'Orzu qilgan', NULL),
  ('kunlik-oqish-14', 'море', 'море', 'Dengiz', NULL),
  ('kunlik-oqish-14', 'работе', 'работе', 'Ish haqida', NULL),
  ('kunlik-oqish-14', 'любовь', 'любовь', 'Sevgi', NULL),
  ('kunlik-oqish-14', 'студентах', 'студентах', 'Talabalar haqida', NULL),
  ('kunlik-oqish-14', 'сочинение', 'сочинение', 'Insho', NULL),
  ('kunlik-oqish-14', 'каникулах', 'каникулах', 'Ta’til haqida', NULL),
  ('kunlik-oqish-14', 'поездке', 'поездке', 'Sayohat haqida', NULL),
  ('kunlik-oqish-14', 'бабушке', 'бабушке', 'Buvimga', NULL),
  ('kunlik-oqish-14', 'деревне', 'деревне', 'Qishloqda', NULL),
  ('kunlik-oqish-14', 'забываю', 'забываю', 'Unutmayman', NULL),
  ('kunlik-oqish-14', 'планах', 'планах', 'Rejalar', NULL),
  ('kunlik-oqish-14', 'странах', 'странах', 'Mamlakatlar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (14, 0, 'Siz nima haqida o‘ylayapsiz? – Men kelajak haqida o‘ylayapman.', 'О чём вы думаете? – Я думаю о будущем.'),
  (14, 1, 'U menga o‘z sayohati haqida gapirib berdi.', 'Он рассказал мне о своём путешествии.'),
  (14, 2, 'Keling, bugungi yangiliklar haqida gaplashaylik.', 'Давайте поговорим о сегодняшних новостях.'),
  (14, 3, 'Siz qanday kino haqida yozyapsiz?', 'О каком фильме вы пишете?'),
  (14, 4, 'Men hech qachon u haqida eshitmaganman.', 'Я никогда не слышал о нём.'),
  (14, 5, 'Bu kitob qadimgi sivilizatsiyalar haqida.', 'Эта книга о древних цивилизациях.'),
  (14, 6, 'O‘qituvchi muhim masala haqida gapirdi.', 'Учитель говорил о важном вопросе.'),
  (14, 7, 'Sen qaysi futbolchi haqida so‘rayapsan?', 'О каком футболисте ты спрашиваешь?'),
  (14, 8, 'Men bu kashfiyot haqida gazetada o‘qiganman.', 'Я читал об этом открытии в газете.'),
  (14, 9, 'Kechirasiz, men uchrashuv haqida unutib qo‘ydim.', 'Извините, я забыл о встрече.');

-- ---------- Kun 15 (takrorlash 11–14) ----------
DELETE FROM public.daily_practice_prompts WHERE day_number = 15;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 15
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 15;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 15;

DELETE FROM public.daily_vocab_words WHERE day_number = 15;

DELETE FROM public.daily_grammar_matches WHERE day_number = 15;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 15;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 15;
DELETE FROM public.daily_grammar_topics WHERE day_number = 15;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  15,
  'Predlog qatori — takrorlash (11–14)',
  $theory$
Где? — В / НА + предложный: в городе, на заводе, на улице.

На чём? — НА + транспорт: на автобусе.

Когда? — в мае, в 2025 году; на этой неделе.

О ком? О чём? — О / об / обо + предложный: о маме, об учёбе, обо мне.

Шахслар: обо мне, о тебе, о нём, о ней, о нас, о вас, о них; во мне, в тебе, в нём…

Oxirlar: −Е / −И (аудитория → в аудитории).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (15, 'rule', 0, '«Qayerda?» javobi qaysi kelishik?', 'именительный', 'родительный', 'дательный', 'предложный', 3),
  (15, 'rule', 1, 'Qaysi so‘z −И bilan?', 'в доме', 'в городе', 'в аудитории', 'в музее', 2),
  (15, 'rule', 2, '«Tramvay»?', 'в трамвае', 'на трамвае', 'о трамвае', 'трамваем', 1),
  (15, 'rule', 3, '«Москва» predlog qatori?', 'Москва', 'Москве', 'Москвой', 'Москву', 1),
  (15, 'rule', 4, '«Mehmonxona haqida»?', 'о гостинице', 'о гостиницу', 'на гостинице', 'в гостинице', 0),
  (15, 'rule', 5, '«1990 yilda tug‘ilgan»?', 'в 1990 годе', 'в 1990 году', 'на 1990 году', 'о 1990 годе', 1),
  (15, 'rule', 6, '«U (erkak) haqida» olmosh?', 'о нём', 'о ней', 'о них', 'обо мне', 0),
  (15, 'rule', 7, '«НА» qayerda to‘g‘ri?', 'на Москве', 'на заводе', 'на аудитории', 'на театре', 1),
  (15, 'rule', 8, '«Biz haqimizda»?', 'о нас', 'о вас', 'о них', 'о мы', 0),
  (15, 'rule', 9, 'Qaysi fe‘l «о» bilan?', 'работать', 'жить', 'думать', 'ехать', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (15, 0, 0, 'Где? (город)', 'в городе'),
  (15, 0, 1, 'На чём? (автобус)', 'на автобусе'),
  (15, 0, 2, 'Когда? (май)', 'в мае'),
  (15, 0, 3, 'О ком? (друг)', 'о друге'),
  (15, 0, 4, 'О чём? (книга)', 'о книге'),
  (15, 0, 5, 'Где? (завод)', 'на заводе'),
  (15, 0, 6, 'На чём? (машина)', 'на машине'),
  (15, 0, 7, 'Когда? (неделя)', 'на следующей неделе'),
  (15, 0, 8, 'О чём? (работа)', 'о работе'),
  (15, 0, 9, 'Где? (школа)', 'в школе');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (15, 0, 'uz', '(я, живу, в, Ташкент)', ARRAY['Я', 'живу', 'в', 'Ташкенте.', 'на', 'Москва'], 'Я живу в Ташкенте.'),
  (15, 1, 'uz', '(мы, едем, на, поезд)', ARRAY['Мы', 'едем', 'на', 'поезде.', 'в', 'автобусе'], 'Мы едем на поезде.'),
  (15, 2, 'uz', '(они, говорят, о, экзамен)', ARRAY['Они', 'говорят', 'об', 'экзамене.', 'в', 'классе'], 'Они говорят об экзамене.'),
  (15, 3, 'uz', '(книга, лежит, на, стол)', ARRAY['Книга', 'лежит', 'на', 'столе.', 'в', 'столе'], 'Книга лежит на столе.'),
  (15, 4, 'uz', '(он, родился, в, апрель)', ARRAY['Он', 'родился', 'в', 'апреле.', 'на', 'мае'], 'Он родился в апреле.'),
  (15, 5, 'uz', '(я, думаю, о, ты)', ARRAY['Я', 'думаю', 'о', 'тебе.', 'в', 'тебе'], 'Я думаю о тебе.'),
  (15, 6, 'uz', '(дети, гуляют, на, улица)', ARRAY['Дети', 'гуляют', 'на', 'улице.', 'в', 'парке'], 'Дети гуляют на улице.'),
  (15, 7, 'uz', '(она, мечтает, о, море)', ARRAY['Она', 'мечтает', 'о', 'море.', 'на', 'море'], 'Она мечтает о море.'),
  (15, 8, 'uz', '(мы, встретимся, на, эта, неделя)', ARRAY['Мы', 'встретимся', 'на', 'этой', 'неделе.', 'в', 'понедельник'], 'Мы встретимся на этой неделе.'),
  (15, 9, 'uz', '(преподаватель, рассказывает, о, он)', ARRAY['Преподаватель', 'рассказывает', 'о', 'нём.', 'ней', 'нас'], 'Преподаватель рассказывает о нём.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (15, 0, 'Qayerda?', 'Где?'),
  (15, 1, 'Nimada? (transport)', 'На чём?'),
  (15, 2, 'Qachon? (oy, yil)', 'Когда?'),
  (15, 3, 'Kim haqida?', 'О ком?'),
  (15, 4, 'Nima haqida?', 'О чём?'),
  (15, 5, 'Markaz', 'Центр'),
  (15, 6, 'Janub', 'Юг'),
  (15, 7, 'Shahar', 'Город'),
  (15, 8, 'Mehmonxona', 'Гостиница'),
  (15, 9, 'Taassurot', 'Впечатление'),
  (15, 10, 'Sayohat', 'Путешествие'),
  (15, 11, 'Dengiz', 'Море'),
  (15, 12, 'Tog‘lar', 'Горы'),
  (15, 13, 'Sayr qilmoq (bo‘ylab)', 'Гулять по (городу)'),
  (15, 14, 'Eslamoq', 'Вспоминать');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  15,
  'Где, на чём, о чём?',
  $body$
Здравствуйте! Меня зовут Рустам. Я живу в небольшом городе на юге России. Каждое утро я езжу на работу на автобусе. Мой офис находится в центре города.

В прошлом году мы с семьёй часто думали о путешествиях. Этим летом мы наконец поехали на поезде в Москву. Мы останавливались в небольшой гостинице в центре столицы.

В Москве мы много гуляли по улицам, ездили на метро и говорили о красоте города.

Сейчас я сижу в своей комнате и пишу этот рассказ о своих впечатлениях. А вы о чём любите вспоминать?
$body$,
  'kunlik-oqish-15'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-15', 'Рустам', 'рустам', 'Rustam', NULL),
  ('kunlik-oqish-15', 'небольшом', 'небольшом', 'Kichkina', NULL),
  ('kunlik-oqish-15', 'юге', 'юге', 'Janubda', NULL),
  ('kunlik-oqish-15', 'работу', 'работу', 'Ishga', NULL),
  ('kunlik-oqish-15', 'офис', 'офис', 'Ofis', NULL),
  ('kunlik-oqish-15', 'путешествиях', 'путешествиях', 'Sayohatlar haqida', NULL),
  ('kunlik-oqish-15', 'летом', 'летом', 'Yozda', NULL),
  ('kunlik-oqish-15', 'наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-15', 'Москву', 'москву', 'Moskvaga', NULL),
  ('kunlik-oqish-15', 'останавливались', 'останавливались', 'To‘xtadik', NULL),
  ('kunlik-oqish-15', 'гостинице', 'гостинице', 'Mehmonxonada', NULL),
  ('kunlik-oqish-15', 'столицы', 'столицы', 'Poytaxtning', NULL),
  ('kunlik-oqish-15', 'гуляли', 'гуляли', 'Sayr qildik', NULL),
  ('kunlik-oqish-15', 'улицам', 'улицам', 'Ko‘chalarga', NULL),
  ('kunlik-oqish-15', 'красоте', 'красоте', 'Go‘zallik', NULL),
  ('kunlik-oqish-15', 'комнате', 'комнате', 'Xonada', NULL),
  ('kunlik-oqish-15', 'рассказ', 'рассказ', 'Hikoya', NULL),
  ('kunlik-oqish-15', 'впечатлениях', 'впечатлениях', 'Taassurotlar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (15, 0, 'Siz qayerda yashaysiz? – Men Toshkentda yashayman.', 'Где вы живёте? – Я живу в Ташкенте.'),
  (15, 1, 'U qanday transportda ishga boradi? – U avtobusda boradi.', 'На чём он ездит на работу? – Он ездит на автобусе.'),
  (15, 2, 'U qachon tug‘ilgan? – U iyul oyida tug‘ilgan.', 'Когда он родился? – Он родился в июле.'),
  (15, 3, 'Siz kim haqida gapiryapsiz? – Men do‘stim haqida gapiryapman.', 'О ком вы говорите? – Я говорю о друге.'),
  (15, 4, 'Kechirasiz, eng yaqin dorixona qayerda?', 'Извините, где ближайшая аптека?'),
  (15, 5, 'Bugun darsda biz qadimgi tarix haqida o‘qidik.', 'Сегодня на уроке мы читали о древней истории.'),
  (15, 6, 'Uning tug‘ilgan kuni qishda, fevral oyida.', 'Его день рождения зимой, в феврале.'),
  (15, 7, 'Men bu haqda hech narsa bilmayman.', 'Я ничего не знаю об этом.'),
  (15, 8, 'Kechqurun biz parkda sayr qilamiz.', 'Вечером мы гуляем в парке.'),
  (15, 9, 'O‘qituvchi bizdan imtihon haqida so‘radi.', 'Учитель спросил нас об экзамене.');
