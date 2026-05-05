-- Kunlik kun 26–30: быть в прошедшем времени, «у меня было», рассказы о прошлом, повторение.

-- ========== Kun 26 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 26;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 26
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 26;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 26;

DELETE FROM public.daily_vocab_words WHERE day_number = 26;

DELETE FROM public.daily_grammar_matches WHERE day_number = 26;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 26;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 26;
DELETE FROM public.daily_grammar_topics WHERE day_number = 26;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  26,
  'Глагол «быть» в прошедшем времени (единственное число)',
  $theory$
O‘tgan zamonda быть shaxsga emas, rod va songa qarab o‘zgaradi. Hozirgi zamonda gapda ko‘pincha yo‘q (Я студент), o‘tgan zamonda esa: был / была / было / были.

**Birlik:** он → был, она → была, оно → было.

**Ko‘plik:** мы, вы, они → были (kun 27 batafsil).

Holat/mavjudlik: Он был дома., Это было интересно., На улице было холодно.

So‘roq: Был ли он на работе?, Была ли она в кино?

«Я не был / я не была» — gapiruvchi jinsiga qarab ikkalasi ham mumkin.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (26, 'rule', 0, '«U (erkak) uyda edi»', 'Он был дома.', 'Она была дома.', 'Он было дома.', 'Он были дома.', 0),
  (26, 'rule', 1, '«U (ayol) maktabda edi»', 'Она был в школе.', 'Она была в школе.', 'Она было в школе.', 'Она были в школе.', 1),
  (26, 'rule', 2, '«Bu qiziqarli edi»', 'Это был интересно.', 'Это была интересно.', 'Это было интересно.', 'Это были интересно.', 2),
  (26, 'rule', 3, 'Qaysi gapda «был» to‘g‘ri?', 'Моя мама был дома.', 'Мой папа был дома.', 'Моя сестра был дома.', 'Мои родители был дома.', 1),
  (26, 'rule', 4, '«Я не был/не была в кино вчера» — qaysi variant to‘g‘ri?', 'Faqat «я не был»', 'Faqat «я не была»', 'Ikkalasi ham mumkin (jinsga qarab)', 'Ikkalasi ham noto‘g‘ri', 2),
  (26, 'rule', 5, '«Kecha siz qayerda edingiz?»', 'Где вы был вчера?', 'Где вы была вчера?', 'Где вы были вчера?', 'Где вы было вчера?', 2),
  (26, 'rule', 6, 'Qaysi variant xato yozilgan?', 'он был', 'она было', 'мы были', 'они были', 1),
  (26, 'rule', 7, '«Vaqt soat ikki edi»', 'Время было два часа.', 'Время был два часа.', 'Время была два часа.', 'Время были два часа.', 0),
  (26, 'rule', 8, '«Сколько тебе лет вчера?» (20 yosh edi)', 'Мне было двадцать лет.', 'Мне был двадцать лет.', 'Мне была двадцать лет.', 'Мне были двадцать лет.', 0),
  (26, 'rule', 9, 'Qaysi gapda «было» to‘g‘ri?', 'На улице было холодно.', 'На улице был холодно.', 'На улице была холодно.', 'На улице были холодно.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (26, 0, 0, 'Он (еркак)', 'был'),
  (26, 0, 1, 'Она', 'была'),
  (26, 0, 2, 'Оно', 'было'),
  (26, 0, 3, 'Мы', 'были'),
  (26, 0, 4, 'Вы (вежливо / мн.)', 'были'),
  (26, 0, 5, 'Они', 'были'),
  (26, 0, 6, 'Я (еркак)', 'был'),
  (26, 0, 7, 'Я (женский род)', 'была'),
  (26, 0, 8, 'Ты (еркак)', 'был'),
  (26, 0, 9, 'Ты (женский род)', 'была');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (26, 0, 'uz', '(я, вчера, был, дома)', ARRAY['Я', 'вчера', 'был', 'дома.', 'была'], 'Я вчера был дома.'),
  (26, 1, 'uz', '(она, не, была, на, уроке)', ARRAY['Она', 'не', 'была', 'на', 'уроке.', 'был'], 'Она не была на уроке.'),
  (26, 2, 'uz', '(это, было, очень, трудно)', ARRAY['Это', 'было', 'очень', 'трудно.', 'были'], 'Это было очень трудно.'),
  (26, 3, 'uz', '(мой, брат, врачом, был)', ARRAY['Мой', 'брат', 'был', 'врачом.', 'была'], 'Мой брат был врачом.'),
  (26, 4, 'uz', '(где, ты, был, вчера, вечером)', ARRAY['Где', 'ты', 'был', 'вчера', 'вечером?', 'была'], 'Где ты был вчера вечером?'),
  (26, 5, 'uz', '(погода, была, хорошая)', ARRAY['Погода', 'была', 'хорошая.', 'было'], 'Погода была хорошая.'),
  (26, 6, 'uz', '(у, меня, не, было, времени)', ARRAY['У', 'меня', 'не', 'было', 'времени.', 'были'], 'У меня не было времени.'),
  (26, 7, 'uz', '(как, у, тебя, были, дела)', ARRAY['Как', 'у', 'тебя', 'были', 'дела?', 'был'], 'Как у тебя были дела?'),
  (26, 8, 'uz', '(вчера, был, интересный, концерт)', ARRAY['Вчера', 'был', 'интересный', 'концерт.', 'была'], 'Вчера был интересный концерт.'),
  (26, 9, 'uz', '(они, не, были, знакомы)', ARRAY['Они', 'не', 'были', 'знакомы.', 'был'], 'Они не были знакомы.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (26, 0, 'Edi (erkak)', 'Был'),
  (26, 1, 'Edi (ayol)', 'Была'),
  (26, 2, 'Edi (o‘rta rod)', 'Было'),
  (26, 3, 'Edilar', 'Были'),
  (26, 4, 'Kecha', 'Вчера'),
  (26, 5, 'Ertalab', 'Утром'),
  (26, 6, 'Kechqurun', 'Вечером'),
  (26, 7, 'Do‘st', 'Друг'),
  (26, 8, 'Quvnoq', 'Весёлый'),
  (26, 9, 'Ob-havo', 'Погода'),
  (26, 10, 'Issiq (ob-havo)', 'Тепло'),
  (26, 11, 'Sovuq (ob-havo)', 'Холодно'),
  (26, 12, 'Mehmonda bo‘lmoq', 'Быть в гостях'),
  (26, 13, 'Xursand', 'Рад'),
  (26, 14, 'Muvaffaqiyatli', 'Удачный');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  26,
  'Вчерашний день',
  $body$
Вчера был очень интересный день. Утром я был в университете. У нас была лекция по истории. Лекция была долгой, но интересной. Потом я встретил своего друга Антона. Он был очень весёлым. Мы вместе пошли в кафе. Там было много народу. Антон заказал кофе, а я — чай.

Погода была прекрасная. Солнце светило ярко. На улице было тепло. Вечером я был в гостях у бабушки. Бабушка была рада меня видеть. Она приготовила мой любимый пирог. День был удачным. Я был счастлив.
$body$,
  'kunlik-oqish-26'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-26', 'лекция', 'лекция', 'Leksiya', NULL),
  ('kunlik-oqish-26', 'истории', 'истории', 'Tarix bo‘yicha', NULL),
  ('kunlik-oqish-26', 'встретил', 'встретил', 'Uchrattim', NULL),
  ('kunlik-oqish-26', 'весёлым', 'весёлым', 'Quvnoq', NULL),
  ('kunlik-oqish-26', 'народу', 'народу', 'Odam', NULL),
  ('kunlik-oqish-26', 'прекрасная', 'прекрасная', 'Ajoyib', NULL),
  ('kunlik-oqish-26', 'гостях', 'гостях', 'Mehmonda', NULL),
  ('kunlik-oqish-26', 'бабушки', 'бабушки', 'Buvimnikida', NULL),
  ('kunlik-oqish-26', 'приготовила', 'приготовила', 'Tayyorladi', NULL),
  ('kunlik-oqish-26', 'счастлив', 'счастлив', 'Baxtli', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (26, 0, 'Kecha men juda charchagan edim.', 'Вчера я был очень уставшим.'),
  (26, 1, 'U qayerda edi? – U uyda edi.', 'Где он был? – Он был дома.'),
  (26, 2, 'Siz kecha konsertda bo‘ldingizmi?', 'Вы были вчера на концерте?'),
  (26, 3, 'Ob-havo ajoyib edi, quyosh porlab turardi.', 'Погода была прекрасная, солнце светило.'),
  (26, 4, 'Mening bolaligim baxtli edi.', 'Моё детство было счастливым.'),
  (26, 5, 'Unda soat necha edi? – Soat besh edi.', 'Который был час? – Было пять часов.'),
  (26, 6, 'Sinfda o‘n talaba bor edi.', 'В классе было десять студентов.'),
  (26, 7, 'Uning ismi nima edi? – Kechirasiz, esimda yo‘q.', 'Как его звали? – Извините, не помню.'),
  (26, 8, 'Bir vaqtlar bu yerda kino teatr bor edi.', 'Когда-то здесь был кинотеатр.'),
  (26, 9, 'Ular bir-birlari bilan tanish emas edilar.', 'Они не были знакомы друг с другом.');

-- ========== Kun 27 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 27;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 27
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 27;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 27;

DELETE FROM public.daily_vocab_words WHERE day_number = 27;

DELETE FROM public.daily_grammar_matches WHERE day_number = 27;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 27;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 27;
DELETE FROM public.daily_grammar_topics WHERE day_number = 27;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  27,
  '«Быть» в прошедшем времени: множественное число',
  $theory$
Ko‘plik shakl: **были** — мы / вы / они.

«Вы» bir kishi (rasmiy) yoki bir necha kishiga: **Вы были правы.**

O‘tgan zamon kontekstlari: вчера, на прошлой неделе, в прошлом году, раньше, когда-то.

Inkor: Они не были в школе.

So‘roq: Были ли они вчера на работе?, Где были вы вчера вечером?

**было + много + род.п.:** Там было много людей.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (27, 'rule', 0, '«Biz teatrda edik»', 'Мы был в театре.', 'Мы была в театре.', 'Мы было в театре.', 'Мы были в театре.', 3),
  (27, 'rule', 1, '«Ular uyda edilar»', 'Они был дома.', 'Они была дома.', 'Они было дома.', 'Они были дома.', 3),
  (27, 'rule', 2, '«Siz haq edingiz»', 'Вы был правы.', 'Вы была правы.', 'Вы было правы.', 'Вы были правы.', 3),
  (27, 'rule', 3, 'Qaysi gapda «были» to‘g‘ri?', 'Мой брат и сестра были в школе.', 'Мой брат и сестра был в школе.', 'Мой брат и сестра была в школе.', 'Мой брат и сестра было в школе.', 0),
  (27, 'rule', 4, 'Inkor (ular darsda emas)', 'Они не было на уроке.', 'Они не были на уроке.', 'Они не была на уроке.', 'Они не был на уроке.', 1),
  (27, 'rule', 5, '«Kecha qayerda edingiz?»', 'Где вы был вчера?', 'Где вы была вчера?', 'Где вы было вчера?', 'Где вы были вчера?', 3),
  (27, 'rule', 6, 'Qaysi variant xato?', 'мы были', 'вы были', 'они были', 'ты были', 3),
  (27, 'rule', 7, '«O‘tgan haftada ob-havo issiq edi»', 'На прошлой неделе погода была тёплая.', 'На прошлой неделе погода был тёплая.', 'На прошлой неделе погода было тёплая.', 'На прошлой неделе погода были тёплая.', 0),
  (27, 'rule', 8, '«Ko‘p odam bor edi»', 'Там было много людей.', 'Там был много людей.', 'Там была много людей.', 'Там были много людей.', 0),
  (27, 'rule', 9, '«Bir vaqtlar qalin o‘rmon bor edi»', 'Когда-то здесь был густой лес.', 'Когда-то здесь была густой лес.', 'Когда-то здесь было густой лес.', 'Когда-то здесь были густой лес.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (27, 0, 0, 'Вчера мы …', 'были в кино.'),
  (27, 0, 1, 'На прошлой неделе они …', 'были на экскурсии.'),
  (27, 0, 2, 'Там …', 'было много народу.'),
  (27, 0, 3, 'Вы …', 'были правы.'),
  (27, 0, 4, 'Моя сестра …', 'была счастлива.'),
  (27, 0, 5, 'Мой брат и я …', 'дома.'),
  (27, 0, 6, 'Вчера вечером …', 'было холодно.'),
  (27, 0, 7, 'Почему вы не …', 'были на уроке?'),
  (27, 0, 8, 'Они когда-то …', 'были друзьями.'),
  (27, 0, 9, 'Раньше здесь …', 'был парк.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (27, 0, 'uz', '(мы, вчера, были, в, парке)', ARRAY['Мы', 'вчера', 'были', 'в', 'парке.', 'был'], 'Мы вчера были в парке.'),
  (27, 1, 'uz', '(вы, где, были, в, воскресенье)', ARRAY['Где', 'вы', 'были', 'в', 'воскресенье?', 'был'], 'Где вы были в воскресенье?'),
  (27, 2, 'uz', '(они, не, были, на, работе, вчера)', ARRAY['Они', 'не', 'были', 'на', 'работе', 'вчера.', 'был'], 'Они не были на работе вчера.'),
  (27, 3, 'uz', '(на, улице, было, много, людей)', ARRAY['На', 'улице', 'было', 'много', 'людей.', 'были'], 'На улице было много людей.'),
  (27, 4, 'uz', '(мы, были, рады, тебя, видеть)', ARRAY['Мы', 'были', 'рады', 'тебя', 'видеть.', 'рад'], 'Мы были рады тебя видеть.'),
  (27, 5, 'uz', '(вы, когда-то, были, в, Москве)', ARRAY['Вы', 'когда-то', 'были', 'в', 'Москве?', 'был'], 'Вы когда-то были в Москве?'),
  (27, 6, 'uz', '(они, были, очень, уставшими, после, дороги)', ARRAY['Они', 'были', 'очень', 'уставшими', 'после', 'дороги.', 'был'], 'Они были очень уставшими после дороги.'),
  (27, 7, 'uz', '(в, прошлом, году, мы, были, студентами)', ARRAY['В', 'прошлом', 'году', 'мы', 'были', 'студентами.', 'был'], 'В прошлом году мы были студентами.'),
  (27, 8, 'uz', '(почему, вы, не, были, на, собрании)', ARRAY['Почему', 'вы', 'не', 'были', 'на', 'собрании?', 'был'], 'Почему вы не были на собрании?'),
  (27, 9, 'uz', '(дети, были, счастливы, получить, подарки)', ARRAY['Дети', 'были', 'счастливы', 'получить', 'подарки.', 'был'], 'Дети были счастливы получить подарки.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (27, 0, 'O‘tgan yoz', 'Прошлое лето'),
  (27, 1, 'Ta’til', 'Каникулы'),
  (27, 2, 'Sokin', 'Спокойный'),
  (27, 3, 'Baliq', 'Рыба'),
  (27, 4, 'Ajoyib (otl.)', 'Отличный'),
  (27, 5, 'Suzuvchi', 'Пловец'),
  (27, 6, 'Qirg‘oq bo‘yi', 'Набережная'),
  (27, 7, 'Jonli musiqa', 'Живая музыка'),
  (27, 8, 'Muzqaymoq', 'Мороженое'),
  (27, 9, 'Bir kuni', 'Однажды'),
  (27, 10, 'Tog‘', 'Гора'),
  (27, 11, 'Chiroyli (нареч.)', 'Красиво'),
  (27, 12, 'Surat', 'Фотография'),
  (27, 13, 'Unutilmas', 'Незабываемый'),
  (27, 14, 'Iliqlik', 'Теплота');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  27,
  'Наши каникулы',
  $body$
Прошлым летом мы были в Сочи. Это были самые лучшие каникулы в моей жизни. Мои родители тоже были с нами. Мы все были очень счастливы.

Каждое утро мы были на пляже. Море было тёплым и спокойным. В воде было много рыб. Мой брат был отличным пловцом. Он всегда был первым в море.

По вечерам мы были на набережной. Там было много кафе и музыки. Мы ели мороженое и слушали живую музыку.

Однажды мы были на экскурсии в горы. Там было очень красиво. Мы сделали много фотографий.

Эти каникулы были незабываемыми. Я всегда буду их вспоминать с теплотой.
$body$,
  'kunlik-oqish-27'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-27', 'каникулы', 'каникулы', 'Ta’til', NULL),
  ('kunlik-oqish-27', 'родители', 'родители', 'Ota-ona', NULL),
  ('kunlik-oqish-27', 'пляже', 'пляже', 'Plyajda', NULL),
  ('kunlik-oqish-27', 'спокойным', 'спокойным', 'Sokin', NULL),
  ('kunlik-oqish-27', 'набережной', 'набережной', 'Qirg‘oq bo‘yi', NULL),
  ('kunlik-oqish-27', 'мороженое', 'мороженое', 'Muzqaymoq', NULL),
  ('kunlik-oqish-27', 'экскурсии', 'экскурсии', 'Ekskursiya', NULL),
  ('kunlik-oqish-27', 'фотографий', 'фотографий', 'Suratlar', NULL),
  ('kunlik-oqish-27', 'незабываемыми', 'незабываемыми', 'Unutilmas', NULL),
  ('kunlik-oqish-27', 'вспоминать', 'вспоминать', 'Eslamoq', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (27, 0, 'Siz o‘tgan yozda qayerda edingiz?', 'Где вы были прошлым летом?'),
  (27, 1, 'Biz birga edik va juda xursand edik.', 'Мы были вместе и были очень рады.'),
  (27, 2, 'Ular kecha kechki ovqatda edilarmi?', 'Они были вчера на ужине?'),
  (27, 3, 'Nega siz uchrashuvda bo‘lmadingiz?', 'Почему вы не были на встрече?'),
  (27, 4, 'Bolalar uyda edilarmi? – Ha, ular uyda edilar.', 'Дети были дома? – Да, они были дома.'),
  (27, 5, 'Sizning ota-onangiz yoshligida qanday edilar?', 'Какими были ваши родители в молодости?'),
  (27, 6, 'Uning so‘zlari juda to‘g‘ri edi.', 'Его слова были очень правильными.'),
  (27, 7, 'Bizning rejalarimiz katta edi, lekin amalga oshmadi.', 'Наши планы были большими, но не осуществились.'),
  (27, 8, 'Siz ular bilan tanish edingizmi?', 'Вы были знакомы с ними?'),
  (27, 9, 'Ular haqiqiy do‘stlar edilar, bir-birlarini hech qachon tashlab ketmaganlar.', 'Они были настоящими друзьями, никогда не бросали друг друга.');

-- ========== Kun 28 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 28;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 28
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 28;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 28;

DELETE FROM public.daily_vocab_words WHERE day_number = 28;

DELETE FROM public.daily_grammar_matches WHERE day_number = 28;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 28;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 28;
DELETE FROM public.daily_grammar_topics WHERE day_number = 28;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  28,
  'Оборот «У меня было...» / «У меня не было...»',
  $theory$
**У + род.п.** + был / была / было / были + предмет.

Rod predmetga qarab: У меня **был** компьютер., **была** книга., **было** время., **были** друзья.

Inkor: У меня **не было** машины — keyingi so‘z **родительный падеж**da (машина → машины, друзья → друзей).

**У них не было детей / ребёнка** — kontekstga qarab ikkalasi ham mumkin.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (28, 'rule', 0, '«Menda kompyuter bor edi»', 'У меня был компьютер.', 'У меня была компьютер.', 'У меня было компьютер.', 'У меня были компьютер.', 0),
  (28, 'rule', 1, '«Menda kitob bor edi»', 'У меня был книга.', 'У меня была книга.', 'У меня было книга.', 'У меня были книга.', 1),
  (28, 'rule', 2, '«Menda vaqt bor edi»', 'У меня был время.', 'У меня была время.', 'У меня было время.', 'У меня были время.', 2),
  (28, 'rule', 3, 'Inkor (menda mashina yo‘q edi)', 'У меня не было машины.', 'У меня не был машины.', 'У меня не была машины.', 'У меня не было машина.', 0),
  (28, 'rule', 4, '«Ularda do‘stlar bor edi»', 'У них были друзья.', 'У них было друзья.', 'У них была друзья.', 'У них был друзья.', 0),
  (28, 'rule', 5, '«Senda muammo bor edimi?»', 'У тебя была проблема?', 'У тебя был проблема?', 'У тебя было проблема?', 'У тебя были проблема?', 0),
  (28, 'rule', 6, '«Unda vaqt yo‘q edi»', 'У него не было времени.', 'У него не был времени.', 'У него не была времени.', 'У него не было время.', 0),
  (28, 'rule', 7, '«Menda muammo bor edi»', 'У меня была проблема.', 'У меня был проблема.', 'У меня было проблема.', 'У меня были проблема.', 0),
  (28, 'rule', 8, '«Bizda ozgina vaqt bor edi»', 'У нас было мало времени.', 'У нас был мало времени.', 'У нас была мало времени.', 'У нас были мало времени.', 0),
  (28, 'rule', 9, '«Ularda bola yo‘q edi»', 'У них не было детей.', 'У них не было ребёнка.', 'Ikkala variant ham mumkin (kontekstga qarab)', 'Faqat «не было дом» xato', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (28, 0, 0, 'У меня (компьютер)', 'был компьютер'),
  (28, 0, 1, 'У меня (книга)', 'была книга'),
  (28, 0, 2, 'У меня (время)', 'было время'),
  (28, 0, 3, 'У меня (друзья)', 'были друзья'),
  (28, 0, 4, 'У тебя (машина)', 'была машина'),
  (28, 0, 5, 'У неё (работа)', 'была интересная работа'),
  (28, 0, 6, 'У него (квартира)', 'была квартира'),
  (28, 0, 7, 'У нас (проблемы)', 'были проблемы'),
  (28, 0, 8, 'У вас (идея)', 'была идея'),
  (28, 0, 9, 'У них (деньги)', 'были деньги');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (28, 0, 'uz', '(у, меня, была, интересная, книга)', ARRAY['У', 'меня', 'была', 'интересная', 'книга.', 'был'], 'У меня была интересная книга.'),
  (28, 1, 'uz', '(у, тебя, были, друзья, в, школе)', ARRAY['У', 'тебя', 'были', 'друзья', 'в', 'школе?', 'был'], 'У тебя были друзья в школе?'),
  (28, 2, 'uz', '(у, него, не, было, времени)', ARRAY['У', 'него', 'не', 'было', 'времени.', 'были'], 'У него не было времени.'),
  (28, 3, 'uz', '(у, нас, была, большая, семья)', ARRAY['У', 'нас', 'была', 'большая', 'семья.', 'был'], 'У нас была большая семья.'),
  (28, 4, 'uz', '(у, них, были, проблемы, с, деньгами)', ARRAY['У', 'них', 'были', 'проблемы', 'с', 'деньгами.', 'был'], 'У них были проблемы с деньгами.'),
  (28, 5, 'uz', '(у, вас, был, выбор)', ARRAY['У', 'вас', 'был', 'выбор.', 'была'], 'У вас был выбор.'),
  (28, 6, 'uz', '(у, неё, было, красивое, платье)', ARRAY['У', 'неё', 'было', 'красивое', 'платье.', 'были'], 'У неё было красивое платье.'),
  (28, 7, 'uz', '(у, детей, не, было, игрушек)', ARRAY['У', 'детей', 'не', 'было', 'игрушек.', 'были'], 'У детей не было игрушек.'),
  (28, 8, 'uz', '(у, меня, была, мечта)', ARRAY['У', 'меня', 'была', 'мечта.', 'было'], 'У меня была мечта.'),
  (28, 9, 'uz', '(у, них, были, билеты, на, концерт)', ARRAY['У', 'них', 'были', 'билеты', 'на', 'концерт.', 'был'], 'У них были билеты на концерт.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (28, 0, 'Bolalik', 'Детство'),
  (28, 1, 'Kichik', 'Маленький'),
  (28, 2, 'Ajoyib (sifat)', 'Замечательный'),
  (28, 3, 'Sodiq', 'Верный'),
  (28, 4, 'Velosiped', 'Велосипед'),
  (28, 5, 'It', 'Собака'),
  (28, 6, 'Zerikarli', 'Скучно'),
  (28, 7, 'O‘yinchoq', 'Игрушка'),
  (28, 8, 'Yumshoq ayiqcha', 'Плюшевый мишка'),
  (28, 9, 'Qiyinchilik', 'Трудность'),
  (28, 10, 'Qimmat', 'Дорогой'),
  (28, 11, 'Kerak', 'Нужно'),
  (28, 12, 'Mustahkam', 'Крепкий'),
  (28, 13, 'Haqiqiy', 'Настоящий'),
  (28, 14, 'Jasorat', 'Смелость');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  28,
  'Моё детство',
  $body$
Когда я был маленьким, у меня было счастливое детство. У меня были замечательные родители. У моего отца была своя машина. Мы часто ездили за город на пикник.

У меня были верные друзья: Дима и Серёжа. У Димы был новый велосипед, а у Серёжи была собака. Мы всегда были вместе. У нас никогда не было скучно.

В моей комнате было много игрушек. У меня был большой плюшевый мишка. Я его очень любил.

Конечно, у меня были и трудности. У меня не было дорогого телефона, но мне и не нужно было.

Главное — у меня была крепкая семья и настоящие друзья. Вот что действительно важно.
$body$,
  'kunlik-oqish-28'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-28', 'счастливое', 'счастливое', 'Baxtli', NULL),
  ('kunlik-oqish-28', 'родители', 'родители', 'Ota-ona', NULL),
  ('kunlik-oqish-28', 'верные', 'верные', 'Sodiq', NULL),
  ('kunlik-oqish-28', 'велосипед', 'велосипед', 'Velosiped', NULL),
  ('kunlik-oqish-28', 'игрушек', 'игрушек', 'O‘yinchoqlar', NULL),
  ('kunlik-oqish-28', 'трудности', 'трудности', 'Qiyinchiliklar', NULL),
  ('kunlik-oqish-28', 'дорогого', 'дорогого', 'Qimmat', NULL),
  ('kunlik-oqish-28', 'крепкая', 'крепкая', 'Mustahkam', NULL),
  ('kunlik-oqish-28', 'действительно', 'действительно', 'Haqiqatan ham', NULL),
  ('kunlik-oqish-28', 'важно', 'важно', 'Muhim', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (28, 0, 'Bolaligingizda sizning qanday o‘yinchoqlaringiz bor edi?', 'Какие игрушки у вас были в детстве?'),
  (28, 1, 'Unda ishlash uchun yetarlicha tajriba yo‘q edi.', 'У него не было достаточно опыта для работы.'),
  (28, 2, 'Kechirasiz, menda pul yo‘q edi.', 'Извините, у меня не было денег.'),
  (28, 3, 'Uning juda chiroyli ko‘zlari bor edi.', 'У него были очень красивые глаза.'),
  (28, 4, 'Bizda sizning manzilingiz yo‘q edi.', 'У нас не было вашего адреса.'),
  (28, 5, 'Sizningcha, unda buni qilishga jasorat bormidi?', 'Как вы думаете, у него была смелость сделать это?'),
  (28, 6, 'Ularning yagona maqsadi bor edi – g‘alaba qozonish.', 'У них была одна цель – победить.'),
  (28, 7, 'Kechagacha menda hech qanday muammo yo‘q edi.', 'До вчерашнего дня у меня не было никаких проблем.'),
  (28, 8, 'Sizningcha, ularning munosabatlarida kelajak bormidi?', 'Как вы думаете, у них было будущее в отношениях?'),
  (28, 9, 'Mening hayotimda shunday kunlar bor ediki, men ularni eslashni istamayman.', 'В моей жизни были дни, которые я не хочу вспоминать.');

-- ========== Kun 29 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 29;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 29
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 29;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 29;

DELETE FROM public.daily_vocab_words WHERE day_number = 29;

DELETE FROM public.daily_grammar_matches WHERE day_number = 29;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 29;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 29;
DELETE FROM public.daily_grammar_topics WHERE day_number = 29;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  29,
  'Рассказы о прошлом: время и связный текст',
  $theory$
**Vaqt:** вчера, позавчера, на прошлой неделе, в прошлом году, два дня назад, давно, раньше, когда-то.

**Tuzilish:** vaqt → kim → harakat/holat → qayerda → qo‘shimcha.

**Bog‘lovchilar:** сначала, потом, затем, после этого, наконец, но, и, потому что, когда.

“Когда я был маленьким…” — связное повествование uchun asosiy ramka.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (29, 'rule', 0, '«Kecha» rus tilida', 'Завтра', 'Вчера', 'Сегодня', 'Сейчас', 1),
  (29, 'rule', 1, '«O‘tgan haftada»', 'На этой неделе', 'На следующей неделе', 'На прошлой неделе', 'На будущей неделе', 2),
  (29, 'rule', 2, '«Ikki kun oldin»', 'Два дня назад', 'Два дня вперёд', 'Два дня после', 'Два дня до', 0),
  (29, 'rule', 3, '«Avval»', 'Потом', 'Сначала', 'Затем', 'Наконец', 1),
  (29, 'rule', 4, '«Chunki» ma’nosi', 'Когда', 'Но', 'Потому что', 'И', 2),
  (29, 'rule', 5, '«Keyin»', 'Потом', 'Сначала', 'Никогда', 'Всегда', 0),
  (29, 'rule', 6, 'Qaysi tartib hikoya uchun tabiiy?', 'Я встретил друга. Вчера я был в парке.', 'Вчера я был в парке. Я встретил друга. Мы говорили о работе.', 'Я говорил о работе. Мы встретили друга. Вчера.', 'Faqat birinchi gap', 1),
  (29, 'rule', 7, '«Nihoyat»', 'Сначала', 'Наконец', 'Потом', 'Вдруг', 1),
  (29, 'rule', 8, '«Когда» bilan gap', 'Когда я был маленьким, я жил в деревне.', 'Я когда был маленьким, жил в деревне.', 'Я жил в деревне, когда был маленьким.', 'Hammasi mumkin', 3),
  (29, 'rule', 9, '«Ilgari»', 'Позже', 'Раньше', 'Сейчас', 'Потом', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (29, 0, 0, 'Вчера', 'Kecha'),
  (29, 0, 1, 'Позавчера', 'Kecha oldin'),
  (29, 0, 2, 'На прошлой неделе', 'O‘tgan haftada'),
  (29, 0, 3, 'В прошлом году', 'O‘tgan yili'),
  (29, 0, 4, 'Два дня назад', 'Ikki kun oldin'),
  (29, 0, 5, 'Неделю назад', 'Bir hafta oldin'),
  (29, 0, 6, 'Давно', 'Ancha oldin'),
  (29, 0, 7, 'Раньше', 'Ilgari'),
  (29, 0, 8, 'Когда-то', 'Bir vaqtlar'),
  (29, 0, 9, 'Сначала', 'Avval');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (29, 0, 'uz', '(вчера, я, был, в, библиотеке)', ARRAY['Вчера', 'я', 'был', 'в', 'библиотеке.', 'была'], 'Вчера я был в библиотеке.'),
  (29, 1, 'uz', '(на, прошлой, неделе, мы, ездили, в, Москву)', ARRAY['На', 'прошлой', 'неделе', 'мы', 'ездили', 'в', 'Москву.', 'едем'], 'На прошлой неделе мы ездили в Москву.'),
  (29, 2, 'uz', '(сначала, я, завтракал, потом, пошёл, на, работу)', ARRAY['Сначала', 'я', 'завтракал,', 'потом', 'пошёл', 'на', 'работу.', 'иду'], 'Сначала я завтракал, потом пошёл на работу.'),
  (29, 3, 'uz', '(когда, я, был, ребёнком, мы, жили, в, деревне)', ARRAY['Когда', 'я', 'был', 'ребёнком,', 'мы', 'жили', 'в', 'деревне.', 'живём'], 'Когда я был ребёнком, мы жили в деревне.'),
  (29, 4, 'uz', '(два, дня, назад, он, получил, письмо)', ARRAY['Два', 'дня', 'назад', 'он', 'получил', 'письмо.', 'получает'], 'Два дня назад он получил письмо.'),
  (29, 5, 'uz', '(давно, здесь, был, лес)', ARRAY['Давно', 'здесь', 'был', 'лес.', 'были'], 'Давно здесь был лес.'),
  (29, 6, 'uz', '(почему, ты, не, был, на, собрании, вчера)', ARRAY['Почему', 'ты', 'не', 'был', 'на', 'собрании', 'вчера?', 'была'], 'Почему ты не был на собрании вчера?'),
  (29, 7, 'uz', '(я, прочитал, книгу, и, она, мне, очень, понравилась)', ARRAY['Я', 'прочитал', 'книгу,', 'и', 'она', 'мне', 'очень', 'понравилась.', 'понравится'], 'Я прочитал книгу, и она мне очень понравилась.'),
  (29, 8, 'uz', '(мы, хотели, поехать, на, море, но, у, нас, не, было, денег)', ARRAY['Мы', 'хотели', 'поехать', 'на', 'море,', 'но', 'у', 'нас', 'не', 'было', 'денег.', 'есть'], 'Мы хотели поехать на море, но у нас не было денег.'),
  (29, 9, 'uz', '(когда, он, вошёл, все, уже, ушли)', ARRAY['Когда', 'он', 'вошёл,', 'все', 'уже', 'ушли.', 'уйдут'], 'Когда он вошёл, все уже ушли.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (29, 0, 'Sayohat qilmoq', 'Путешествовать'),
  (29, 1, 'Uchmoq', 'Лететь / полететь'),
  (29, 2, 'Kelib tushmoq', 'Прилететь'),
  (29, 3, 'Bulutli', 'Пасмурный'),
  (29, 4, 'O‘zgarmoq', 'Измениться'),
  (29, 5, 'Joylashmoq', 'Поселиться'),
  (29, 6, 'Mehmonxona', 'Гостиница'),
  (29, 7, 'Rasm', 'Картина'),
  (29, 8, 'Favvora', 'Фонтан'),
  (29, 9, 'Afsuski', 'К сожалению'),
  (29, 10, 'Yetarli', 'Достаточно'),
  (29, 11, 'Ko‘rmoq (pf.)', 'Увидеть'),
  (29, 12, 'Safar', 'Поездка'),
  (29, 13, 'Albatta', 'Обязательно'),
  (29, 14, 'Qaytmoq (kelasi)', 'Вернуться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  29,
  'Моё путешествие в Санкт-Петербург',
  $body$
В прошлом году я ездил в Санкт-Петербург. Это было моё первое путешествие в этот город.

Сначала я полетел на самолёте. Когда я прилетел в Петербург, погода была пасмурной. Потом погода изменилась, и выглянуло солнце.

Я поселился в небольшой гостинице в центре города. У меня было три дня, чтобы посмотреть достопримечательности.

В первый день я пошёл в Эрмитаж. Там было очень много картин. Мне очень понравилась экскурсия.

На второй день я гулял по Невскому проспекту. Я видел Казанский собор и Спас-на-Крови.

На третий день я поехал в Петродворец. Фонтаны были прекрасными. К сожалению, у меня не было достаточно времени, чтобы увидеть всё.

Но эта поездка была незабываемой. Я обязательно вернусь туда снова.
$body$,
  'kunlik-oqish-29'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-29', 'путешествие', 'путешествие', 'Sayohat', NULL),
  ('kunlik-oqish-29', 'пасмурной', 'пасмурной', 'Bulutli', NULL),
  ('kunlik-oqish-29', 'гостинице', 'гостинице', 'Mehmonxonada', NULL),
  ('kunlik-oqish-29', 'достопримечательности', 'достопримечательности', 'Diqqatga sazovor joylar', NULL),
  ('kunlik-oqish-29', 'Эрмитаж', 'эрмитаж', 'Ermitaj', NULL),
  ('kunlik-oqish-29', 'проспекту', 'проспекту', 'Ko‘cha bo‘ylab', NULL),
  ('kunlik-oqish-29', 'Фонтаны', 'фонтаны', 'Favvoralar', NULL),
  ('kunlik-oqish-29', 'достаточно', 'достаточно', 'Yetarli', NULL),
  ('kunlik-oqish-29', 'незабываемой', 'незабываемой', 'Unutilmas', NULL),
  ('kunlik-oqish-29', 'вернусь', 'вернусь', 'Qaytaman', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (29, 0, 'Siz qachon oxirgi marta sayohat qilgansiz?', 'Когда вы последний раз путешествовали?'),
  (29, 1, 'O‘tgan yozda qayerda dam oldingiz?', 'Где вы отдыхали прошлым летом?'),
  (29, 2, 'Sayohat sizga yoqdimi? – Ha, juda yoqdi.', 'Вам понравилось путешествие? – Да, очень понравилось.'),
  (29, 3, 'Avval biz muzeyga bordik, keyin parkda sayr qildik.', 'Сначала мы пошли в музей, потом гуляли в парке.'),
  (29, 4, 'Kechirasiz, kech qoldim, chunki yo‘lda tirbandlik bor edi.', 'Извините, я опоздал, потому что в дороге была пробка.'),
  (29, 5, 'Bolaligimda men bog‘da kechgacha o‘ynardim.', 'В детстве я играл в парке до вечера.'),
  (29, 6, 'U bir marta dengizni ko‘rgan va butun umr eslab yurgan.', 'Он один раз увидел море и запомнил на всю жизнь.'),
  (29, 7, 'Kechagi uchrashuv juda muvaffaqiyatli o‘tdi.', 'Вчерашняя встреча прошла очень успешно.'),
  (29, 8, 'Nega siz ularning taklifini rad etdingiz?', 'Почему вы отказались от их предложения?'),
  (29, 9, 'Uyga qaytganimda, allaqachon qorong‘i tushgan edi.', 'Когда я вернулся домой, уже стемнело.');

-- ========== Kun 30 (takrorlash) ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 30;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 30
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 30;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 30;

DELETE FROM public.daily_vocab_words WHERE day_number = 30;

DELETE FROM public.daily_grammar_matches WHERE day_number = 30;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 30;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 30;
DELETE FROM public.daily_grammar_topics WHERE day_number = 30;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  30,
  'Повторение: «быть» в прошедшем времени (kun 26–29)',
  $theory$
**быть:** был / была / было / были — rod va son bilan.

**У меня было / не было** + родительный падеж.

**Vaqt:** вчера, позавчера, на прошлой неделе, в прошлом году, когда-то…

**Bog‘lovchilar:** сначала, потом, затем, наконец, но, и, потому что, когда.

«Когда я был маленьким…» — творительный падеж bilan holat.

Har kuni qisqa hikoya yozing: vaqt + были / было + место.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (30, 'rule', 0, '«Ular kecha teatrda edilar»', 'Они был в театре вчера.', 'Они была в театре вчера.', 'Они было в театре вчера.', 'Они были в театре вчера.', 3),
  (30, 'rule', 1, '«Siz kecha qayerda edingiz?»', 'Где вы был вчера?', 'Где вы была вчера?', 'Где вы было вчера?', 'Где вы были вчера?', 3),
  (30, 'rule', 2, '«Menda vaqt yo‘q edi»', 'У меня не было времени.', 'У меня не был времени.', 'У меня не была времени.', 'У меня не было время.', 0),
  (30, 'rule', 3, '«O‘tgan yili»', 'В прошлом году', 'В этом году', 'В следующем году', 'В будущем году', 0),
  (30, 'rule', 4, '«Avval»', 'Потом', 'Сначала', 'Наконец', 'Вдруг', 1),
  (30, 'rule', 5, '«Kecha juda sovuq edi»', 'Вчера было очень холодно.', 'Вчера был очень холодно.', 'Вчера была очень холодно.', 'Вчера были очень холодно.', 0),
  (30, 'rule', 6, '«Bir vaqtlar»', 'Всегда', 'Никогда', 'Когда-то', 'Сейчас', 2),
  (30, 'rule', 7, '«У меня были красивые глаза»', 'У меня были красивые глаза.', 'У меня был красивые глаза.', 'У меня была красивые глаза.', 'У меня было красивые глаза.', 0),
  (30, 'rule', 8, '«Lekin»', 'И', 'Но', 'Потому что', 'Когда', 1),
  (30, 'rule', 9, 'Qaysi tartib mantiqiy?', 'Наконец, я пришёл домой. Сначала я пошёл в магазин. Потом я встретил друга.', 'Сначала я пошёл в магазин. Потом я встретил друга. Наконец, я пришёл домой.', 'Потом я встретил друга. Сначала я пошёл в магазин. Наконец, я пришёл домой.', 'Hech qaysi tartib mos emas', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (30, 0, 0, 'Вчера я …', 'был в музее.'),
  (30, 0, 1, 'Она не была …', 'на работе вчера.'),
  (30, 0, 2, 'У нас …', 'было мало времени.'),
  (30, 0, 3, 'Почему …', 'у вас не было денег?'),
  (30, 0, 4, 'Когда я был маленьким, …', 'я жил в деревне.'),
  (30, 0, 5, 'Сначала мы пошли в парк, …', 'а потом в кафе.'),
  (30, 0, 6, 'На прошлой неделе …', 'была отличная погода.'),
  (30, 0, 7, 'У неё …', 'было много игрушек.'),
  (30, 0, 8, 'Я не пошёл на прогулку, …', 'потому что я устал.'),
  (30, 0, 9, 'Мои родители …', 'были счастливы.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (30, 0, 'uz', '(вчера, мы, были, в, кинотеатре)', ARRAY['Вчера', 'мы', 'были', 'в', 'кинотеатре.', 'был'], 'Вчера мы были в кинотеатре.'),
  (30, 1, 'uz', '(у, неё, было, красивое, платье)', ARRAY['У', 'неё', 'было', 'красивое', 'платье.', 'были'], 'У неё было красивое платье.'),
  (30, 2, 'uz', '(почему, ты, не, был, на, уроке)', ARRAY['Почему', 'ты', 'не', 'был', 'на', 'уроке?', 'была'], 'Почему ты не был на уроке?'),
  (30, 3, 'uz', '(когда, я, был, студентом, я, жил, в, общежитии)', ARRAY['Когда', 'я', 'был', 'студентом,', 'я', 'жил', 'в', 'общежитии.', 'живу'], 'Когда я был студентом, я жил в общежитии.'),
  (30, 4, 'uz', '(сначала, мы, посмотрели, фильм, потом, поужинали)', ARRAY['Сначала', 'мы', 'посмотрели', 'фильм,', 'потом', 'поужинали.', 'смотрим'], 'Сначала мы посмотрели фильм, потом поужинали.'),
  (30, 5, 'uz', '(на, прошлой, неделе, у, нас, была, контрольная, работа)', ARRAY['На', 'прошлой', 'неделе', 'у', 'нас', 'была', 'контрольная', 'работа.', 'был'], 'На прошлой неделе у нас была контрольная работа.'),
  (30, 6, 'uz', '(у, них, не, было, выбора)', ARRAY['У', 'них', 'не', 'было', 'выбора.', 'были'], 'У них не было выбора.'),
  (30, 7, 'uz', '(два, дня, назад, он, вернулся, из, командировки)', ARRAY['Два', 'дня', 'назад', 'он', 'вернулся', 'из', 'командировки.', 'вернётся'], 'Два дня назад он вернулся из командировки.'),
  (30, 8, 'uz', '(мы, хотели, поехать, на, море, но, у, нас, не, было, денег)', ARRAY['Мы', 'хотели', 'поехать', 'на', 'море,', 'но', 'у', 'нас', 'не', 'было', 'денег.', 'есть'], 'Мы хотели поехать на море, но у нас не было денег.'),
  (30, 9, 'uz', '(когда, я, вошёл, в, комнату, все, уже, спали)', ARRAY['Когда', 'я', 'вошёл', 'в', 'комнату,', 'все', 'уже', 'спали.', 'спят'], 'Когда я вошёл в комнату, все уже спали.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (30, 0, 'Kelmoq (o‘tgan)', 'Приехать'),
  (30, 1, 'Qiyin', 'Трудно'),
  (30, 2, 'Mashq qilmoq', 'Заниматься'),
  (30, 3, 'Asta-sekin', 'Постепенно'),
  (30, 4, 'Paydo bo‘lmoq', 'Появиться'),
  (30, 5, 'Tayyor (sifat)', 'Готов'),
  (30, 6, 'Yordam bermoq', 'Помочь'),
  (30, 7, 'Imtihon topshirmoq', 'Сдать экзамен'),
  (30, 8, 'Jiddiy', 'Серьёзный'),
  (30, 9, 'Muvaffaqiyat', 'Успех'),
  (30, 10, 'Tarjima', 'Перевод'),
  (30, 11, 'Qo‘rqmaslik', 'Не бояться'),
  (30, 12, 'Xato', 'Ошибка'),
  (30, 13, 'Qadam', 'Шаг'),
  (30, 14, 'Tajriba', 'Опыт');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  30,
  'Мои первые шаги в России',
  $body$
Два года назад я приехал в Россию. Сначала было очень трудно. У меня не было друзей, и я плохо говорил по-русски.

Но я много занимался. Каждый день я учил новые слова и повторял грамматику. Постепенно всё стало получаться.

У меня появились друзья: Анна и Сергей. Они всегда были готовы помочь.

На прошлой неделе я сдал экзамен по русскому языку. Это был мой первый серьёзный успех. Я был очень счастлив.

Сейчас я уже хорошо говорю по-русски, читаю книги и смотрю фильмы без перевода.

Я понял, что главное — не бояться ошибок и много работать.

Россия стала моим вторым домом. Я рад, что решился на этот шаг.

Желаю всем удачи!
$body$,
  'kunlik-oqish-30'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-30', 'приехал', 'приехал', 'Keldi', NULL),
  ('kunlik-oqish-30', 'занимался', 'занимался', 'Mashq qildi', NULL),
  ('kunlik-oqish-30', 'грамматику', 'грамматику', 'Grammatika', NULL),
  ('kunlik-oqish-30', 'появились', 'появились', 'Paydo bo‘ldi', NULL),
  ('kunlik-oqish-30', 'экзамен', 'экзамен', 'Imtihon', NULL),
  ('kunlik-oqish-30', 'перевода', 'перевода', 'Tarjimadan', NULL),
  ('kunlik-oqish-30', 'ошибок', 'ошибок', 'Xatolardan', NULL),
  ('kunlik-oqish-30', 'вторым', 'вторым', 'Ikkinchi', NULL),
  ('kunlik-oqish-30', 'решился', 'решился', 'Qaror qildi', NULL),
  ('kunlik-oqish-30', 'удачи', 'удачи', 'Omad', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (30, 0, 'Siz Rossiyaga kelganingizda, rus tilini bilarmidingiz?', 'Когда вы приехали в Россию, вы знали русский язык?'),
  (30, 1, 'Birinchi oylar juda qiyin edi, lekin men taslim bo‘lmadim.', 'Первые месяцы были очень трудными, но я не сдался.'),
  (30, 2, 'Unga qancha vaqt kerak bo‘ldi? – Taxminan bir oy.', 'Сколько времени ему понадобилось? – Около месяца.'),
  (30, 3, 'Sizning birinchi muvaffaqiyatingiz qanday edi?', 'Каким был ваш первый успех?'),
  (30, 4, 'Kechagi imtihondan oldin men juda ko‘p takrorladim.', 'Перед вчерашним экзаменом я много повторял.'),
  (30, 5, 'Ular tilni o‘rganishda katta qiyinchiliklarga duch kelishdi.', 'Они столкнулись с большими трудностями в изучении языка.'),
  (30, 6, 'Asta-sekin men yangi muhitga o‘rgana boshladim.', 'Постепенно я начал привыкать к новой среде.'),
  (30, 7, 'Sizningcha, muvaffaqiyatga erishish uchun nima muhim?', 'Что, по-вашему, важно для достижения успеха?'),
  (30, 8, 'U hech qachon o‘z qaroridan afsuslanmadi.', 'Он никогда не жалел о своём решении.'),
  (30, 9, 'Men ushbu tajribani hech qachon unutmayman.', 'Я никогда не забуду этот опыт.');
