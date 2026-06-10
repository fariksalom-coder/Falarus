-- Kunlik kun 11: Predlog qatori — В / НА («Где?»).

DELETE FROM public.daily_practice_prompts WHERE day_number = 11;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 11
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 11;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 11;

DELETE FROM public.daily_vocab_words WHERE day_number = 11;

DELETE FROM public.daily_grammar_matches WHERE day_number = 11;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 11;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 11;
DELETE FROM public.daily_grammar_topics WHERE day_number = 11;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  11,
  'Predlog qatori: В ва НА',
  $theory$
Предложный падеж — faqat предлог bilan: Где? — qayerda?

В — odatda «ichkarida»: в городе, в школе, в университете, в больнице.

НА — ochiq joy, sirt, tadbir: на улице, на заводе, на работе, на стадионе, на концерте.

Yasalish (qisqa): -а/-я → -е (в Москве); -ь (muz) → -е (в словаре); -ия → -ии (в аудитории).

Eslab qoling: bino ichida — В; maydon / на улице — НА.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (11, 'rule', 0, '«Menda» rus tilida?', 'У меня', 'У тебя', 'У него', 'У нас', 0),
  (11, 'rule', 1, '«Universitetda» — qaysi variant?', 'на университете', 'в университете', 'университетом', 'в университет', 1),
  (11, 'rule', 2, 'Zavod — «на» bilan', 'на заводе', 'на завод', 'в заводе', 'за заводом', 0),
  (11, 'rule', 3, '«Библиотека» — predlog qatori', 'в библиотека', 'в библиотеке', 'в библиотеку', 'в библиотекой', 1),
  (11, 'rule', 4, '«Где работает твоя мама?» (maktabda)', 'Она работает на школе.', 'Она работает в школе.', 'Она работает школу.', 'Она работает школой.', 1),
  (11, 'rule', 5, '«Аудитория» predlog qatorida', 'аудитория', 'аудитории', 'аудиторию', 'аудиторией', 1),
  (11, 'rule', 6, '«На» predlogi qachon?', 'Только внутри здания.', 'На поверхности, на открытой местности.', 'Только направление.', 'Только время.', 1),
  (11, 'rule', 7, '«Вчера мы были …» (teatr)', 'в театре', 'на театре', 'в театр', 'на театр', 0),
  (11, 'rule', 8, 'Kitab stol ustida', 'Книга лежит на столе.', 'Книга лежит в столе.', 'Книга лежит над столом.', 'Книга лежит под столом.', 0),
  (11, 'rule', 9, '«Men Toshkentda yashayman»', 'в Ташкент', 'в Ташкенте', 'на Ташкенте', 'в Ташкенту', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (11, 0, 0, 'Москва', 'в Москве'),
  (11, 0, 1, 'Завод', 'на заводе'),
  (11, 0, 2, 'Университет', 'в университете'),
  (11, 0, 3, 'Школа', 'в школе'),
  (11, 0, 4, 'Работа', 'на работе'),
  (11, 0, 5, 'Больница', 'в больнице'),
  (11, 0, 6, 'Стадион', 'на стадионе'),
  (11, 0, 7, 'Аптека', 'в аптеке'),
  (11, 0, 8, 'Дом', 'в доме'),
  (11, 0, 9, 'Улица', 'на улице');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (11, 0, 'uz', '(я, живу, в, Ташкент)', ARRAY['Я', 'живу', 'в', 'Ташкенте.', 'Москва', 'на'], 'Я живу в Ташкенте.'),
  (11, 1, 'uz', '(мой, брат, учится, в, университет)', ARRAY['Мой', 'брат', 'учится', 'в', 'университете.', 'школе', 'на'], 'Мой брат учится в университете.'),
  (11, 2, 'uz', '(она, работает, на, завод)', ARRAY['Она', 'работает', 'на', 'заводе.', 'в', 'офисе'], 'Она работает на заводе.'),
  (11, 3, 'uz', '(дети, играют, на, улица)', ARRAY['Дети', 'играют', 'на', 'улице.', 'в', 'парке'], 'Дети играют на улице.'),
  (11, 4, 'uz', '(книга, лежит, на, стол)', ARRAY['Книга', 'лежит', 'на', 'столе.', 'в', 'столе'], 'Книга лежит на столе.'),
  (11, 5, 'uz', '(мы, были, в, театр, вчера)', ARRAY['Мы', 'были', 'в', 'театре', 'вчера.', 'на', 'концерте'], 'Мы были в театре вчера.'),
  (11, 6, 'uz', '(где, ты, был, в, воскресенье)', ARRAY['Где', 'ты', 'был', 'в', 'воскресенье?', 'понедельник', 'учился'], 'Где ты был в воскресенье?'),
  (11, 7, 'uz', '(наш, преподаватель, работает, в, школа)', ARRAY['Наш', 'преподаватель', 'работает', 'в', 'школе.', 'университете', 'на'], 'Наш преподаватель работает в школе.'),
  (11, 8, 'uz', '(аптека, находится, на, улица, Мира)', ARRAY['Аптека', 'находится', 'на', 'улице', 'Мира.', 'в', 'центре'], 'Аптека находится на улице Мира.'),
  (11, 9, 'uz', '(студенты, сидят, в, аудитория)', ARRAY['Студенты', 'сидят', 'в', 'аудитории.', 'на', 'уроке'], 'Студенты сидят в аудитории.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (11, 0, 'Qayerda?', 'Где?'),
  (11, 1, 'Shahar', 'Город'),
  (11, 2, 'Markaz', 'Центр'),
  (11, 3, 'Tuman', 'Район'),
  (11, 4, 'Ko‘cha', 'Улица'),
  (11, 5, 'Bino', 'Здание'),
  (11, 6, 'Stol', 'Стол'),
  (11, 7, 'Deraza', 'Окно'),
  (11, 8, 'Sinf', 'Класс'),
  (11, 9, 'Auditoriya', 'Аудитория'),
  (11, 10, 'Kasalxona', 'Больница'),
  (11, 11, 'Zavod', 'Завод'),
  (11, 12, 'Maktab', 'Школа'),
  (11, 13, 'Universitet', 'Университет'),
  (11, 14, 'Dorixona', 'Аптека');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  11,
  'Где я живу и учусь',
  $body$
Привет! Меня зовут Тимур. Я живу в большом городе – в Москве. Москва – это столица России. Я учусь в известном университете. Мой университет находится в центре города. Моя семья живёт в новом районе Москвы. Там есть школа, поликлиника и большой парк.

Моя мама работает в больнице. Она врач. Папа работает на заводе. Он инженер. Мой старший брат учится в школе. Он в девятом классе. А я сейчас в аудитории № 301. Мы читаем текст на уроке русского языка. Здесь всегда интересно.
$body$,
  'kunlik-oqish-11'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-11', 'Привет', 'привет', 'Salom', NULL),
  ('kunlik-oqish-11', 'зовут', 'зовут', 'Chaqirishadi', NULL),
  ('kunlik-oqish-11', 'живу', 'живу', 'Yashayman', NULL),
  ('kunlik-oqish-11', 'большом', 'большом', 'Katta (предл.)', NULL),
  ('kunlik-oqish-11', 'городе', 'городе', 'Shaharda', NULL),
  ('kunlik-oqish-11', 'Москве', 'москве', 'Moskvada', NULL),
  ('kunlik-oqish-11', 'столица', 'столица', 'Poytaxt', NULL),
  ('kunlik-oqish-11', 'России', 'россии', 'Rossiyaning', NULL),
  ('kunlik-oqish-11', 'учусь', 'учусь', 'O‘qiyman', NULL),
  ('kunlik-oqish-11', 'известном', 'известном', 'Mashhur (предл.)', NULL),
  ('kunlik-oqish-11', 'университете', 'университете', 'Universitetda', NULL),
  ('kunlik-oqish-11', 'находится', 'находится', 'Joylashgan', NULL),
  ('kunlik-oqish-11', 'центре', 'центре', 'Markazda', NULL),
  ('kunlik-oqish-11', 'новом', 'новом', 'Yangi (предл.)', NULL),
  ('kunlik-oqish-11', 'районе', 'районе', 'Tumanda', NULL),
  ('kunlik-oqish-11', 'школа', 'школа', 'Maktab', NULL),
  ('kunlik-oqish-11', 'больнице', 'больнице', 'Kasalxonada', NULL),
  ('kunlik-oqish-11', 'врач', 'врач', 'Shifokor', NULL),
  ('kunlik-oqish-11', 'Папа', 'папа', 'Dada', NULL),
  ('kunlik-oqish-11', 'заводе', 'заводе', 'Zavodda', NULL),
  ('kunlik-oqish-11', 'инженер', 'инженер', 'Muhandis', NULL),
  ('kunlik-oqish-11', 'старший', 'старший', 'Katta (aka)', NULL),
  ('kunlik-oqish-11', 'брат', 'брат', 'Aka', NULL),
  ('kunlik-oqish-11', 'школе', 'школе', 'Maktabda', NULL),
  ('kunlik-oqish-11', 'девятом', 'девятом', 'To‘qqizinchi (предл.)', NULL),
  ('kunlik-oqish-11', 'классе', 'классе', 'Sinfda', NULL),
  ('kunlik-oqish-11', 'аудитории', 'аудитории', 'Auditoriyada', NULL),
  ('kunlik-oqish-11', 'читаем', 'читаем', 'O‘qiyapmiz', NULL),
  ('kunlik-oqish-11', 'уроке', 'уроке', 'Darsda', NULL),
  ('kunlik-oqish-11', 'Здесь', 'здесь', 'Bu yerda', NULL),
  ('kunlik-oqish-11', 'интересно', 'интересно', 'Qiziqarli', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (11, 0, 'Siz qayerda yashaysiz? – Men Moskvada yashayman.', 'Где вы живёте? – Я живу в Москве.'),
  (11, 1, 'Uning ukasi qayerda ishlaydi? – U zavodda ishlaydi.', 'Где работает его брат? – Он работает на заводе.'),
  (11, 2, 'Dars qayerda bo‘ladi? – 205-auditoriyada.', 'Где будет урок? – В аудитории 205.'),
  (11, 3, 'Kechirasiz, eng yaqin dorixona qayerda?', 'Извините, где ближайшая аптека?'),
  (11, 4, 'Bizning universitetimiz shahar markazida joylashgan.', 'Наш университет находится в центре города.'),
  (11, 5, 'Siz qaysi maktabda o‘qigansiz?', 'В какой школе вы учились?'),
  (11, 6, 'Kechqurun ko‘chada juda ko‘p odam bor.', 'Вечером на улице очень много людей.'),
  (11, 7, 'U hozir kasalxonada yotibdi.', 'Он сейчас лежит в больнице.'),
  (11, 8, 'Men darsda yangi so‘zlarni yozaman.', 'Я пишу новые слова на уроке.'),
  (11, 9, 'Farzandingiz nechanchi sinfda o‘qiydi?', 'В каком классе учится ваш ребёнок?');
