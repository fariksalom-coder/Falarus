-- Kunlik kun 45–47: harakat fe’llari (пойду / поеду), prefiksli harakatlar, niyat (собираться / планировать / хотеть).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 45 AND day_number <= 47;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 45 AND day_number <= 47
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 45 AND day_number <= 47;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 45 AND day_number <= 47;

DELETE FROM public.daily_vocab_words WHERE day_number >= 45 AND day_number <= 47;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 45 AND day_number <= 47;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 45 AND day_number <= 47;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 45 AND day_number <= 47;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 45 AND day_number <= 47;

-- ========== Kun 45 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  45,
  'Kelasi zamonda harakat fe’llari: пойти / поехать',
  $theory$
Kelasi zamonda **bir martalik yo‘nalish** odatda **СВ** bilan: **пойти** (piyoda), **поехать** (transport).

**Muntazam:** *каждый день я буду ходить / буду ездить …*

**Куда?** + в/на + В.п.; **откуда?** + из/с/от + Р.п.

**Kelish:** к нам → **они придут** (СВ «прийти»).

**Masofa:** yaqin joy → ko‘pincha **пойду пешком**; uzoq shahar/poyezd/samolyot → **поеду / полечу**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (45, 'rule', 0, '«Ertaga kinoga boraman (piyoda)»', 'Завтра я поеду в кино.', 'Завтра я пойду в кино.', 'Завтра я буду идти в кино.', 'Завтра я хожу в кино.', 1),
  (45, 'rule', 1, '«Biz yozda dengizga boramiz»', 'Мы пойдём на море летом.', 'Мы поедем на море летом.', 'Мы будем ехать на море летом.', 'Мы ездим на море летом.', 1),
  (45, 'rule', 2, 'Qaysi gapda «поеду» eng mos?', 'Я поеду в школу пешком.', 'Я поеду в Москву на поезде.', 'Я поеду в магазин за хлебом (близко).', 'Я поеду в парк напротив дома.', 1),
  (45, 'rule', 3, '«Qachon do‘konga borasan?»', 'Когда ты идёшь в магазин?', 'Когда ты пойдёшь в магазин?', 'Когда ты ходишь в магазин?', 'Когда ты поедешь в магазин?', 1),
  (45, 'rule', 4, '«Har kuni men ishga avtobusda boraman» — kelasi, takror', 'Каждый день я поеду на работу на автобусе.', 'Каждый день я буду ездить на работу на автобусе.', 'Каждый день я еду на работу на автобусе.', 'Каждый день я ездил на работу на автобусе.', 1),
  (45, 'rule', 5, '«Ular ertaga biznikiga kelishadi»', 'Они пойдут к нам завтра.', 'Они придут к нам завтра.', 'Они поедут к нам завтра.', 'Они будут идти к нам завтра.', 1),
  (45, 'rule', 6, 'Qaysi gap shubhali / mos emas? (stadion yaqin, piyoda)', 'Я пойду на стадион пешком.', 'Я поеду на стадион на автобусе.', 'Я буду идти на стадион пешком.', 'Я иду на стадион пешком.', 1),
  (45, 'rule', 7, '«Sen qachon shifokorga borasan?»', 'Когда ты пойдёшь к врачу?', 'Когда ты поедешь к врачу?', 'Когда ты идёшь к врачу?', 'Когда ты ходишь к врачу?', 0),
  (45, 'rule', 8, '«Har dam olish kuni biz qishloqqa boramiz» — kelasi, takror', 'Каждые выходные мы поедем в деревню.', 'Каждые выходные мы будем ездить в деревню.', 'Каждые выходные мы едем в деревню.', 'Каждые выходные мы ехали в деревню.', 1),
  (45, 'rule', 9, '«Ular samolyotda uchadilar» — kelasi, bir marta', 'Они полетят на самолёте.', 'Они будут лететь на самолёте.', 'Они летят на самолёте.', 'Они летали на самолёте.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (45, 0, 0, 'Магазин совсем рядом с домом', 'Я пойду пешком'),
  (45, 0, 1, 'Университет далеко, есть автобус', 'Я поеду на автобусе'),
  (45, 0, 2, 'Кафе в соседнем доме — мы вместе', 'Мы пойдём в кафе пешком'),
  (45, 0, 3, 'В другой город на поезде', 'Я поеду на поезде'),
  (45, 0, 4, 'На море, дорога долгая', 'Мы поедем на море'),
  (45, 0, 5, 'Театр возле станции метро', 'Я пойду в театр пешком'),
  (45, 0, 6, 'К родителям в деревню', 'Мы поедем в деревню'),
  (45, 0, 7, 'В аэропорт на такси', 'Я поеду на такси'),
  (45, 0, 8, 'За границу на самолёте', 'Мы полетим на самолёте'),
  (45, 0, 9, 'В парк всей семьёй, хорошая погода', 'Мы пойдём в парк пешком');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (45, 0, 'uz', '(завтра, я, пойти, в, библиотека, пешком)', ARRAY['Завтра', 'я', 'пойду', 'в', 'библиотеку', 'пешком.', 'пойти'], 'Завтра я пойду в библиотеку пешком.'),
  (45, 1, 'uz', '(летом, мы, поехать, в, Крым, на, поезд)', ARRAY['Летом', 'мы', 'поедем', 'в', 'Крым', 'на', 'поезде.', 'едем'], 'Летом мы поедем в Крым на поезде.'),
  (45, 2, 'uz', '(ты, когда, пойти, к, врач)', ARRAY['Когда', 'ты', 'пойдёшь', 'к', 'врачу?', 'идёшь'], 'Когда ты пойдёшь к врачу?'),
  (45, 3, 'uz', '(они, не, поехать, на, дачу, в, это, воскресенье)', ARRAY['Они', 'не', 'поедут', 'на', 'дачу', 'в', 'это', 'воскресенье.', 'поедем'], 'Они не поедут на дачу в это воскресенье.'),
  (45, 4, 'uz', '(я, каждый, день, ездить, на, работа, на, метро)', ARRAY['Я', 'каждый', 'день', 'буду', 'ездить', 'на', 'работу', 'на', 'метро.', 'еду'], 'Я каждый день буду ездить на работу на метро.'),
  (45, 5, 'uz', '(дети, вечером, пойти, гулять, в, парк)', ARRAY['Дети', 'вечером', 'пойдут', 'гулять', 'в', 'парк.', 'идут'], 'Дети вечером пойдут гулять в парк.'),
  (45, 6, 'uz', '(вы, куда, поехать, в, отпуск)', ARRAY['Куда', 'вы', 'поедете', 'в', 'отпуск?', 'едете'], 'Куда вы поедете в отпуск?'),
  (45, 7, 'uz', '(он, никогда, не, пойти, туда, один)', ARRAY['Он', 'никогда', 'не', 'пойдёт', 'туда', 'один.', 'идёт'], 'Он никогда не пойдёт туда один.'),
  (45, 8, 'uz', '(мы, побежать, на, стадион, сейчас)', ARRAY['Мы', 'побежим', 'на', 'стадион', 'сейчас.', 'бежим'], 'Мы побежим на стадион сейчас.'),
  (45, 9, 'uz', '(когда, самолёт, полететь, в, Москва)', ARRAY['Когда', 'самолёт', 'полетит', 'в', 'Москву?', 'летит'], 'Когда самолёт полетит в Москву?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (45, 0, 'Bormoq (piyoda, bir marta)', 'Пойти'),
  (45, 1, 'Bormoq (transport, bir marta)', 'Поехать'),
  (45, 2, 'Yugurmoq (boshlash)', 'Побежать'),
  (45, 3, 'Uchmoq (boshlash)', 'Полететь'),
  (45, 4, 'Savdo markazi', 'Торговый центр'),
  (45, 5, 'Uzoq emas', 'Недалеко'),
  (45, 6, 'Shahar tashqarisidagi', 'Загородный'),
  (45, 7, 'Haydamoq (mashina)', 'Вести'),
  (45, 8, 'Plyod', 'Плед'),
  (45, 9, 'Dasturxon yoymoq', 'Накрыть на стол'),
  (45, 10, 'Qiziqarli', 'Весёлый'),
  (45, 11, 'Mehmonga bormoq', 'Пойти в гости'),
  (45, 12, 'Hayvonot bog‘i', 'Зоопарк'),
  (45, 13, 'Olib bormoq (yo‘l)', 'Вести (о дороге)'),
  (45, 14, 'Dam olish kunlari', 'Выходные');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  45,
  'Планы на выходные',
  $body$
В эту субботу я пойду в новый торговый центр в центре города. Мне нужно купить подарок для мамы: у неё скоро день рождения. Я пойду туда пешком, потому что это недалеко от нашего дома.

В воскресенье утром мы поедем в загородный парк за городом. Туда мы поедем на машине: мой папа будет вести машину, а мы возьмём с собой еду и пледы. Если будет солнечно, мы полежим на траве и просто отдохнём на свежем воздухе.

После парка мы поедем в гости к бабушке в деревню неподалёку. Бабушка будет очень рада нас видеть. Я помогу ей накрыть на стол и расскажу новости.

Вечером мы пойдём в кино с друзьями в другой район города. Перед сеансом мы позавтракаем в уютном кафе рядом с кинотеатром.

Я уверен, что эти выходные будут весёлыми и запомнятся надолго.
$body$,
  'kunlik-oqish-45'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-45', 'субботу', 'субботу', 'Shanba kuni', NULL),
  ('kunlik-oqish-45', 'пойду', 'пойду', 'Boraman (piyoda, СВ)', NULL),
  ('kunlik-oqish-45', 'торговый', 'торговый', 'Savdo', NULL),
  ('kunlik-oqish-45', 'центр', 'центр', 'Markaz', NULL),
  ('kunlik-oqish-45', 'нужно', 'нужно', 'Kerak', NULL),
  ('kunlik-oqish-45', 'купить', 'купить', 'Sotib olish', NULL),
  ('kunlik-oqish-45', 'подарок', 'подарок', 'Sovg‘a', NULL),
  ('kunlik-oqish-45', 'пешком', 'пешком', 'Piyoda', NULL),
  ('kunlik-oqish-45', 'потому', 'потому', 'Chunki', NULL),
  ('kunlik-oqish-45', 'недалеко', 'недалеко', 'Uzoq emas', NULL),
  ('kunlik-oqish-45', 'воскресенье', 'воскресенье', 'Yakshanba', NULL),
  ('kunlik-oqish-45', 'поедем', 'поедем', 'Boramiz (transport)', NULL),
  ('kunlik-oqish-45', 'загородный', 'загородный', 'Shahar tashqarisidagi', NULL),
  ('kunlik-oqish-45', 'парк', 'парк', 'Park', NULL),
  ('kunlik-oqish-45', 'машине', 'машине', 'Mashinada', NULL),
  ('kunlik-oqish-45', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-45', 'вести', 'вести', 'Haydamoq', NULL),
  ('kunlik-oqish-45', 'возьмём', 'возьмем', 'Olamiz (СВ)', NULL),
  ('kunlik-oqish-45', 'еду', 'еду', 'Ovqat', NULL),
  ('kunlik-oqish-45', 'пледы', 'пледы', 'Plyodlar', NULL),
  ('kunlik-oqish-45', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-45', 'гости', 'гости', 'Mehmonga', NULL),
  ('kunlik-oqish-45', 'бабушке', 'бабушке', 'Buvaga', NULL),
  ('kunlik-oqish-45', 'рада', 'рада', 'Xursand', NULL),
  ('kunlik-oqish-45', 'помогу', 'помогу', 'Yordam beraman (СВ)', NULL),
  ('kunlik-oqish-45', 'накрыть', 'накрыть', 'Dasturxon yoymoq', NULL),
  ('kunlik-oqish-45', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-45', 'пойдём', 'пойдем', 'Boramiz (piyoda)', NULL),
  ('kunlik-oqish-45', 'кино', 'кино', 'Kino', NULL),
  ('kunlik-oqish-45', 'друзьями', 'друзьями', 'Do‘stlar bilan', NULL),
  ('kunlik-oqish-45', 'Перед', 'перед', 'Oldin', NULL),
  ('kunlik-oqish-45', 'позавтракаем', 'позавтракаем', 'Nonushta qilamiz (СВ)', NULL),
  ('kunlik-oqish-45', 'уверен', 'уверен', 'Ishonaman', NULL),
  ('kunlik-oqish-45', 'выходные', 'выходные', 'Dam olish kunlari', NULL),
  ('kunlik-oqish-45', 'весёлыми', 'веселыми', 'Quvnoq', NULL),
  ('kunlik-oqish-45', 'города', 'города', 'Shahar', NULL),
  ('kunlik-oqish-45', 'рождения', 'рождения', 'Tug‘ilgan kun', NULL),
  ('kunlik-oqish-45', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-45', 'отдохнём', 'отдохнем', 'Dam olamiz (СВ)', NULL),
  ('kunlik-oqish-45', 'расскажу', 'расскажу', 'Aytib beraman (СВ)', NULL),
  ('kunlik-oqish-45', 'новости', 'новости', 'Yangiliklar', NULL),
  ('kunlik-oqish-45', 'сеансом', 'сеансом', 'Seans', NULL),
  ('kunlik-oqish-45', 'уютном', 'уютном', 'Quyuq/juda yoqimli', NULL),
  ('kunlik-oqish-45', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-45', 'запомнятся', 'запомнятся', 'Esda qoladi', NULL),
  ('kunlik-oqish-45', 'солнечно', 'солнечно', 'Quyoshli', NULL),
  ('kunlik-oqish-45', 'полежим', 'полежим', 'Yotib olamiz', NULL),
  ('kunlik-oqish-45', 'свежем', 'свежем', 'Toza (havo)', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (45, 0, 'Siz bu hafta oxirida qayerga borasiz?', 'Куда вы пойдёте / поедете в эти выходные?'),
  (45, 1, 'Men do‘konga piyoda boraman, u yaqin.', 'Я пойду в магазин пешком, он рядом.'),
  (45, 2, 'Ular shahar tashqarisiga mashinada boradilar.', 'Они поедут за город на машине.'),
  (45, 3, 'Biz bu yozda Qrimga poyezdda boramiz.', 'Мы поедем в Крым на поезде этим летом.'),
  (45, 4, 'Qachon siz unga tashrif buyurasiz?', 'Когда вы пойдёте к нему в гости?'),
  (45, 5, 'Ertaga ertalab men bozorga boraman.', 'Завтра утром я пойду на рынок.'),
  (45, 6, 'U hech qachon piyoda ishga bormaydi, faqat mashinada.', 'Он никогда не пойдёт на работу пешком, только поедет на машине.'),
  (45, 7, 'Bolalar, tezroq kiyining, biz hayvonot bog‘iga boramiz.', 'Дети, одевайтесь быстрее, мы пойдём в зоопарк.'),
  (45, 8, 'Sizningcha, ertaga metro ishlaydimi?', 'Как вы думаете, завтра будет работать метро?'),
  (45, 9, 'Kechirasiz, bu yo‘l qayerga olib boradi?', 'Извините, куда ведёт эта дорога?');

-- ========== Kun 46 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  46,
  'Harakat fe’llari va prefiksler: при-, у-, в-/вы-, под-, от-, за-, пере-',
  $theory$
**при-** kelish: *приду*, *приеду*.
**у-** ketish: *уйду*, *уеду*.
**в-/во-** ichkariga: *войду*; **вы-** tashqariga: *выйду*.
**под-** yaqinlashish: *подойду*; **от-** uzoqlashish: *отойду*.
**за-** yo‘lakay/vaqtincha: *зайду*; **пере-** kesib o‘tish: *перейду*.

Transport vs piyoda: *приеду на поезде*, emas ×приду на автобусе.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (46, 'rule', 0, '«Ertaga men siznikiga kelaman (piyoda)»', 'Я приеду к вам завтра.', 'Я приду к вам завтра.', 'Я пойду к вам завтра.', 'Я уйду к вам завтра.', 1),
  (46, 'rule', 1, '«U poyezdda keladi» — kelasi', 'Он приехал на поезде.', 'Он приедет на поезде.', 'Он придёт на поезде.', 'Он уедет на поезде.', 1),
  (46, 'rule', 2, '«Men Moskvadan ketaman» — transport', 'Я уеду из Москвы.', 'Я уйду из Москвы.', 'Я приеду в Москву.', 'Я войду в Москву.', 0),
  (46, 'rule', 3, '«Xonaga kiring»', 'Выйдите в комнату.', 'Войдите в комнату.', 'Зайдите в комнату.', 'Перейдите в комнату.', 1),
  (46, 'rule', 4, '«Men metro bekasida chiqaman»', 'Я выйду на станции метро.', 'Я войду на станцию метро.', 'Я уйду на станцию метро.', 'Я подойду на станцию метро.', 0),
  (46, 'rule', 5, '«Ko‘chani kesib o‘taman»', 'Я перейду улицу.', 'Я подойду к улице.', 'Я отойду от улицы.', 'Я зайду на улицу.', 0),
  (46, 'rule', 6, '«Men do‘konga yo‘lakay kiraman»', 'Я зайду в магазин по дороге.', 'Я войду в магазин.', 'Я приду в магазин.', 'Я уйду из магазина.', 0),
  (46, 'rule', 7, '«U o‘qituvchiga yaqinlashadi»', 'Он подойдёт к учителю.', 'Он отойдёт от учителя.', 'Он приедет к учителю.', 'Он уйдёт от учителя.', 0),
  (46, 'rule', 8, 'Qaysi gap noto‘g‘ri? (u transportda ketmoqchi)', 'Он уедет.', 'Он уйдёт.', 'Он поедет.', 'Он отъедет.', 1),
  (46, 'rule', 9, '«Biz zinapoyadan ko‘tarilamiz»', 'Мы поднимемся по лестнице.', 'Мы спустимся по лестнице.', 'Мы перейдём лестницу.', 'Мы зайдём на лестницу.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (46, 0, 0, 'приду', 'Kelaman (piyoda)'),
  (46, 0, 1, 'приеду', 'Kelaman (transport)'),
  (46, 0, 2, 'уйду', 'Ketaman (piyoda)'),
  (46, 0, 3, 'уеду', 'Ketaman (transport)'),
  (46, 0, 4, 'войду', 'Kiraman (ichkariga)'),
  (46, 0, 5, 'выйду', 'Chiqaman (tashqariga)'),
  (46, 0, 6, 'зайду', 'Yo‘lakay / vaqtincha kiraman'),
  (46, 0, 7, 'перейду', 'Ko‘chani kesib o‘taman'),
  (46, 0, 8, 'подойду', 'Yaqinlashaman'),
  (46, 0, 9, 'отойду', 'Uzoqlashaman');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (46, 0, 'uz', '(завтра, я, приехать, в, Москва, на, поезд)', ARRAY['Завтра', 'я', 'приеду', 'в', 'Москву', 'на', 'поезде.', 'еду'], 'Завтра я приеду в Москву на поезде.'),
  (46, 1, 'uz', '(он, выйти, из, дом, в, 8, часов, утра)', ARRAY['Он', 'выйдет', 'из', 'дома', 'в', '8', 'часов', 'утра.', 'выйходит'], 'Он выйдет из дома в 8 часов утра.'),
  (46, 2, 'uz', '(мы, войти, в, аудитория, и, сесть, на, свои, места)', ARRAY['Мы', 'войдём', 'в', 'аудиторию', 'и', 'сядем', 'на', 'свои', 'места.', 'входим'], 'Мы войдём в аудиторию и сядем на свои места.'),
  (46, 3, 'uz', '(когда, ты, перейти, улица, посмотри, на, светофор)', ARRAY['Когда', 'ты', 'перейдёшь', 'улицу,', 'посмотри', 'на', 'светофор.', 'переходишь'], 'Когда ты перейдёшь улицу, посмотри на светофор.'),
  (46, 4, 'uz', '(я, зайти, к, ты, после, работа)', ARRAY['Я', 'зайду', 'к', 'тебе', 'после', 'работы.', 'приду'], 'Я зайду к тебе после работы.'),
  (46, 5, 'uz', '(они, уехать, из, город, на, всё, лето)', ARRAY['Они', 'уедут', 'из', 'города', 'на', 'всё', 'лето.', 'уезжают'], 'Они уедут из города на всё лето.'),
  (46, 6, 'uz', '(ты, подойти, к, доска, и, написать, ответ)', ARRAY['Ты', 'подойдёшь', 'к', 'доске', 'и', 'напишешь', 'ответ.', 'подходишь'], 'Ты подойдёшь к доске и напишешь ответ.'),
  (46, 7, 'uz', '(мы, прийти, на, станция, за, 10, минут, до, отправление)', ARRAY['Мы', 'придём', 'на', 'станцию', 'за', '10', 'минут', 'до', 'отправления.', 'приходим'], 'Мы придём на станцию за 10 минут до отправления.'),
  (46, 8, 'uz', '(почему, вы, отойти, от, окно) — kelasi', ARRAY['Почему', 'вы', 'отойдёте', 'от', 'окна?', 'отошли'], 'Почему вы отойдёте от окна?'),
  (46, 9, 'uz', '(дети, выйти, на, улица, и, играть)', ARRAY['Дети', 'выйдут', 'на', 'улицу', 'и', 'будут', 'играть.', 'выходят'], 'Дети выйдут на улицу и будут играть.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (46, 0, 'Kelmoq (piyoda)', 'Прийти / приду'),
  (46, 1, 'Kelmoq (transport)', 'Приехать / приеду'),
  (46, 2, 'Ketmoq (piyoda)', 'Уйти / уйду'),
  (46, 3, 'Ketmoq (transport)', 'Уехать / уеду'),
  (46, 4, 'Kirmoq', 'Войти / войду'),
  (46, 5, 'Chiqmoq', 'Выйти / выйду'),
  (46, 6, 'Yaqinlashmoq', 'Подойти / подойду'),
  (46, 7, 'Uzoqlashmoq', 'Отойти / отойду'),
  (46, 8, 'Yo‘lakay kirmoq', 'Зайти / зайду'),
  (46, 9, 'Ko‘chani kesib o‘tmoq', 'Перейти / перейду'),
  (46, 10, 'Vokzal', 'Вокзал'),
  (46, 11, 'Perron', 'Перрон'),
  (46, 12, 'Veranda', 'Веранда'),
  (46, 13, 'Murabbo', 'Варенье'),
  (46, 14, 'Qaytmoq', 'Вернуться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  46,
  'Поездка к бабушке',
  $body$
На следующей неделе я уеду в деревню к бабушке. Я поеду на поезде. Поезд отправляется в 8 часов утра.

Я приеду на вокзал за полчаса до отправления. Сначала я войду в здание вокзала, потом найду свою платформу и сяду в вагон.

В поезде я буду читать книгу и смотреть в окно.

Когда я приеду, бабушка выйдет встречать меня на перроне. Мы пойдём домой пешком, потому что это недалеко.

У дома я увижу сад и огород. Я помогу бабушке полить грядки.

Вечером мы посидим на веранде, попьём чай с вареньем.

Через неделю я уеду обратно в город. Я буду скучать по бабушке и по деревне.
$body$,
  'kunlik-oqish-46'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-46', 'неделе', 'неделе', 'Haftada', NULL),
  ('kunlik-oqish-46', 'уеду', 'уеду', 'Ketaman (transport)', NULL),
  ('kunlik-oqish-46', 'деревню', 'деревню', 'Qishloqqa', NULL),
  ('kunlik-oqish-46', 'бабушке', 'бабушке', 'Buvaga', NULL),
  ('kunlik-oqish-46', 'поеду', 'поеду', 'Boraman (transport)', NULL),
  ('kunlik-oqish-46', 'поезде', 'поезде', 'Poyezdda', NULL),
  ('kunlik-oqish-46', 'отправляется', 'отправляется', 'Jo‘naydi', NULL),
  ('kunlik-oqish-46', 'приеду', 'приеду', 'Kelaman (transport)', NULL),
  ('kunlik-oqish-46', 'вокзал', 'вокзал', 'Vokzal', NULL),
  ('kunlik-oqish-46', 'полчаса', 'полчаса', 'Yarim soat', NULL),
  ('kunlik-oqish-46', 'отправления', 'отправления', 'Jo‘nash', NULL),
  ('kunlik-oqish-46', 'Сначала', 'сначала', 'Avval', NULL),
  ('kunlik-oqish-46', 'войду', 'войду', 'Kiraman (СВ)', NULL),
  ('kunlik-oqish-46', 'здание', 'здание', 'Bino', NULL),
  ('kunlik-oqish-46', 'вокзала', 'вокзала', 'Vokzalning', NULL),
  ('kunlik-oqish-46', 'найду', 'найду', 'Topaman (СВ)', NULL),
  ('kunlik-oqish-46', 'платформу', 'платформу', 'Platformani', NULL),
  ('kunlik-oqish-46', 'сяду', 'сяду', 'O‘tiraman (СВ)', NULL),
  ('kunlik-oqish-46', 'вагон', 'вагон', 'Vagon', NULL),
  ('kunlik-oqish-46', 'читать', 'читать', 'O‘qimoq', NULL),
  ('kunlik-oqish-46', 'смотреть', 'смотреть', 'Qaramoq', NULL),
  ('kunlik-oqish-46', 'окно', 'окно', 'Deraza', NULL),
  ('kunlik-oqish-46', 'выйдет', 'выйдет', 'Chiqadi (СВ)', NULL),
  ('kunlik-oqish-46', 'встречать', 'встречать', 'Kutib olmoq', NULL),
  ('kunlik-oqish-46', 'перрон', 'перрон', 'Perron', NULL),
  ('kunlik-oqish-46', 'пойдём', 'пойдем', 'Boramiz (piyoda)', NULL),
  ('kunlik-oqish-46', 'недалеко', 'недалеко', 'Uzoq emas', NULL),
  ('kunlik-oqish-46', 'увижу', 'увижу', 'Ko‘raman (СВ)', NULL),
  ('kunlik-oqish-46', 'сад', 'сад', 'Bog‘', NULL),
  ('kunlik-oqish-46', 'огород', 'огород', 'Tomorqa', NULL),
  ('kunlik-oqish-46', 'помогу', 'помогу', 'Yordam beraman', NULL),
  ('kunlik-oqish-46', 'полить', 'полить', 'Sug‘ormoq', NULL),
  ('kunlik-oqish-46', 'грядки', 'грядки', 'Ekin qatorlari', NULL),
  ('kunlik-oqish-46', 'посидим', 'посидим', 'O‘tirib olamiz', NULL),
  ('kunlik-oqish-46', 'веранде', 'веранде', 'Verandada', NULL),
  ('kunlik-oqish-46', 'попьём', 'попьем', 'Ichamiz (СВ)', NULL),
  ('kunlik-oqish-46', 'вареньем', 'вареньем', 'Murabbo bilan', NULL),
  ('kunlik-oqish-46', 'обратно', 'обратно', 'Qaytib', NULL),
  ('kunlik-oqish-46', 'скучать', 'скучать', 'Sog‘inmoq', NULL),
  ('kunlik-oqish-46', 'деревне', 'деревне', 'Qishloqda', NULL),
  ('kunlik-oqish-46', 'Через', 'через', '…dan keyin', NULL),
  ('kunlik-oqish-46', 'город', 'город', 'Shahar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (46, 0, 'Siz qachon safardan qaytasiz?', 'Когда вы вернётесь из поездки?'),
  (46, 1, 'U poyezdga kechikib qoladi, agar hozir chiqmasa.', 'Он опоздает на поезд, если не выйдет сейчас.'),
  (46, 2, 'Biz ertaga ertalab aeroportga boramiz.', 'Завтра утром мы поедем в аэропорт.'),
  (46, 3, 'Ular juda erta ketishdi, poyezdni kutishmadi.', 'Они уехали очень рано, не стали ждать поезд.'),
  (46, 4, 'Iltimos, keyingi bekatda tushing.', 'Пожалуйста, выйдите на следующей остановке.'),
  (46, 5, 'U xonaga kirgach, hamma jim bo‘ldi.', 'Когда он вошёл в комнату, все замолчали.'),
  (46, 6, 'Siz avtobusdan chiqqaningizda, meni kuting.', 'Когда вы выйдете из автобуса, подождите меня.'),
  (46, 7, 'U menga yaqinlashdi va qo‘limdan ushladi.', 'Он подошёл ко мне и взял меня за руку.'),
  (46, 8, 'Ehtiyot bo‘ling, yo‘ldan qayerda o‘tish kerak?', 'Будьте осторожны, где нужно перейти дорогу?'),
  (46, 9, 'U yo‘lakay do‘konga kirdi va non sotib oldi.', 'Он зашёл в магазин по дороге и купил хлеб.');

-- ========== Kun 47 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  47,
  'Niyat va reja: собираться, планировать, хотеть',
  $theory$
**Хотеть** + инфинитив — istak; vaqt baʼzan noaniq.

**Собираться** + инфинитив — yaqin kelajakdagi aniqroq niyat.

**Планировать** + инфинитив — uzoq muddatli / tuzilgan reja.

**Собираюсь читать** (jarayon) vs **собираюсь прочитать** (natija) — ikkalasi mumkin.

Shaxslar: *хочу, хочешь… / собираюсь, собираешься… / планирую, планируете…*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (47, 'rule', 0, '«Men ertaga do‘konga bormoqchiman»', 'Я хочу пойти в магазин завтра.', 'Я собираюсь пойти в магазин завтра.', 'Я планирую пойти в магазин завтра.', 'Все три формы возможны.', 3),
  (47, 'rule', 1, '«U oila qurmoqchi»', 'Он хочет жениться.', 'Он собирается жениться.', 'Он планирует жениться.', 'Все три формы возможны.', 3),
  (47, 'rule', 2, '«Я собираюсь … эту книгу завтра»', 'Только НСВ (читать).', 'Только СВ (прочитать).', 'Обе формы возможны.', 'Обе формы неверны.', 2),
  (47, 'rule', 3, '«Siz bu yozda qayerda dam olmoqchisiz?»', 'Где вы хотите отдыхать этим летом?', 'Где вы собираетесь отдыхать этим летом?', 'Где вы планируете отдыхать этим летом?', 'Все три формы возможны.', 3),
  (47, 'rule', 4, 'Reja eng «rasmiyroq» qaysi gapda?', 'Он хочет закончить проект в декабре.', 'Он собирается закончить проект в декабре.', 'Он планирует закончить проект в декабре.', 'Только прошедшее время.', 2),
  (47, 'rule', 5, '«Men u bilan gaplashmoqchiman»', 'Я хочу поговорить с ним.', 'Я собираюсь поговорить с ним.', 'Я планирую поговорить с ним.', 'Все три формы возможны.', 3),
  (47, 'rule', 6, '«Ertaga ertalab dars tayyorlayman»', 'Я хочу сделать уроки завтра утром.', 'Я собираюсь сделать уроки завтра утром.', 'Я планирую сделать уроки завтра утром.', 'Все три формы возможны.', 3),
  (47, 'rule', 7, '«Qani edi men u yerda bo‘lsam» — eng yaqin ruscha', 'Я хочу быть там.', 'Я собираюсь быть там.', 'Я планирую быть там.', 'Я хотел бы там быть.', 3),
  (47, 'rule', 8, '«Я собираюсь … роман»', 'Только «писать».', 'Только «написать».', 'Обе формы возможны.', 'Нельзя с «собираюсь».', 2),
  (47, 'rule', 9, '«U hech qachon turmushga chiqmoqchi emas»', 'Он не хочет жениться никогда.', 'Он не собирается жениться никогда.', 'Он не планирует жениться никогда.', 'Все три формы возможны.', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (47, 0, 0, 'Хотеть', 'istamoq, xohlamoq'),
  (47, 0, 1, 'Собираться', 'niyat qilmoq, tayyorgarlik ko‘rmoq'),
  (47, 0, 2, 'Планировать', 'rejalashtirmoq'),
  (47, 0, 3, 'Я хочу поехать', 'Men bormoqchiman / borishni xohlayman'),
  (47, 0, 4, 'Я собираюсь уехать', 'Men ketishni rejalashtiryapman'),
  (47, 0, 5, 'Я планирую улететь', 'Men uchib ketmoqchi (reja)'),
  (47, 0, 6, 'Ты хочешь учиться?', 'O‘qishni xohlaysanmi?'),
  (47, 0, 7, 'Ты собираешься учиться?', 'O‘qish niyatidamisan?'),
  (47, 0, 8, 'Что ты планируешь делать?', 'Nima qilishni rejalashtiryapsan?'),
  (47, 0, 9, 'Мы не хотим опаздывать', 'Biz kechikishni xohlamaymiz');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (47, 0, 'uz', '(я, хотеть, купить, новый, телефон, в, этом, месяце)', ARRAY['Я', 'хочу', 'купить', 'новый', 'телефон', 'в', 'этом', 'месяце.', 'куплю'], 'Я хочу купить новый телефон в этом месяце.'),
  (47, 1, 'uz', '(ты, собираться, поступать, в, университет)', ARRAY['Ты', 'собираешься', 'поступать', 'в', 'университет?', 'поступишь'], 'Ты собираешься поступать в университет?'),
  (47, 2, 'uz', '(мы, планировать, отдохнуть, на, море, в, июле)', ARRAY['Мы', 'планируем', 'отдохнуть', 'на', 'море', 'в', 'июле.', 'отдыхаем'], 'Мы планируем отдохнуть на море в июле.'),
  (47, 3, 'uz', '(они, не, хотеть, ехать, на, дачу, в, эту, субботу)', ARRAY['Они', 'не', 'хотят', 'ехать', 'на', 'дачу', 'в', 'эту', 'субботу.', 'поедут'], 'Они не хотят ехать на дачу в эту субботу.'),
  (47, 4, 'uz', '(я, собираться, позвонить, тебе, вечером)', ARRAY['Я', 'собираюсь', 'позвонить', 'тебе', 'вечером.', 'позвоню'], 'Я собираюсь позвонить тебе вечером.'),
  (47, 5, 'uz', '(вы, планировать, закончить, этот, проект, до, пятницы)', ARRAY['Вы', 'планируете', 'закончить', 'этот', 'проект', 'до', 'пятницы?', 'закончите'], 'Вы планируете закончить этот проект до пятницы?'),
  (47, 6, 'uz', '(дети, хотеть, пойти, в, зоопарк, на, выходных)', ARRAY['Дети', 'хотят', 'пойти', 'в', 'зоопарк', 'на', 'выходных.', 'пойдут'], 'Дети хотят пойти в зоопарк на выходных.'),
  (47, 7, 'uz', '(я, не, собираться, тратить, много, деньги, на, это)', ARRAY['Я', 'не', 'собираюсь', 'тратить', 'много', 'денег', 'на', 'это.', 'потрачу'], 'Я не собираюсь тратить много денег на это.'),
  (47, 8, 'uz', '(куда, ты, планировать, поехать, летом)', ARRAY['Куда', 'ты', 'планируешь', 'поехать', 'летом?', 'поедешь'], 'Куда ты планируешь поехать летом?'),
  (47, 9, 'uz', '(мы, хотеть, встретиться, завтра, в, 6, часов)', ARRAY['Мы', 'хотим', 'встретиться', 'завтра', 'в', '6', 'часов.', 'встретимся'], 'Мы хотим встретиться завтра в 6 часов.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (47, 0, 'Xohlamoq', 'Хотеть'),
  (47, 1, 'Niyat qilmoq', 'Собираться'),
  (47, 2, 'Rejalashtirmoq', 'Планировать'),
  (47, 3, 'Orzu', 'Мечта'),
  (47, 4, 'Amalga oshmoq', 'Сбыться'),
  (47, 5, 'Magistratura', 'Магистратура'),
  (47, 6, 'To‘xtab qolmoq', 'Останавливаться'),
  (47, 7, 'Erishilgan', 'Достигнутое'),
  (47, 8, 'Ambitsiyali', 'Амбициозный'),
  (47, 9, 'Ijaraga olmoq', 'Снять'),
  (47, 10, 'Shoshilmoq', 'Торопиться'),
  (47, 11, 'Karera', 'Карьера'),
  (47, 12, 'Uylanmoq', 'Пожениться'),
  (47, 13, 'Biznes ochmoq', 'Открыть бизнес'),
  (47, 14, 'Kelajak', 'Будущее');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  47,
  'Наши планы на будущее',
  $body$
Мы с моей подругой Анной сидим в кафе и обсуждаем наши планы на будущее.

– Что ты хочешь делать после университета?

– Я хочу поехать в Европу. Я собираюсь посмотреть Париж и Рим.

– А работать ты планируешь?

– Конечно, я планирую найти интересную работу по специальности.

– А что ты собираешься делать?

– Я хочу поступить в магистратуру. Я не хочу останавливаться на достигнутом.

Мы оба очень амбициозны. Я думаю, что у нас всё получится.

После университета мы планируем снять квартиру вместе. Мы не собираемся торопиться с семьёй. Сначала карьера, потом семья.

Я уверен, что наши мечты сбудутся.
$body$,
  'kunlik-oqish-47'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-47', 'подругой', 'подругой', 'Qiz do‘st bilan', NULL),
  ('kunlik-oqish-47', 'Анной', 'анной', 'Anna', NULL),
  ('kunlik-oqish-47', 'сидим', 'сидим', 'O‘tiribmiz', NULL),
  ('kunlik-oqish-47', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-47', 'обсуждаем', 'обсуждаем', 'Muhokama qilyapmiz', NULL),
  ('kunlik-oqish-47', 'планы', 'планы', 'Rejalar', NULL),
  ('kunlik-oqish-47', 'будущее', 'будущее', 'Kelajak', NULL),
  ('kunlik-oqish-47', 'хочешь', 'хочешь', 'Xohlaysan', NULL),
  ('kunlik-oqish-47', 'университета', 'университета', 'Universitetdan', NULL),
  ('kunlik-oqish-47', 'хочу', 'хочу', 'Xohlayman', NULL),
  ('kunlik-oqish-47', 'Европу', 'европу', 'Yevropaga', NULL),
  ('kunlik-oqish-47', 'собираюсь', 'собираюсь', 'Niyat qilaman', NULL),
  ('kunlik-oqish-47', 'посмотреть', 'посмотреть', 'Ko‘rishni', NULL),
  ('kunlik-oqish-47', 'работать', 'работать', 'Ishlashni', NULL),
  ('kunlik-oqish-47', 'планируешь', 'планируешь', 'Rejalashtirasizmi', NULL),
  ('kunlik-oqish-47', 'Конечно', 'конечно', 'Albatta', NULL),
  ('kunlik-oqish-47', 'планирую', 'планирую', 'Rejalashtiraman', NULL),
  ('kunlik-oqish-47', 'найти', 'найти', 'Topishni', NULL),
  ('kunlik-oqish-47', 'интересную', 'интересную', 'Qiziqarli', NULL),
  ('kunlik-oqish-47', 'специальности', 'специальности', 'Mutaxassislik bo‘yicha', NULL),
  ('kunlik-oqish-47', 'собираешься', 'собираешься', 'Niyat qilasan', NULL),
  ('kunlik-oqish-47', 'поступить', 'поступить', 'Kirishni (o‘qishga)', NULL),
  ('kunlik-oqish-47', 'магистратуру', 'магистратуру', 'Magistraturaga', NULL),
  ('kunlik-oqish-47', 'останавливаться', 'останавливаться', 'To‘xtab qolmoq', NULL),
  ('kunlik-oqish-47', 'достигнутом', 'достигнутом', 'Erishilganida', NULL),
  ('kunlik-oqish-47', 'оба', 'оба', 'Ikkalamiz ham', NULL),
  ('kunlik-oqish-47', 'амбициозны', 'амбициозны', 'Ambitsiyalimiz', NULL),
  ('kunlik-oqish-47', 'получится', 'получится', 'Chiqadi / bo‘ladi', NULL),
  ('kunlik-oqish-47', 'планируем', 'планируем', 'Rejalashtiramiz', NULL),
  ('kunlik-oqish-47', 'снять', 'снять', 'Ijaraga olmoq', NULL),
  ('kunlik-oqish-47', 'квартиру', 'квартиру', 'Kvartirani', NULL),
  ('kunlik-oqish-47', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-47', 'собираемся', 'собираемся', 'Oilaga shoshilmayapmiz (reja)', NULL),
  ('kunlik-oqish-47', 'торопиться', 'торопиться', 'Shoshilmoq', NULL),
  ('kunlik-oqish-47', 'семьёй', 'семьей', 'Oila bilan', NULL),
  ('kunlik-oqish-47', 'карьера', 'карьера', 'Karera', NULL),
  ('kunlik-oqish-47', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-47', 'мечты', 'мечты', 'Orzular', NULL),
  ('kunlik-oqish-47', 'сбудутся', 'сбудутся', 'Rostga chiqadi', NULL),
  ('kunlik-oqish-47', 'Париж', 'париж', 'Parij', NULL),
  ('kunlik-oqish-47', 'Рим', 'рим', 'Rim', NULL),
  ('kunlik-oqish-47', 'думаю', 'думаю', 'O‘ylayman', NULL),
  ('kunlik-oqish-47', 'уверен', 'уверен', 'Ishonaman', NULL),
  ('kunlik-oqish-47', 'Сначала', 'сначала', 'Avval', NULL),
  ('kunlik-oqish-47', 'потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-47', 'делать', 'делать', 'Qilmoq', NULL),
  ('kunlik-oqish-47', 'Что', 'что', 'Nima', NULL),
  ('kunlik-oqish-47', 'А', 'а', 'Unda', NULL),
  ('kunlik-oqish-47', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-47', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-47', 'наши', 'наши', 'Bizning', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (47, 0, 'Siz universitetni bitirgach nima qilmoqchisiz?', 'Что вы хотите делать после окончания университета?'),
  (47, 1, 'U chet tilini o‘rganish niyatida.', 'Он собирается учить иностранный язык.'),
  (47, 2, 'Biz bu yozda sayohat qilishni rejalashtiryapmiz.', 'Мы планируем путешествовать этим летом.'),
  (47, 3, 'Nega siz uchrashuvga kelishni xohlamaysiz?', 'Почему вы не хотите прийти на встречу?'),
  (47, 4, 'Ular qachon turmush qurishni rejalashtirishyapti?', 'Когда они планируют пожениться?'),
  (47, 5, 'Men keyingi oyda yangi mashina sotib olish niyatidaman.', 'Я собираюсь купить новую машину в следующем месяце.'),
  (47, 6, 'Sizning orzuingiz qanday?', 'Какая у вас мечта?'),
  (47, 7, 'U hech qachon kechirmoqchi emas, uni kechirish qiyin.', 'Он никогда не хочет прощать, его трудно простить.'),
  (47, 8, 'Biz bu muammoni birga hal qilishni rejalashtiryapmiz.', 'Мы планируем решить эту проблему вместе.'),
  (47, 9, 'Kelajakda men o‘z biznesimni ochmoqchiman.', 'В будущем я хочу открыть свой бизнес.');

