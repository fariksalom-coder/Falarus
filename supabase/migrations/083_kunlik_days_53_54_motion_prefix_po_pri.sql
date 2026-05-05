-- Kunlik kun 53–54: harakat + приставка по- (пойти/поехать), при- (прийти/приехать).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 53 AND day_number <= 54;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 53 AND day_number <= 54
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 53 AND day_number <= 54;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 53 AND day_number <= 54;

DELETE FROM public.daily_vocab_words WHERE day_number >= 53 AND day_number <= 54;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 53 AND day_number <= 54;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 53 AND day_number <= 54;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 53 AND day_number <= 54;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 53 AND day_number <= 54;

-- ========== Kun 53 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  53,
  'Harakat: по- (пойти / поехать — boshlanish)',
  $theory$
**По-** — harakatning **boshlanishi** yoki bir martalik yo‘nalish (СВ).

**Пойти** — piyoda (kelasi: *пойду, пойдёшь…*; o‘tgan: *пошёл, пошла, пошли*).

**Поехать** — transportda (*поеду…*, *поехал / поехали*).

**Hozirgi zamon yo‘q** — chunki СВ.

**Inkor:** *не пойду*, *не поехал*.

**Farq:** *пойти* vs *поехать*; masofa qisqa bo‘lsa basseyn uchun ko‘pincha *пойду*, uzoqroq bo‘lsa *поеду*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (53, 'rule', 0, '«Ertaga men do‘konga boraman (piyoda, boshlanish)»', 'Я пойду в магазин завтра.', 'Я иду в магазин завтра.', 'Я хожу в магазин завтра.', 'Я пошёл в магазин завтра.', 0),
  (53, 'rule', 1, '«U kecha Moskvaga ketdi (transportda)»', 'Он поехал в Москву вчера.', 'Он пошёл в Москву вчера.', 'Он ехал в Москву вчера.', 'Он ездил в Москву вчера.', 0),
  (53, 'rule', 2, '«Biz yozda Qrimga boramiz»', 'Мы поедем в Крым летом.', 'Мы едем в Крым летом.', 'Мы поехали в Крым летом.', 'Мы ездим в Крым летом.', 0),
  (53, 'rule', 3, '«Sen qayerga ketyapsan?» — kelasi javob', 'Я пойду в кино.', 'Я иду в кино.', 'Я пошёл в кино.', 'Я хожу в кино.', 0),
  (53, 'rule', 4, '«U kecha uchrashuvga bormadi»', 'Он не пошёл на встречу вчера.', 'Он не шёл на встречу вчера.', 'Он не ходил на встречу вчера.', 'Он не идёт на встречу вчера.', 0),
  (53, 'rule', 5, '«Ular kelasi hafta Sankt-Peterburgga borishadi»', 'Они поедут в Санкт-Петербург на следующей неделе.', 'Они поехали в Санкт-Петербург на следующей неделе.', 'Они едут в Санкт-Петербург на следующей неделе.', 'Они ездят в Санкт-Петербург на следующей неделе.', 0),
  (53, 'rule', 6, '«U (ayol) kinoga bordi»', 'Она пошла в кино.', 'Она пошёл в кино.', 'Она пошло в кино.', 'Она пошли в кино.', 0),
  (53, 'rule', 7, '«Siz qachon uydan chiqasiz?» — kelasi', 'Я выйду через час.', 'Я пойду через час.', 'Я иду через час.', 'Я поеду через час.', 1),
  (53, 'rule', 8, '«Ular avtobusda ketishdi (o‘tgan)»', 'Они поехали на автобусе.', 'Они пошли на автобусе.', 'Они ехали на автобусе.', 'Они ездили на автобусе.', 0),
  (53, 'rule', 9, '«Ertaga ertalab basseynga boraman» — qaysi variant aniqroq?', 'Я пойду в бассейн завтра утром.', 'Я поеду в бассейн завтра утром.', 'Часто говорят «пойду», если бассейн рядом, и «поеду», если нужно добираться.', 'Я хожу в бассейн завтра утром.', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (53, 0, 0, 'Men (erkak) kecha teatrga bordim (piyoda).', 'Я пошёл в театр вчера.'),
  (53, 0, 1, 'U (ayol) o‘tgan hafta Moskvaga ketdi.', 'Она поехала в Москву на прошлой неделе.'),
  (53, 0, 2, 'Ertaga men maktabga piyoda boraman.', 'Я завтра пойду в школу пешком.'),
  (53, 0, 3, 'Kecha kechqurun biz vokzalga bordik (transportda).', 'Вчера вечером мы поехали на вокзал.'),
  (53, 0, 4, 'Siz qachon sayohatga ketasiz?', 'Когда вы поедете в путешествие?'),
  (53, 0, 5, 'U kecha ish safariga ketdi.', 'Он поехал в командировку вчера.'),
  (53, 0, 6, 'Men (ayol) allaqachon do‘konga bordimmi (boshlanish)?', 'Я уже пошла в магазин?'),
  (53, 0, 7, 'Biz ertaga parkka boramiz.', 'Мы пойдём в парк завтра.'),
  (53, 0, 8, 'U ertalab ishga ketdi.', 'Он пошёл на работу утром.'),
  (53, 0, 9, 'Siz qayerda ta’til o‘tkazasiz? – Men dengizga boraman.', 'Где вы будете отдыхать? – Я поеду на море.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (53, 0, 'uz', '(я, завтра, пойти, в, библиотека)', ARRAY['Я', 'завтра', 'пойду', 'в', 'библиотеку.', 'иду'], 'Я завтра пойду в библиотеку.'),
  (53, 1, 'uz', '(они, на, прошлой, неделе, поехать, в, деревня)', ARRAY['Они', 'на', 'прошлой', 'неделе', 'поехали', 'в', 'деревню.', 'ездили'], 'Они на прошлой неделе поехали в деревню.'),
  (53, 2, 'uz', '(ты, когда, пойти, к, врач)', ARRAY['Когда', 'ты', 'пойдёшь', 'к', 'врачу?', 'идёшь'], 'Когда ты пойдёшь к врачу?'),
  (53, 3, 'uz', '(мы, поехать, на, море, через, месяц)', ARRAY['Мы', 'поедем', 'на', 'море', 'через', 'месяц.', 'едем'], 'Мы поедем на море через месяц.'),
  (53, 4, 'uz', '(она, не, пойти, на, концерт, вчера)', ARRAY['Она', 'не', 'пошла', 'на', 'концерт', 'вчера.', 'ходила'], 'Она не пошла на концерт вчера.'),
  (53, 5, 'uz', '(вы, куда, поехать, летом)', ARRAY['Куда', 'вы', 'поедете', 'летом?', 'ездите'], 'Куда вы поедете летом?'),
  (53, 6, 'uz', '(можно, я, пойти, в, магазин, сейчас)', ARRAY['Можно', 'мне', 'сейчас', 'пойти', 'в', 'магазин?', 'иду'], 'Можно мне сейчас пойти в магазин?'),
  (53, 7, 'uz', '(дети, поехать, на, экскурсия, с, классом)', ARRAY['Дети', 'поедут', 'на', 'экскурсию', 'с', 'классом.', 'едут'], 'Дети поедут на экскурсию с классом.'),
  (53, 8, 'uz', '(он, пошёл, на, работа, и, забыл, зонт)', ARRAY['Он', 'пошёл', 'на', 'работу', 'и', 'забыл', 'зонт.', 'идёт'], 'Он пошёл на работу и забыл зонт.'),
  (53, 9, 'uz', '(мы, не, поехать, в, горы, потому, что, дождь)', ARRAY['Мы', 'не', 'поехали', 'в', 'горы,', 'потому', 'что', 'был', 'дождь.', 'ехали'], 'Мы не поехали в горы, потому что был дождь.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (53, 0, 'Ketmoq (piyoda — boshlanish)', 'Пойти'),
  (53, 1, 'Ketmoq (transport — boshlanish)', 'Поехать'),
  (53, 2, 'Piknik', 'Пикник'),
  (53, 3, 'Oshxona', 'Кухня'),
  (53, 4, 'Savat', 'Корзина'),
  (53, 5, 'Tabiat', 'Природа'),
  (53, 6, 'So‘liq joy', 'Поляна'),
  (53, 7, 'O‘tin', 'Дрова'),
  (53, 8, 'Cho‘milmoq', 'Искупаться'),
  (53, 9, 'Gulxan', 'Костёр'),
  (53, 10, 'Atrofida', 'Вокруг'),
  (53, 11, 'Gitara', 'Гитара'),
  (53, 12, 'Qaytmoq', 'Вернуться'),
  (53, 13, 'Kech', 'Поздно'),
  (53, 14, 'Uzoq vaqtga', 'Надолго');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  53,
  'Выходной день',
  $body$
В прошлую субботу мы с семьёй поехали за город на пикник: утром было солнечно, и хотелось скорее выехать из шумных улиц. Я проснулся рано и сразу пошёл на кухню — хотелось приготовить что-то простое и тёплое к завтраку.

Потом я позвал всех к столу: чай уже стоял на подносе, а младший брат ещё зевал и тёр глаза.

После завтрака мы собрали корзину с едой, плед и мяч и поехали на природу. Дорога заняла около часа: мы долго выбирали место и наконец нашли тихую красивую поляну у реки.

Папа пошёл за дровами в небольшой лесок неподалёку, а мама начала раскладывать еду на скатерти. Я пошёл к реке искупаться — вода была прохладной, но очень приятной после жары.

Днём мы играли во фрисби и просто лежали на траве. Вечером мы развели костёр, сели вокруг и стали петь песни под гитару.

Домой мы вернулись поздно, усталые и немного закопчённые от дыма, но очень счастливые. Я думаю, что этот день мы запомним надолго.
$body$,
  'kunlik-oqish-53'
);

-- ========== Kun 54 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  54,
  'Harakat: при- (прийти / приехать — yetib kelish)',
  $theory$
**При-** — harakat **yakuni**, yetib kelish (СВ).

**Прийти** — piyoda: *приду, пришёл…*

**Приехать** — transportda: *приеду, приехал…*

**Farq:** *пойти / поехать* — boshlanish; *прийти / приехать* — tugallanish.

**Ko‘pincha:** *уже пришёл*, *уже приехали*.

**Inkor:** *не приду*, *не приехал*.

Transport uchun *прилететь* (samolyot) ham uchraydi.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (54, 'rule', 0, '«U allaqachon uyga keldi (piyoda)»', 'Он уже пришёл домой.', 'Он уже приехал домой.', 'Он уже пошёл домой.', 'Он уже ехал домой.', 0),
  (54, 'rule', 1, '«Siz qachon Moskvaga kelasiz (transportda)?»', 'Когда вы придёте в Москву?', 'Когда вы приедете в Москву?', 'Когда вы поедете в Москву?', 'Когда вы едете в Москву?', 1),
  (54, 'rule', 2, '«Ular kecha kechqurun keldilar (transportda)»', 'Они пришли вчера вечером.', 'Они приехали вчера вечером.', 'Они поехали вчера вечером.', 'Они ехали вчера вечером.', 1),
  (54, 'rule', 3, '«Men sizga ertaga ertalab kelaman (piyoda)»', 'Я приду к вам завтра утром.', 'Я приеду к вам завтра утром.', 'Я пойду к вам завтра утром.', 'Я иду к вам завтра утром.', 0),
  (54, 'rule', 4, '«U kecha kechki ovqatga kelmadi»', 'Он не пришёл на ужин вчера.', 'Он не приехал на ужин вчера.', 'Он не пошёл на ужин вчера.', 'Он не шёл на ужин вчера.', 0),
  (54, 'rule', 5, '«Ular Qrimdan qaytib keldilarmi?»', 'Они пришли из Крыма?', 'Они приехали из Крыма?', 'Они поехали из Крыма?', 'Они ехали из Крыма?', 1),
  (54, 'rule', 6, '«U (ayol) kecha uchrashuvga keldi»', 'Она пришла на встречу вчера.', 'Она пришёл на встречу вчера.', 'Она пришло на встречу вчера.', 'Она пришли на встречу вчера.', 0),
  (54, 'rule', 7, '«Sizga kim yordam berishga keldi?»', 'Кто пришёл к вам помогать?', 'Кто приехал к вам помогать?', 'Кто пошёл к вам помогать?', 'Кто ходил к вам помогать?', 0),
  (54, 'rule', 8, '«U kelasi hafta keladi (transportda)»', 'Он приедет на следующей неделе.', 'Он придёт на следующей неделе.', 'Он поедет на следующей неделе.', 'Он едет на следующей неделе.', 0),
  (54, 'rule', 9, '«Poyezd qachon keladi?»', 'Когда приедет поезд?', 'Когда придёт поезд?', 'Когда поедет поезд?', 'Когда едет поезд?', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (54, 0, 0, 'Ular kecha kechqurun keldilar (piyoda).', 'Они пришли вчера вечером.'),
  (54, 0, 1, 'U (ayol) allaqachon keldi (transportda).', 'Она уже приехала.'),
  (54, 0, 2, 'Siz qachon Peterburgga kelasiz?', 'Когда вы приедете в Петербург?'),
  (54, 0, 3, 'Men kechqurun siznikiga kelaman (piyoda).', 'Я приду к тебе вечером.'),
  (54, 0, 4, 'Ular poyezdda kelishdi.', 'Они приехали на поезде.'),
  (54, 0, 5, 'Samolyot kechikib keldi.', 'Самолёт прилетел с опозданием.'),
  (54, 0, 6, 'Poyezd vaqtida keldi.', 'Поезд приехал вовремя.'),
  (54, 0, 7, 'U (erkak) ishdan kech keldi.', 'Он пришёл с работы поздно.'),
  (54, 0, 8, 'Mehmonlar allaqachon kelishdi.', 'Гости уже приехали.'),
  (54, 0, 9, 'Sizga qachon qo‘ng‘iroq qilish mumkin?', 'Когда можно позвонить вам?');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (54, 0, 'uz', '(он, уже, прийти, домой)', ARRAY['Он', 'уже', 'пришёл', 'домой.', 'приходит'], 'Он уже пришёл домой.'),
  (54, 1, 'uz', '(когда, ты, приехать, из, командировка)', ARRAY['Когда', 'ты', 'приехал', 'из', 'командировки?', 'пришёл'], 'Когда ты приехал из командировки?'),
  (54, 2, 'uz', '(мы, завтра, прийти, к, тебе, в, гости)', ARRAY['Мы', 'завтра', 'придём', 'к', 'тебе', 'в', 'гости.', 'пойдём'], 'Мы завтра придём к тебе в гости.'),
  (54, 3, 'uz', '(поезд, приехать, на, вокзал, вовремя)', ARRAY['Поезд', 'приехал', 'на', 'вокзал', 'вовремя.', 'пришёл'], 'Поезд приехал на вокзал вовремя.'),
  (54, 4, 'uz', '(она, не, прийти, на, собрание, потому, что, болела)', ARRAY['Она', 'не', 'пришла', 'на', 'собрание,', 'потому', 'что', 'болела.', 'ходила'], 'Она не пришла на собрание, потому что болела.'),
  (54, 5, 'uz', '(вы, откуда, приехать)', ARRAY['Откуда', 'вы', 'приехали?', 'пришли'], 'Откуда вы приехали?'),
  (54, 6, 'uz', '(я, приду, к, врачу, в, 10, часов)', ARRAY['Я', 'приду', 'к', 'врачу', 'в', '10', 'часов.', 'пойду'], 'Я приду к врачу в 10 часов.'),
  (54, 7, 'uz', '(дети, приехать, с, экскурсии, уставшие)', ARRAY['Дети', 'приехали', 'с', 'экскурсии', 'уставшие.', 'пришли'], 'Дети приехали с экскурсии уставшие.'),
  (54, 8, 'uz', '(гости, уже, прийти, и, сидеть, в, гостиной)', ARRAY['Гости', 'уже', 'пришли', 'и', 'сидят', 'в', 'гостиной.', 'приехали'], 'Гости уже пришли и сидят в гостиной.'),
  (54, 9, 'uz', '(когда, ты, приехать, позвони, мне)', ARRAY['Когда', 'ты', 'приедешь,', 'позвони', 'мне.', 'придёшь'], 'Когда ты приедешь, позвони мне.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (54, 0, 'Kelmoq (piyoda — natija)', 'Прийти'),
  (54, 1, 'Kelmoq (transport — natija)', 'Приехать'),
  (54, 2, 'Qarindosh', 'Родственник'),
  (54, 3, 'Vokzal', 'Вокзал'),
  (54, 4, 'Kutib olmoq', 'Встречать'),
  (54, 5, 'Qo‘l siltamoq', 'Помахать рукой'),
  (54, 6, 'Vagon', 'Вагон'),
  (54, 7, 'Chiqmoq', 'Выйти'),
  (54, 8, 'Quchoqlashmoq', 'Обняться'),
  (54, 9, 'Uyga', 'Домой'),
  (54, 10, 'Mehmon taomi', 'Угощение'),
  (54, 11, 'Asosiy', 'Главный'),
  (54, 12, 'Diqqatga sazovor joy', 'Достопримечательность'),
  (54, 13, 'Kuzatib qo‘ymoq', 'Проводить'),
  (54, 14, 'Iliq qabul', 'Тёплый приём');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  54,
  'Встреча гостей',
  $body$
В прошлое воскресенье к нам в гости приехали мои родственники из другого города. Они приехали на поезде рано утром, когда город ещё только просыпался.

Я пошёл на вокзал встречать их. Когда поезд приехал на платформу, я увидел своих родственников и помахал им рукой.

Они вышли из вагона, обняли меня, и мы поехали домой на такси. Дома мама уже приготовила щедрое угощение — на столе стояли салаты, горячее и домашний компот.

Мы сели за стол и начали обедать, болтая о новостях. После обеда мы пошли гулять по городу: я показал им главные достопримечательности и любимые уютные дворики.

Вечером мы проводили гостей на вокзал. Они поблагодарили нас за тёплый приём и обещали написать по приезде. Я пообещал им приехать в гости в следующем году.

Прощание всегда немного грустное, но радость от встречи остаётся в памяти надолго.
$body$,
  'kunlik-oqish-54'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-53', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-53', 'брат', 'брат', 'Aka-uka', NULL),
  ('kunlik-oqish-53', 'была', 'была', 'Edi (ayol)', NULL),
  ('kunlik-oqish-53', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-53', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-53', 'вернулись', 'вернулись', 'Qaytdik', NULL),
  ('kunlik-oqish-53', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-53', 'во', 'во', '…da (vo frisbi)', NULL),
  ('kunlik-oqish-53', 'вода', 'вода', 'suv', NULL),
  ('kunlik-oqish-53', 'вокруг', 'вокруг', 'Atrofida', NULL),
  ('kunlik-oqish-53', 'всех', 'всех', 'Hammalari', NULL),
  ('kunlik-oqish-53', 'выбирали', 'выбирали', 'Tanladik', NULL),
  ('kunlik-oqish-53', 'выехать', 'выехать', 'Jo‘nab ketmoq', NULL),
  ('kunlik-oqish-53', 'гитару', 'гитару', 'Gitarani', NULL),
  ('kunlik-oqish-53', 'глаза', 'глаза', 'Ko‘zlarini', NULL),
  ('kunlik-oqish-53', 'город', 'город', 'Shahar tashqarisiga', NULL),
  ('kunlik-oqish-53', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-53', 'Днём', 'днем', 'Kunduzi', NULL),
  ('kunlik-oqish-53', 'долго', 'долго', 'Uzoq', NULL),
  ('kunlik-oqish-53', 'Домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-53', 'Дорога', 'дорога', 'Yo‘l', NULL),
  ('kunlik-oqish-53', 'дровами', 'дровами', 'O‘tin uchun', NULL),
  ('kunlik-oqish-53', 'думаю', 'думаю', 'O‘ylayman', NULL),
  ('kunlik-oqish-53', 'дыма', 'дыма', 'Tudan', NULL),
  ('kunlik-oqish-53', 'едой', 'едой', 'Ovqat bilan', NULL),
  ('kunlik-oqish-53', 'еду', 'еду', 'Ovqat', NULL),
  ('kunlik-oqish-53', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-53', 'жары', 'жары', 'Issiqdan', NULL),
  ('kunlik-oqish-53', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-53', 'завтрака', 'завтрака', 'Nonushtadan', NULL),
  ('kunlik-oqish-53', 'завтраку', 'завтраку', 'Nonushtaga', NULL),
  ('kunlik-oqish-53', 'закопчённые', 'закопченные', 'Islangan', NULL),
  ('kunlik-oqish-53', 'заняла', 'заняла', 'Oldi (vaqt)', NULL),
  ('kunlik-oqish-53', 'запомним', 'запомним', 'Eslab qolamiz', NULL),
  ('kunlik-oqish-53', 'зевал', 'зевал', 'Esndi', NULL),
  ('kunlik-oqish-53', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-53', 'играли', 'играли', 'O‘ynadik', NULL),
  ('kunlik-oqish-53', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-53', 'искупаться', 'искупаться', 'Cho‘milmoq', NULL),
  ('kunlik-oqish-53', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-53', 'корзину', 'корзину', 'Savatni', NULL),
  ('kunlik-oqish-53', 'костёр', 'костер', 'Gulxan', NULL),
  ('kunlik-oqish-53', 'красивую', 'красивую', 'Chiroyli', NULL),
  ('kunlik-oqish-53', 'кухню', 'кухню', 'Oshxonaga', NULL),
  ('kunlik-oqish-53', 'лежали', 'лежали', 'Yotdik', NULL),
  ('kunlik-oqish-53', 'лесок', 'лесок', 'O‘rmoncha', NULL),
  ('kunlik-oqish-53', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-53', 'место', 'место', 'joy', NULL),
  ('kunlik-oqish-53', 'младший', 'младший', 'Kichik', NULL),
  ('kunlik-oqish-53', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-53', 'мяч', 'мяч', 'To‘p', NULL),
  ('kunlik-oqish-53', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-53', 'надолго', 'надолго', 'Uzoq vaqtga', NULL),
  ('kunlik-oqish-53', 'наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-53', 'начала', 'начала', 'Boshladi', NULL),
  ('kunlik-oqish-53', 'нашли', 'нашли', 'Topdik', NULL),
  ('kunlik-oqish-53', 'небольшой', 'небольшой', 'Kichik', NULL),
  ('kunlik-oqish-53', 'немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-53', 'неподалёку', 'неподалеку', 'Yaqin joyda', NULL),
  ('kunlik-oqish-53', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-53', 'около', 'около', 'Taxminan', NULL),
  ('kunlik-oqish-53', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-53', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-53', 'Папа', 'папа', 'Ota', NULL),
  ('kunlik-oqish-53', 'песни', 'песни', 'Qo‘shiqlar', NULL),
  ('kunlik-oqish-53', 'петь', 'петь', 'Kuylamoq', NULL),
  ('kunlik-oqish-53', 'пикник', 'пикник', 'Piknik', NULL),
  ('kunlik-oqish-53', 'плед', 'плед', 'Adyol', NULL),
  ('kunlik-oqish-53', 'под', 'под', 'Ostida', NULL),
  ('kunlik-oqish-53', 'подносе', 'подносе', 'Poddonda', NULL),
  ('kunlik-oqish-53', 'поехали', 'поехали', 'Ketishdi (transport)', NULL),
  ('kunlik-oqish-53', 'позвал', 'позвал', 'Chaqirdim', NULL),
  ('kunlik-oqish-53', 'поздно', 'поздно', 'Kech', NULL),
  ('kunlik-oqish-53', 'поляну', 'поляну', 'So‘liq joyni', NULL),
  ('kunlik-oqish-53', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-53', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-53', 'пошёл', 'пошел', 'Ketdi (boshlanish, СВ)', NULL),
  ('kunlik-oqish-53', 'приготовить', 'приготовить', 'Tayyorlamoq', NULL),
  ('kunlik-oqish-53', 'природу', 'природу', 'Tabiatga', NULL),
  ('kunlik-oqish-53', 'приятной', 'приятной', 'Yoqimli', NULL),
  ('kunlik-oqish-53', 'проснулся', 'проснулся', 'Uyg‘ondim', NULL),
  ('kunlik-oqish-53', 'просто', 'просто', 'Oddiy', NULL),
  ('kunlik-oqish-53', 'простое', 'простое', 'Oddiy', NULL),
  ('kunlik-oqish-53', 'прохладной', 'прохладной', 'Salqin', NULL),
  ('kunlik-oqish-53', 'прошлую', 'прошлую', 'O‘tgan', NULL),
  ('kunlik-oqish-53', 'развели', 'развели', 'Yoqdik', NULL),
  ('kunlik-oqish-53', 'рано', 'рано', 'Erta', NULL),
  ('kunlik-oqish-53', 'раскладывать', 'раскладывать', 'Joylashtirmoq', NULL),
  ('kunlik-oqish-53', 'реке', 'реке', 'Daryoga', NULL),
  ('kunlik-oqish-53', 'реки', 'реки', 'Daryolar', NULL),
  ('kunlik-oqish-53', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-53', 'сели', 'сели', 'o‘tirishdi', NULL),
  ('kunlik-oqish-53', 'семьёй', 'семьей', 'Oila bilan', NULL),
  ('kunlik-oqish-53', 'скатерти', 'скатерти', 'Dasturxonga', NULL),
  ('kunlik-oqish-53', 'скорее', 'скорее', 'Tezroq', NULL),
  ('kunlik-oqish-53', 'собрали', 'собрали', 'Yig‘dik', NULL),
  ('kunlik-oqish-53', 'солнечно', 'солнечно', 'Quyoshli', NULL),
  ('kunlik-oqish-53', 'сразу', 'сразу', 'Darhol', NULL),
  ('kunlik-oqish-53', 'стали', 'стали', 'Boshlashdi', NULL),
  ('kunlik-oqish-53', 'столу', 'столу', 'Stolga', NULL),
  ('kunlik-oqish-53', 'стоял', 'стоял', 'Turardi', NULL),
  ('kunlik-oqish-53', 'субботу', 'субботу', 'Shanba', NULL),
  ('kunlik-oqish-53', 'счастливые', 'счастливые', 'Baxtli', NULL),
  ('kunlik-oqish-53', 'тёплое', 'теплое', 'Issiq', NULL),
  ('kunlik-oqish-53', 'тёр', 'тер', 'Artmoq', NULL),
  ('kunlik-oqish-53', 'тихую', 'тихую', 'Jimjit', NULL),
  ('kunlik-oqish-53', 'то', 'то', 'Ana shu', NULL),
  ('kunlik-oqish-53', 'траве', 'траве', 'O‘tda', NULL),
  ('kunlik-oqish-53', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-53', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-53', 'улиц', 'улиц', 'Ko‘chalardan', NULL),
  ('kunlik-oqish-53', 'усталые', 'усталые', 'Charchagan', NULL),
  ('kunlik-oqish-53', 'утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-53', 'фрисби', 'фрисби', 'Frisbi', NULL),
  ('kunlik-oqish-53', 'хотелось', 'хотелось', 'Xohlardi', NULL),
  ('kunlik-oqish-53', 'чай', 'чай', 'Choy', NULL),
  ('kunlik-oqish-53', 'часа', 'часа', 'soat', NULL),
  ('kunlik-oqish-53', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-53', 'шумных', 'шумных', 'Shovqinli', NULL),
  ('kunlik-oqish-53', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-53', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-54', 'болтая', 'болтая', 'Gaplashib', NULL),
  ('kunlik-oqish-54', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-54', 'вагона', 'вагона', 'Vagondan', NULL),
  ('kunlik-oqish-54', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-54', 'вокзал', 'вокзал', 'Vokzal', NULL),
  ('kunlik-oqish-54', 'воскресенье', 'воскресенье', 'Yakshanba', NULL),
  ('kunlik-oqish-54', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-54', 'встречать', 'встречать', 'Kutib olmoq', NULL),
  ('kunlik-oqish-54', 'встречи', 'встречи', 'Uchrashuv', NULL),
  ('kunlik-oqish-54', 'вышли', 'вышли', 'Chiqishdi', NULL),
  ('kunlik-oqish-54', 'главные', 'главные', 'Asosiy', NULL),
  ('kunlik-oqish-54', 'году', 'году', 'yilda', NULL),
  ('kunlik-oqish-54', 'город', 'город', 'Shahar tashqarisiga', NULL),
  ('kunlik-oqish-54', 'города', 'города', 'Shaharlar', NULL),
  ('kunlik-oqish-54', 'городу', 'городу', 'Shahar bo‘ylab', NULL),
  ('kunlik-oqish-54', 'горячее', 'горячее', 'Issiq taom', NULL),
  ('kunlik-oqish-54', 'гостей', 'гостей', 'Mehmonlarni', NULL),
  ('kunlik-oqish-54', 'гости', 'гости', 'Mehmonga', NULL),
  ('kunlik-oqish-54', 'грустное', 'грустное', 'G‘alg‘ala', NULL),
  ('kunlik-oqish-54', 'гулять', 'гулять', 'Sayr qilmoq', NULL),
  ('kunlik-oqish-54', 'дворики', 'дворики', 'Hovlilar', NULL),
  ('kunlik-oqish-54', 'Дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-54', 'домашний', 'домашний', 'Uy (sifat)', NULL),
  ('kunlik-oqish-54', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-54', 'достопримечательности', 'достопримечательности', 'Diqqatga sazovor joylar', NULL),
  ('kunlik-oqish-54', 'другого', 'другого', 'Boshqa', NULL),
  ('kunlik-oqish-54', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-54', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-54', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-54', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-54', 'им', 'им', 'ularga', NULL),
  ('kunlik-oqish-54', 'их', 'их', 'Ularga', NULL),
  ('kunlik-oqish-54', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-54', 'когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-54', 'компот', 'компот', 'Kompot', NULL),
  ('kunlik-oqish-54', 'любимые', 'любимые', 'Sevimli', NULL),
  ('kunlik-oqish-54', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-54', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-54', 'мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-54', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-54', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-54', 'надолго', 'надолго', 'Uzoq vaqtga', NULL),
  ('kunlik-oqish-54', 'нам', 'нам', 'bizga', NULL),
  ('kunlik-oqish-54', 'написать', 'написать', 'Yozmoq', NULL),
  ('kunlik-oqish-54', 'нас', 'нас', 'Bizdan', NULL),
  ('kunlik-oqish-54', 'начали', 'начали', 'Boshladik', NULL),
  ('kunlik-oqish-54', 'немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-54', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-54', 'новостях', 'новостях', 'Yangiliklar haqida', NULL),
  ('kunlik-oqish-54', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-54', 'обеда', 'обеда', 'tushlik', NULL),
  ('kunlik-oqish-54', 'обедать', 'обедать', 'Tushlik qilmoq', NULL),
  ('kunlik-oqish-54', 'обещали', 'обещали', 'Va’da berishdi', NULL),
  ('kunlik-oqish-54', 'обняли', 'обняли', 'Quchoqlashdi', NULL),
  ('kunlik-oqish-54', 'Они', 'они', 'Ular', NULL),
  ('kunlik-oqish-54', 'остаётся', 'остается', 'Qoladi', NULL),
  ('kunlik-oqish-54', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-54', 'памяти', 'памяти', 'Xotirada', NULL),
  ('kunlik-oqish-54', 'платформу', 'платформу', 'Platformaga', NULL),
  ('kunlik-oqish-54', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-54', 'поблагодарили', 'поблагодарили', 'Minnatdorlik bildirishdi', NULL),
  ('kunlik-oqish-54', 'поезд', 'поезд', 'Poyezd', NULL),
  ('kunlik-oqish-54', 'поезде', 'поезде', 'Poyezdda', NULL),
  ('kunlik-oqish-54', 'поехали', 'поехали', 'Ketishdi (transport)', NULL),
  ('kunlik-oqish-54', 'показал', 'показал', 'Ko‘rsatdim', NULL),
  ('kunlik-oqish-54', 'помахал', 'помахал', 'Qo‘l siltadi', NULL),
  ('kunlik-oqish-54', 'пообещал', 'пообещал', 'Va’da berdi', NULL),
  ('kunlik-oqish-54', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-54', 'пошёл', 'пошел', 'Ketdi (boshlanish, СВ)', NULL),
  ('kunlik-oqish-54', 'пошли', 'пошли', 'Ketishdi', NULL),
  ('kunlik-oqish-54', 'приготовила', 'приготовила', 'Tayyorladi', NULL),
  ('kunlik-oqish-54', 'приезде', 'приезде', 'Kelgandan keyin', NULL),
  ('kunlik-oqish-54', 'приём', 'прием', 'Qabul', NULL),
  ('kunlik-oqish-54', 'приехал', 'приехал', 'Keldi (transport)', NULL),
  ('kunlik-oqish-54', 'приехали', 'приехали', 'Kelishdi (transport)', NULL),
  ('kunlik-oqish-54', 'приехать', 'приехать', 'Yetib kelmoq (transport, СВ)', NULL),
  ('kunlik-oqish-54', 'проводили', 'проводили', 'Kuzatib qo‘ydik', NULL),
  ('kunlik-oqish-54', 'просыпался', 'просыпался', 'Uyg‘onar edi', NULL),
  ('kunlik-oqish-54', 'прошлое', 'прошлое', 'O‘tgan', NULL),
  ('kunlik-oqish-54', 'Прощание', 'прощание', 'Xayrlashuv', NULL),
  ('kunlik-oqish-54', 'радость', 'радость', 'Shodlik', NULL),
  ('kunlik-oqish-54', 'рано', 'рано', 'Erta', NULL),
  ('kunlik-oqish-54', 'родственники', 'родственники', 'Qarindoshlar', NULL),
  ('kunlik-oqish-54', 'родственников', 'родственников', 'Qarindoshlarimni', NULL),
  ('kunlik-oqish-54', 'рукой', 'рукой', 'Qo‘l bilan', NULL),
  ('kunlik-oqish-54', 'салаты', 'салаты', 'Salatlar', NULL),
  ('kunlik-oqish-54', 'своих', 'своих', 'O‘zingning', NULL),
  ('kunlik-oqish-54', 'сели', 'сели', 'o‘tirishdi', NULL),
  ('kunlik-oqish-54', 'следующем', 'следующем', 'Kelgusi', NULL),
  ('kunlik-oqish-54', 'стол', 'стол', 'Stol', NULL),
  ('kunlik-oqish-54', 'столе', 'столе', 'Stolda', NULL),
  ('kunlik-oqish-54', 'стояли', 'стояли', 'Turishardi', NULL),
  ('kunlik-oqish-54', 'такси', 'такси', 'Taksi', NULL),
  ('kunlik-oqish-54', 'тёплый', 'теплый', 'Iliq', NULL),
  ('kunlik-oqish-54', 'только', 'только', 'Faqat', NULL),
  ('kunlik-oqish-54', 'увидел', 'увидел', 'ko‘rdi', NULL),
  ('kunlik-oqish-54', 'угощение', 'угощение', 'Mehmon taomi', NULL),
  ('kunlik-oqish-54', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-54', 'утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-54', 'уютные', 'уютные', 'Qulay', NULL),
  ('kunlik-oqish-54', 'щедрое', 'щедрое', 'Ko‘p', NULL),
  ('kunlik-oqish-54', 'Я', 'я', 'Men', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (53, 0, 'Kecha kechqurun qayerga ketdingiz?', 'Куда вы пошли вчера вечером?'),
  (53, 1, 'Ular kecha tog‘ga sayohatga ketishdi.', 'Они поехали в горы вчера.'),
  (53, 2, 'Ertaga men do‘stimnikiga boraman.', 'Завтра я пойду к другу.'),
  (53, 3, 'Siz qachon shifokorga borasiz?', 'Когда вы пойдёте к врачу?'),
  (53, 4, 'Yozda biz Qrimga boramiz.', 'Летом мы поедем в Крым.'),
  (53, 5, 'U allaqachon uydan chiqib ketdi.', 'Он уже вышел из дома.'),
  (53, 6, 'Bolalar, qayerga ketdingizlar?', 'Дети, куда вы пошли?'),
  (53, 7, 'Kechirasiz, men hozir keta olmayman, ishim bor.', 'Извините, я не могу сейчас пойти, у меня работа.'),
  (53, 8, 'Sizningcha, ular qayerga ketishgan bo‘lishi mumkin?', 'Как вы думаете, куда они могли пойти?'),
  (53, 9, 'U shunchaki piyoda sayr qilish uchun ko‘chaga chiqdi.', 'Он просто вышел на улицу, чтобы погулять.'),
  (54, 0, 'Sizning mehmonlaringiz qachon kelishdi?', 'Когда приехали ваши гости?'),
  (54, 1, 'Ular kecha kechqurun poyezdda kelishdi.', 'Они приехали вчера вечером на поезде.'),
  (54, 2, 'Siz ularni vokzalda kutib oldingizmi?', 'Вы встретили их на вокзале?'),
  (54, 3, 'Uyda hamma allaqachon yig‘ilgan edi.', 'Дома все уже собрались.'),
  (54, 4, 'Qachon bizga kelasiz? – Kelasi haftada kelaman.', 'Когда вы придёте к нам? – Я приду на следующей неделе.'),
  (54, 5, 'U samolyotda keldi, chunki tezroq.', 'Он прилетел на самолёте, потому что быстрее.'),
  (54, 6, 'Nega uchrashuvga kelmadingiz?', 'Почему вы не пришли на встречу?'),
  (54, 7, 'Poyezd vaqtida keldimi? – Ha, bir daqiqa kechikmadi.', 'Поезд приехал вовремя? – Да, не опоздал ни на минуту.'),
  (54, 8, 'Biz ularni kuzatib qo‘yganimizda, juda xafa bo‘ldik.', 'Когда мы проводили их, нам было очень грустно.'),
  (54, 9, 'Siz qachon safaringizdan qaytasiz?', 'Когда вы вернётесь из поездки?');

