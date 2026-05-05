-- Kunlik kun 36–40: Винительный падеж — восприятие, В/НА + куда?, любить, диалоглар, такрорlash.

-- ========== Kun 36 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 36;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 36
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 36;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 36;

DELETE FROM public.daily_vocab_words WHERE day_number = 36;

DELETE FROM public.daily_grammar_matches WHERE day_number = 36;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 36;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 36;
DELETE FROM public.daily_grammar_topics WHERE day_number = 36;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  36,
  'Винительный падеж: восприятие и прямая речь',
  $theory$
**Видеть** кого? что? — Я вижу брата.

**Смотреть на** кого? что? — predlog **НА**.

**Слушать / слышать:** слушать музыку (jarayon), слышать шум (natija).

**Знать, понимать, помнить, забыть** + В.п.

**Ждать / встречать** кого? что?

Диалогда shaxslar va predmetlar В.п. da bir xil qoida bilan.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (36, 'rule', 0, '«Men ukamni ko‘ryapman»', 'Я смотрю брата.', 'Я вижу брата.', 'Я слушаю брата.', 'Я знаю брата.', 1),
  (36, 'rule', 1, '«U devorga qarayapti»', 'Он смотрит на стену.', 'Он видит стену.', 'Он слушает стену.', 'Он знает стену.', 0),
  (36, 'rule', 2, '«Men musiqa tinglayapman»', 'Я слышу музыку.', 'Я слушаю музыку.', 'Я вижу музыку.', 'Я знаю музыку.', 1),
  (36, 'rule', 3, '«Men avtobusni kutyapman»', 'Я жду автобус.', 'Я ищу автобус.', 'Я вижу автобус.', 'Я слышу автобус.', 0),
  (36, 'rule', 4, '«U meni tushunadi»', 'Он понимает меня.', 'Он понимает мной.', 'Он понимает мне.', 'Он понимает я.', 0),
  (36, 'rule', 5, '«U ularni eslaydi»', 'Он помнит их.', 'Он помнит ими.', 'Он помнит им.', 'Он помнит они.', 0),
  (36, 'rule', 6, '«Men bu qizni bilaman»', 'Я знаю эту девушку.', 'Я знаю этой девушке.', 'Я знаю этой девушкой.', 'Я знаю эта девушка.', 0),
  (36, 'rule', 7, '«U shovqinni eshitdi»', 'Он услышал шум.', 'Он слушал шум.', 'Он смотрел на шум.', 'Он знал шум.', 0),
  (36, 'rule', 8, '«Ular bizni aeroportda kutib olishdi»', 'Они встретили нас в аэропорту.', 'Они встретили нам в аэропорту.', 'Они встретили нами в аэропорту.', 'Они встретили мы в аэропорту.', 0),
  (36, 'rule', 9, '«Men bu xatni unutdim»', 'Я забыл это письмо.', 'Я забыл этому письму.', 'Я забыл этим письмом.', 'Я забыл этого письма.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (36, 0, 0, 'Видеть', 'видеть друга'),
  (36, 0, 1, 'Смотреть', 'смотреть на небо'),
  (36, 0, 2, 'Слушать', 'слушать музыку'),
  (36, 0, 3, 'Слышать', 'слышать голос'),
  (36, 0, 4, 'Знать', 'знать правду'),
  (36, 0, 5, 'Понимать', 'понимать урок'),
  (36, 0, 6, 'Ждать', 'ждать автобус'),
  (36, 0, 7, 'Встречать', 'встречать гостей'),
  (36, 0, 8, 'Помнить', 'помнить детство'),
  (36, 0, 9, 'Забыть', 'забыть ключи');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (36, 0, 'uz', '(я, вижу, на, улице, своего, друг)', ARRAY['Я', 'вижу', 'на', 'улице', 'своего', 'друга.', 'друг'], 'Я вижу на улице своего друга.'),
  (36, 1, 'uz', '(она, смотрит, на, окно, и, думает)', ARRAY['Она', 'смотрит', 'на', 'окно', 'и', 'думает.', 'думаю'], 'Она смотрит на окно и думает.'),
  (36, 2, 'uz', '(мы, слушали, новую, песню, вчера)', ARRAY['Мы', 'слушали', 'новую', 'песню', 'вчера.', 'слушаем'], 'Мы слушали новую песню вчера.'),
  (36, 3, 'uz', '(ты, слышишь, этот, звук)', ARRAY['Ты', 'слышишь', 'этот', 'звук?', 'слышу'], 'Ты слышишь этот звук?'),
  (36, 4, 'uz', '(они, знают, правильный, ответ)', ARRAY['Они', 'знают', 'правильный', 'ответ.', 'ответа'], 'Они знают правильный ответ.'),
  (36, 5, 'uz', '(я, не, понимаю, что, ты, говоришь)', ARRAY['Я', 'не', 'понимаю,', 'что', 'ты', 'говоришь.', 'понимаешь'], 'Я не понимаю, что ты говоришь.'),
  (36, 6, 'uz', '(мы, ждём, нашего, преподавателя, у, двери)', ARRAY['Мы', 'ждём', 'нашего', 'преподавателя', 'у', 'двери.', 'ждёмте'], 'Мы ждём нашего преподавателя у двери.'),
  (36, 7, 'uz', '(вы, встретили, своего, старого, друга, вчера)', ARRAY['Вы', 'встретили', 'своего', 'старого', 'друга', 'вчера?', 'встретились'], 'Вы встретили своего старого друга вчера?'),
  (36, 8, 'uz', '(я, всегда, помню, твой, день, рождения)', ARRAY['Я', 'всегда', 'помню', 'твой', 'день', 'рождения.', 'помнишь'], 'Я всегда помню твой день рождения.'),
  (36, 9, 'uz', '(он, забыл, свой, телефон, дома)', ARRAY['Он', 'забыл', 'свой', 'телефон', 'дома.', 'телефона'], 'Он забыл свой телефон дома.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (36, 0, 'Qaramoq (на)', 'Смотреть (на)'),
  (36, 1, 'Ko‘rmoq (sezgi)', 'Видеть'),
  (36, 2, 'Tinglamoq', 'Слушать'),
  (36, 3, 'Eshitmoq', 'Слышать'),
  (36, 4, 'Bilmoq', 'Знать'),
  (36, 5, 'Tushunmoq', 'Понимать'),
  (36, 6, 'Kutmoq', 'Ждать'),
  (36, 7, 'Kutib olmoq', 'Встречать'),
  (36, 8, 'Eslamoq', 'Помнить'),
  (36, 9, 'Unutmoq', 'Забывать / забыть'),
  (36, 10, 'Payqamoq', 'Замечать'),
  (36, 11, 'Kuzatmoq', 'Наблюдать'),
  (36, 12, 'His qilmoq', 'Чувствовать'),
  (36, 13, 'Sayrash', 'Пение'),
  (36, 14, 'Aks', 'Отражение');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  36,
  'В парке',
  $body$
Сегодня утром я пошёл в парк. Погода была прекрасная.

Я слышал пение птиц и видел маленькую белку. Она сидела на дереве и грызла орех. Я долго смотрел на неё.

Потом я услышал знакомый голос. Это был мой старый друг Антон. Он тоже гулял по парку.

– Привет! Я тебя не видел целую вечность!

– Я тоже рад тебя видеть.

Мы решили выпить кофе в парковом кафе. Я заказал кофе и пирожное, а он — чай с лимоном.

Мы вспоминали наши школьные годы. Антон рассказал мне о своей новой работе. Я внимательно слушал его.

После кафе мы долго гуляли и разговаривали. Я очень ценю нашу дружбу.
$body$,
  'kunlik-oqish-36'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-36', 'пение', 'пение', 'Sayrash', NULL),
  ('kunlik-oqish-36', 'белку', 'белку', 'Sincapni', NULL),
  ('kunlik-oqish-36', 'грызла', 'грызла', 'Chaynardilar', NULL),
  ('kunlik-oqish-36', 'услышал', 'услышал', 'Eshitdim', NULL),
  ('kunlik-oqish-36', 'заказал', 'заказал', 'Buyurtdim', NULL),
  ('kunlik-oqish-36', 'вспоминали', 'вспоминали', 'Esladik', NULL),
  ('kunlik-oqish-36', 'рассказал', 'рассказал', 'Aytib berdi', NULL),
  ('kunlik-oqish-36', 'слушал', 'слушал', 'Tingladim', NULL),
  ('kunlik-oqish-36', 'гуляли', 'гуляли', 'Sayr qildik', NULL),
  ('kunlik-oqish-36', 'ценю', 'ценю', 'Qadrlayman', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (36, 0, 'Siz qushlarning sayrashini eshitasizmi?', 'Вы слышите пение птиц?'),
  (36, 1, 'U oynaga qarab, o‘z aksini ko‘rdi.', 'Он посмотрел в зеркало и увидел своё отражение.'),
  (36, 2, 'Iltimos, meni diqqat bilan tinglang.', 'Пожалуйста, слушайте меня внимательно.'),
  (36, 3, 'Siz bu odamni bilasizmi? – Ha, men uni taniyman.', 'Вы знаете этого человека? – Да, я его знаю.'),
  (36, 4, 'Bolalar, men sizlarni yaxshi tushunaman.', 'Дети, я вас хорошо понимаю.'),
  (36, 5, 'U kechki poyezdni kutyapti.', 'Он ждёт вечерний поезд.'),
  (36, 6, 'Kechagi bayramda biz ko‘plab qadrdonlarni uchratdik.', 'На вчерашнем празднике мы встретили много близких.'),
  (36, 7, 'Nega siz do‘stingizning tug‘ilgan kunini unutdingiz?', 'Почему вы забыли день рождения своего друга?'),
  (36, 8, 'U o‘zining birinchi muvaffaqiyatini hali hamon eslaydi.', 'Он до сих пор помнит свой первый успех.'),
  (36, 9, 'Siz ertangi uchrashuvni unutmang.', 'Не забывайте завтрашнюю встречу.');

-- ========== Kun 37 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 37;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 37
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 37;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 37;

DELETE FROM public.daily_vocab_words WHERE day_number = 37;

DELETE FROM public.daily_grammar_matches WHERE day_number = 37;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 37;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 37;
DELETE FROM public.daily_grammar_topics WHERE day_number = 37;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  37,
  'Глаголы движения + В / НА + винительный (куда?)',
  $theory$
**Куда?** yo‘nalish: **в** (ichkariga, hudud) — в школу, в Москву; **на** (ish, ochiq joy, yuzaga) — на работу, на стадион, на юг.

**Положить на стол** vs kontekst bo‘yicha **в сумку**.

**Сесть на стул** — stul **ustiga**.

Ходить **в театр**, emas ×на театр.

**Ехать на юг**, **в Россию**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (37, 'rule', 0, '«Men maktabga ketyapman»', 'Я иду в школу.', 'Я иду на школу.', 'Я иду в школе.', 'Я иду на школе.', 0),
  (37, 'rule', 1, '«Biz stadionga boramiz»', 'Мы едем в стадион.', 'Мы едем на стадион.', 'Мы едем в стадионе.', 'Мы едем на стадионе.', 1),
  (37, 'rule', 2, '«U kitobni stolga qo‘ydi»', 'Он положил книгу на стол.', 'Он положил книгу в стол.', 'Он положил книгу на столе.', 'Он положил книгу в столе.', 0),
  (37, 'rule', 3, '«Men Rossiyaga boraman»', 'Я еду в Россию.', 'Я еду на Россию.', 'Я еду в России.', 'Я еду на России.', 0),
  (37, 'rule', 4, '«U konsertga bormoqchi»', 'Он хочет пойти на концерт.', 'Он хочет пойти в концерт.', 'Он хочет пойти на концерте.', 'Он хочет пойти в концерте.', 0),
  (37, 'rule', 5, '«U sumkani polga qo‘ydi»', 'Она поставила сумку на пол.', 'Она поставила сумку в пол.', 'Она поставила сумку на полу.', 'Она поставила сумку в полу.', 0),
  (37, 'rule', 6, '«Kafe» — qayerga?', 'Пойдём в кафе?', 'Пойдём на кафе?', 'Пойдём к кафе на?', 'Пойдём для кафе?', 0),
  (37, 'rule', 7, '«U kitobni javonga qo‘ydi»', 'Он поставил книгу на полку.', 'Он поставил книгу в полку.', 'Он поставил книгу на полке.', 'Он поставил книгу в полке.', 0),
  (37, 'rule', 8, 'Qaysi gap yo‘nalish bo‘yicha xato?', 'Я иду на почту.', 'Я иду в аптеку.', 'Я иду на театр.', 'Ikkinchi ham to‘g‘ri', 2),
  (37, 'rule', 9, '«Ular shimolga sayohat qilishadi»', 'Они путешествуют на север.', 'Они путешествуют в север.', 'Они путешествуют на севере.', 'Они путешествуют в севере.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (37, 0, 0, 'Идти', 'в школу'),
  (37, 0, 1, 'Ехать', 'на работу'),
  (37, 0, 2, 'Пойти', 'на стадион'),
  (37, 0, 3, 'Поехать', 'в Москву'),
  (37, 0, 4, 'Положить', 'на стол'),
  (37, 0, 5, 'Поставить', 'в шкаф'),
  (37, 0, 6, 'Сесть', 'на стул'),
  (37, 0, 7, 'Положить (мелкий предмет)', 'в карман'),
  (37, 0, 8, 'Отправиться', 'в путешествие'),
  (37, 0, 9, 'Приехать', 'в гости');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (37, 0, 'uz', '(я, иду, в, школу, каждое, утро)', ARRAY['Я', 'иду', 'в', 'школу', 'каждое', 'утро.', 'школе'], 'Я иду в школу каждое утро.'),
  (37, 1, 'uz', '(он, положил, ключи, на, стол)', ARRAY['Он', 'положил', 'ключи', 'на', 'стол.', 'стола'], 'Он положил ключи на стол.'),
  (37, 2, 'uz', '(мы, едем, на, юг, летом)', ARRAY['Мы', 'едем', 'на', 'юг', 'летом.', 'в'], 'Мы едем на юг летом.'),
  (37, 3, 'uz', '(дети, сели, на, стулья, и, начали, есть)', ARRAY['Дети', 'сели', 'на', 'стулья', 'и', 'начали', 'есть.', 'стул'], 'Дети сели на стулья и начали есть.'),
  (37, 4, 'uz', '(поставь, цветы, на, окно)', ARRAY['Поставь', 'цветы', 'на', 'окно.', 'в'], 'Поставь цветы на окно.'),
  (37, 5, 'uz', '(когда, ты, поедешь, в, Москву)', ARRAY['Когда', 'ты', 'поедешь', 'в', 'Москву?', 'Москве'], 'Когда ты поедешь в Москву?'),
  (37, 6, 'uz', '(я, положил, деньги, в, карман)', ARRAY['Я', 'положил', 'деньги', 'в', 'карман.', 'на'], 'Я положил деньги в карман.'),
  (37, 7, 'uz', '(она, пошла, на, работу, вчера)', ARRAY['Она', 'пошла', 'на', 'работу', 'вчера.', 'в'], 'Она пошла на работу вчера.'),
  (37, 8, 'uz', '(куда, ты, идёшь, – в, театр)', ARRAY['Куда', 'ты', 'идёшь?', '–', 'В', 'театр.', 'На'], 'Куда ты идёшь? – В театр.'),
  (37, 9, 'uz', '(мы, приехали, в, Санкт-Петербург, на, поезде)', ARRAY['Мы', 'приехали', 'в', 'Санкт-Петербург', 'на', 'поезде.', 'на поезд'], 'Мы приехали в Санкт-Петербург на поезде.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (37, 0, 'Qayerga?', 'Куда?'),
  (37, 1, 'Ichkariga (В)', 'В (направление)'),
  (37, 2, 'Ustiga (НА)', 'На (направление)'),
  (37, 3, 'Qo‘ymoq (gorizontal)', 'Положить'),
  (37, 4, 'Qo‘ymoq (vertikal)', 'Поставить'),
  (37, 5, 'O‘tirmoq', 'Сесть'),
  (37, 6, 'Bormoq (transport)', 'Ехать'),
  (37, 7, 'Bormoq (piyoda)', 'Идти / пойти'),
  (37, 8, 'Qishloq', 'Деревня'),
  (37, 9, 'Bagajnik', 'Багажник'),
  (37, 10, 'Dala', 'Поле'),
  (37, 11, 'O‘rmon', 'Лес'),
  (37, 12, 'Yetib kelmoq', 'Приехать'),
  (37, 13, 'Daryo', 'Речка'),
  (37, 14, 'Cho‘milmoq', 'Купаться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  37,
  'Путешествие',
  $body$
Летом мы решили поехать в деревню к бабушке.

В воскресенье утром мы собрали вещи и положили их в чемоданы. Папа поставил чемоданы в багажник машины. Мы сели в машину и поехали.

По дороге мы смотрели в окно и видели красивые поля и леса. Через три часа мы приехали в деревню.

Бабушка встретила нас у входа. Мы зашли в дом и поставили вещи в комнату.

Бабушка поставила на стол вкусный пирог и чай. Мы сели на стулья и начали ужинать.

После ужина мы пошли на речку. Вода была тёплой, и мы купались. Этот день был прекрасным.
$body$,
  'kunlik-oqish-37'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-37', 'чемоданы', 'чемоданы', 'Chamadonlar', NULL),
  ('kunlik-oqish-37', 'багажник', 'багажник', 'Bagajnik', NULL),
  ('kunlik-oqish-37', 'поля', 'поля', 'Dalalar', NULL),
  ('kunlik-oqish-37', 'входа', 'входа', 'Kirish joyi', NULL),
  ('kunlik-oqish-37', 'зашли', 'зашли', 'Kirishdi', NULL),
  ('kunlik-oqish-37', 'пирог', 'пирог', 'Pirog', NULL),
  ('kunlik-oqish-37', 'ужинать', 'ужинать', 'Kechki ovqat', NULL),
  ('kunlik-oqish-37', 'речку', 'речку', 'Daryoga', NULL),
  ('kunlik-oqish-37', 'купались', 'купались', 'Cho‘mildik', NULL),
  ('kunlik-oqish-37', 'прекрасным', 'прекрасным', 'Ajoyib', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (37, 0, 'Siz qayerga sayohat qilishni yoqtirasiz?', 'Куда вы любите путешествовать?'),
  (37, 1, 'Kechirasiz, bu ko‘chaning narigi tomoniga qanday o‘tish mumkin?', 'Извините, как перейти на ту сторону улицы?'),
  (37, 2, 'U kalitlarni stol ustiga qo‘ydi va ketib qoldi.', 'Он положил ключи на стол и ушёл.'),
  (37, 3, 'Bolalar, doskaga qarang va yangi so‘zlarni ko‘chiring.', 'Дети, посмотрите на доску и перепишите новые слова.'),
  (37, 4, 'Kelasi hafta biz ish safariga Moskvaga boramiz.', 'На следующей неделе мы едем в командировку в Москву.'),
  (37, 5, 'Nega siz bu rasmlarni devorga osib qo‘ymadingiz?', 'Почему вы не повесили эти картины на стену?'),
  (37, 6, 'Qishda qushlarni oziqlantirish uchun, donni qor yog‘maydigan joyga qo‘ying.', 'Зимой, чтобы кормить птиц, кладите зерно туда, где нет снега.'),
  (37, 7, 'U uni qo‘lidan ushlab, ko‘chaning narigi tomoniga olib o‘tdi.', 'Он взял её за руку и перевёл на другую сторону улицы.'),
  (37, 8, 'Biz yangi kvartiraga ko‘chib o‘tganimizda, hamma mebelni o‘zimiz yig‘dik.', 'Когда мы переехали в новую квартиру, мы сами собрали всю мебель.'),
  (37, 9, 'Siz bu hujjatlarni qaysi papkaga joyladingiz?', 'В какую папку вы положили эти документы?');

-- ========== Kun 38 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 38;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 38
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 38;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 38;

DELETE FROM public.daily_vocab_words WHERE day_number = 38;

DELETE FROM public.daily_grammar_matches WHERE day_number = 38;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 38;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 38;
DELETE FROM public.daily_grammar_topics WHERE day_number = 38;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  38,
  '«Я люблю» + кого/что и родственные глаголы',
  $theory$
**Любить / обожать / уважать / ценить** + Винительный падеж.

**Мне нравится** этот фильм — boshqa tuzilish (дательный для лица).

**Любить + инфинитив:** Я люблю **читать**.

Типичные формы: люблю **маму**, люблю **этот город**, люблю **своих детей**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (38, 'rule', 0, '«Men onamni sevaman»', 'Я люблю мама.', 'Я люблю маму.', 'Я люблю маме.', 'Я люблю мамой.', 1),
  (38, 'rule', 1, '«U bu qo‘shiqni yaxshi ko‘radi»', 'Он любит эта песня.', 'Он любит эту песню.', 'Он любит этой песней.', 'Он любит этой песне.', 1),
  (38, 'rule', 2, '«Menga bu film yoqadi»', 'Мне нравится этот фильм.', 'Я нравлюсь этот фильм.', 'Мне нравится этого фильма.', 'Я нравлюсь этого фильма.', 0),
  (38, 'rule', 3, '«Men o‘qishni yaxshi ko‘raman»', 'Я люблю читать.', 'Я люблю читаю.', 'Я люблю читает.', 'Я люблю читаем.', 0),
  (38, 'rule', 4, '«Men muzqaymoqni juda yaxshi ko‘raman»', 'Я обожаю мороженое.', 'Я обожаю мороженого.', 'Я обожаю мороженому.', 'Я обожаю мороженым.', 0),
  (38, 'rule', 5, '«U akasini juda hurmat qiladi»', 'Он очень уважает своего брата.', 'Он очень уважает своему брату.', 'Он очень уважает своим братом.', 'Он очень уважает своего брату.', 0),
  (38, 'rule', 6, '«U do‘stligimizni qadrlaydi»', 'Он ценит нашу дружбу.', 'Он ценит нашей дружбе.', 'Он ценит нашей дружбой.', 'Он ценит наша дружба.', 0),
  (38, 'rule', 7, '«Bolalar, men sizlarni sevaman»', 'Дети, я люблю вас.', 'Дети, я люблю вы.', 'Дети, я люблю вам.', 'Дети, я люблю вами.', 0),
  (38, 'rule', 8, '«Любить» + инфинитив', 'Я люблю путешествовать.', 'Я люблю путешествую.', 'Я люблю путешествуешь.', 'Я люблю путешествуют.', 0),
  (38, 'rule', 9, '«U nevaralarini juda sevadi»', 'Он очень любит своих внуков.', 'Он очень любит своим внукам.', 'Он очень любит своими внуками.', 'Он очень любит свои внуки.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (38, 0, 0, 'Men onamni sevaman.', 'Я люблю маму.'),
  (38, 0, 1, 'Men bu shaharni yaxshi ko‘raman.', 'Я люблю этот город.'),
  (38, 0, 2, 'U singlisini sevadi.', 'Он любит свою сестру.'),
  (38, 0, 3, 'Biz o‘qituvchimizni hurmat qilamiz.', 'Мы уважаем нашего учителя.'),
  (38, 0, 4, 'Men o‘qishni yaxshi ko‘raman.', 'Я люблю читать.'),
  (38, 0, 5, 'U o‘z ishini sevadi.', 'Он любит свою работу.'),
  (38, 0, 6, 'Men musiqani yaxshi ko‘raman.', 'Я люблю музыку.'),
  (38, 0, 7, 'U mushuklarni juda yaxshi ko‘radi.', 'Она обожает кошек.'),
  (38, 0, 8, 'Men bahorni yaxshi ko‘raman.', 'Я люблю весну.'),
  (38, 0, 9, 'U do‘stlarini qadrlaydi.', 'Он ценит друзей.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (38, 0, 'uz', '(я, любить, свою, маму)', ARRAY['Я', 'люблю', 'свою', 'маму.', 'мама'], 'Я люблю свою маму.'),
  (38, 1, 'uz', '(он, любить, этот, фильм)', ARRAY['Он', 'любит', 'этот', 'фильм.', 'эту'], 'Он любит этот фильм.'),
  (38, 2, 'uz', '(мы, любить, читать, книги, вечером)', ARRAY['Мы', 'любим', 'читать', 'книги', 'вечером.', 'читаем'], 'Мы любим читать книги вечером.'),
  (38, 3, 'uz', '(ты, любить, кофе, или, чай)', ARRAY['Ты', 'любишь', 'кофе', 'или', 'чай?', 'любите'], 'Ты любишь кофе или чай?'),
  (38, 4, 'uz', '(она, обожает, свою, работу)', ARRAY['Она', 'обожает', 'свою', 'работу.', 'работа'], 'Она обожает свою работу.'),
  (38, 5, 'uz', '(дети, любить, играть, на, улице)', ARRAY['Дети', 'любят', 'играть', 'на', 'улице.', 'играют'], 'Дети любят играть на улице.'),
  (38, 6, 'uz', '(вы, любить, путешествовать, на, поезде)', ARRAY['Вы', 'любите', 'путешествовать', 'на', 'поезде?', 'путешествуете'], 'Вы любите путешествовать на поезде?'),
  (38, 7, 'uz', '(я, уважаю, своего, учителя)', ARRAY['Я', 'уважаю', 'своего', 'учителя.', 'учитель'], 'Я уважаю своего учителя.'),
  (38, 8, 'uz', '(мы, ценим, нашу, дружбу)', ARRAY['Мы', 'ценим', 'нашу', 'дружбу.', 'наша'], 'Мы ценим нашу дружбу.'),
  (38, 9, 'uz', '(почему, ты, не, любишь, этот, город)', ARRAY['Почему', 'ты', 'не', 'любишь', 'этот', 'город?', 'любите'], 'Почему ты не любишь этот город?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (38, 0, 'Sevmoq', 'Любить'),
  (38, 1, 'Juda sevmoq', 'Обожать'),
  (38, 2, 'Yoqmoq (мне нравится)', 'Нравиться'),
  (38, 3, 'Hurmat qilmoq', 'Уважать'),
  (38, 4, 'Qadrlamoq', 'Ценить'),
  (38, 5, 'Sayohat qilmoq', 'Путешествовать'),
  (38, 6, 'Tatib ko‘rmoq', 'Пробовать'),
  (38, 7, 'Ishtiyoq', 'Страсть'),
  (38, 8, 'Qo‘llab-quvvatlamoq', 'Поддерживать'),
  (38, 9, 'Qiyin daqiqa', 'Трудная минута'),
  (38, 10, 'Tug‘ilib o‘sgan joy', 'Родное место'),
  (38, 11, 'Bino', 'Здание'),
  (38, 12, 'Uy hayvoni', 'Домашнее животное'),
  (38, 13, 'Ayniqsa', 'Особенно'),
  (38, 14, 'Vaqt ajratmoq', 'Уделять время');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  38,
  'Что я люблю',
  $body$
Все люди что-то любят. Я тоже очень люблю многие вещи.

Во-первых, я люблю свою семью. Мои родители и брат — самые родные для меня люди.

Я люблю своих друзей. Они всегда поддерживают меня в трудную минуту.

Я очень люблю своё родное место — свой город. Я люблю гулять по его улицам, смотреть на старые здания.

Я люблю слушать музыку, читать книги и смотреть интересные фильмы.

Ещё я очень люблю путешествовать. Узнавать новые места, встречать новых людей и пробовать новую еду — это моя страсть.

Конечно, я люблю и отдыхать. Но главное — я люблю жизнь.
$body$,
  'kunlik-oqish-38'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-38', 'родные', 'родные', 'Qadrdon', NULL),
  ('kunlik-oqish-38', 'поддерживают', 'поддерживают', 'Qo‘llab-quvvatlaydi', NULL),
  ('kunlik-oqish-38', 'родное', 'родное', 'Tug‘ilgan joy', NULL),
  ('kunlik-oqish-38', 'здания', 'здания', 'Binolar', NULL),
  ('kunlik-oqish-38', 'путешествовать', 'путешествовать', 'Sayohat qilish', NULL),
  ('kunlik-oqish-38', 'пробовать', 'пробовать', 'Tatib ko‘rish', NULL),
  ('kunlik-oqish-38', 'страсть', 'страсть', 'Ishtiyoq', NULL),
  ('kunlik-oqish-38', 'отдыхать', 'отдыхать', 'Dam olmoq', NULL),
  ('kunlik-oqish-38', 'жизнь', 'жизнь', 'Hayot', NULL),
  ('kunlik-oqish-38', 'вещи', 'вещи', 'Narsalar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (38, 0, 'Siz qanday kitoblarni o‘qishni yaxshi ko‘rasiz?', 'Какие книги вы любите читать?'),
  (38, 1, 'Men qishdan ko‘ra bahorni ko‘proq yaxshi ko‘raman.', 'Я люблю весну больше, чем зиму.'),
  (38, 2, 'U kechki payt sayr qilishni yaxshi ko‘radi.', 'Он любит гулять вечером.'),
  (38, 3, 'Biz bu restoranda pishirilgan lag‘monni yaxshi ko‘ramiz.', 'Мы любим лагман, который готовят в этом ресторане.'),
  (38, 4, 'Nega siz televizor ko‘rishni yoqtirmaysiz?', 'Почему вы не любите смотреть телевизор?'),
  (38, 5, 'U yangi texnologiyalarni o‘rganishni yaxshi ko‘radi.', 'Он любит изучать новые технологии.'),
  (38, 6, 'Bolaligimda men rasm chizishni juda yaxshi ko‘rardim.', 'В детстве я очень любил рисовать.'),
  (38, 7, 'Siz qahvani qanday qilib ichishni yaxshi ko‘rasiz? – Qaymoq bilan.', 'Как вы любите пить кофе? – Со сливками.'),
  (38, 8, 'U uy hayvonlarini, ayniqsa mushuklarni, juda yaxshi ko‘radi.', 'Он очень любит домашних животных, особенно кошек.'),
  (38, 9, 'Men o‘zimning yaqinlarimga vaqt ajratishni qadrlayman.', 'Я ценю время, проведённое с близкими.');

-- ========== Kun 39 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 39;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 39
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 39;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 39;

DELETE FROM public.daily_vocab_words WHERE day_number = 39;

DELETE FROM public.daily_grammar_matches WHERE day_number = 39;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 39;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 39;
DELETE FROM public.daily_grammar_topics WHERE day_number = 39;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  39,
  'Винительный падеж в диалогах (практика)',
  $theory$
Dialog va matnda В.п. **видеть / слушать / ждать / любить / понимать / положить / в… / на…** bilan birga takrorlanadi.

**Я вас дождусь** — kelasi zamon + В.п.

**Вчерашний фильм** — В.п. shakli jins bilan kelishi mumkin.

So‘z tartibi: **Я встречу вас на вокзале** (emeas «на вокзале вас»).

**Ошибки** (неодуш. мн.) — **их ошибки** (nom bilan bir xil ko‘plikda).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (39, 'rule', 0, '«Siz meni tushunyapsizmi?»', 'Вы понимаете я?', 'Вы понимаете меня?', 'Вы понимаете мне?', 'Вы понимаете мной?', 1),
  (39, 'rule', 1, '«U kechagi kinoni ko‘rgan»', 'Он видел вчерашний фильм.', 'Он видел вчерашнего фильма.', 'Он видел вчерашнему фильму.', 'Он видел вчерашним фильмом.', 0),
  (39, 'rule', 2, '«Ishga bormoq»', 'Идти на работу.', 'Идти в работу.', 'Идти на работе.', 'Идти в работе.', 0),
  (39, 'rule', 3, '«Bolalar, men sizlarni kutib qolaman»', 'Дети, я вас дождусь.', 'Дети, я вам дождусь.', 'Дети, я вами дождусь.', 'Дети, я вы дождусь.', 0),
  (39, 'rule', 4, '«U talabani kutmoqda»', 'Он ждёт студент.', 'Он ждёт студента.', 'Он ждёт студенту.', 'Он ждёт студентом.', 1),
  (39, 'rule', 5, '«Men sizning maslahatingizni qadrlayman»', 'Я ценю ваш совет.', 'Я ценю вашего совета.', 'Я ценю вашему совету.', 'Я ценю вашим советом.', 0),
  (39, 'rule', 6, '«U bu sartaroshxonani yaxshi ko‘radi»', 'Он обожает эту парикмахерскую.', 'Он обожает этой парикмахерской.', 'Он обожает парикмахерскую без предлога.', 'Он обожает этим парикмахерским.', 0),
  (39, 'rule', 7, '«Ular bizni kutib olishmadi»', 'Они не встретили нас.', 'Они не встретили нам.', 'Они не встретили нами.', 'Они не встретили мы.', 0),
  (39, 'rule', 8, '«Men yangi o‘yinchoqlarni ko‘rdim»', 'Я видел новые игрушки.', 'Я видел новых игрушек.', 'Я видел новым игрушкам.', 'Я видел новыми игрушками.', 0),
  (39, 'rule', 9, '«Nega ularning xatolarini tuzatmaysiz?»', 'Почему вы не исправляете их ошибки?', 'Почему вы не исправляете их ошибкам?', 'Почему вы не исправляете их ошибками?', 'Почему вы не исправляете их ошибок?', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (39, 0, 0, 'Вчера я встретил', 'нашего нового учителя.'),
  (39, 0, 1, 'Мы очень любим', 'свой старый дом.'),
  (39, 0, 2, 'Он всегда забывает', 'свои обещания.'),
  (39, 0, 3, 'Ты помнишь', 'мой день рождения.'),
  (39, 0, 4, 'Я никогда не видел', 'этот фильм.'),
  (39, 0, 5, 'Она купила', 'свою бабушку.'),
  (39, 0, 6, 'Мы ждём', 'автобус уже 20 минут.'),
  (39, 0, 7, 'Дети, слушайте', 'меня внимательно.'),
  (39, 0, 8, 'Я положил ключи', 'на полку.'),
  (39, 0, 9, 'Он поставил вазу', 'на стол.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (39, 0, 'uz', '(вчера, я, видел, своего, старого, друга, на, улице)', ARRAY['Вчера', 'я', 'видел', 'своего', 'старого', 'друга', 'на', 'улице.', 'видела'], 'Вчера я видел своего старого друга на улице.'),
  (39, 1, 'uz', '(мы, любить, гулять, в, парке, вечером)', ARRAY['Мы', 'любим', 'гулять', 'в', 'парке', 'вечером.', 'любят'], 'Мы любим гулять в парке вечером.'),
  (39, 2, 'uz', '(ты, когда, положил, книгу, на, стол)', ARRAY['Когда', 'ты', 'положил', 'книгу', 'на', 'стол?', 'положила'], 'Когда ты положил книгу на стол?'),
  (39, 3, 'uz', '(они, не, слышали, наш, телефонный, звонок)', ARRAY['Они', 'не', 'слышали', 'наш', 'телефонный', 'звонок.', 'слышит'], 'Они не слышали наш телефонный звонок.'),
  (39, 4, 'uz', '(почему, вы, не, уважаете, своих, родителей)', ARRAY['Почему', 'вы', 'не', 'уважаете', 'своих', 'родителей?', 'родители'], 'Почему вы не уважаете своих родителей?'),
  (39, 5, 'uz', '(я, всегда, помню, этот, день)', ARRAY['Я', 'всегда', 'помню', 'этот', 'день.', 'помнишь'], 'Я всегда помню этот день.'),
  (39, 6, 'uz', '(дети, ждут, свою, маму, у, школы)', ARRAY['Дети', 'ждут', 'свою', 'маму', 'у', 'школы.', 'ждём'], 'Дети ждут свою маму у школы.'),
  (39, 7, 'uz', '(он, никогда, не, забывает, наш, адрес)', ARRAY['Он', 'никогда', 'не', 'забывает', 'наш', 'адрес.', 'забыл'], 'Он никогда не забывает наш адрес.'),
  (39, 8, 'uz', '(мы, поехали, в, Крым, на, поезде)', ARRAY['Мы', 'поехали', 'в', 'Крым', 'на', 'поезде.', 'Крыму'], 'Мы поехали в Крым на поезде.'),
  (39, 9, 'uz', '(вы, смотрите, на, эту, картину, и, не, понимаете)', ARRAY['Вы', 'смотрите', 'на', 'эту', 'картину', 'и', 'не', 'понимаете.', 'этот'], 'Вы смотрите на эту картину и не понимаете.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (39, 0, 'Xat', 'Письмо'),
  (39, 1, 'Olomon', 'Толпа'),
  (39, 2, 'Vagon', 'Вагон'),
  (39, 3, 'Quchoqlashmoq', 'Обняться'),
  (39, 4, 'Loyiha', 'Проект'),
  (39, 5, 'Bo‘lishmoq (fikr)', 'Делиться'),
  (39, 6, 'Yarim tun', 'Полночь'),
  (39, 7, 'Kuzatib qo‘ymoq', 'Провожать'),
  (39, 8, 'Masofa', 'Расстояние'),
  (39, 9, 'Poyezd', 'Поезд'),
  (39, 10, 'Jadval', 'Расписание'),
  (39, 11, 'Manzara', 'Пейзаж'),
  (39, 12, 'Mehmon', 'Гость'),
  (39, 13, 'Rad etmoq', 'Отказаться'),
  (39, 14, 'Ma’lumot', 'Данные');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  39,
  'Незабываемая встреча',
  $body$
На прошлой неделе я получил письмо от своего старого друга. Он писал, что приедет в наш город на выходные.

Я очень обрадовался и начал готовиться к встрече.

В пятницу вечером я поехал на вокзал. Я долго ждал его у платформы.

Наконец, я увидел его среди толпы. Он вышел из вагона с большой сумкой.

Мы обнялись и пошли в кафе.

Друг рассказал мне о своей жизни, о своих новых проектах и о своих планах на будущее.

Я внимательно слушал его, задавал вопросы и делился своими мыслями.

Мы проговорили до полуночи.

Когда я провожал его до гостиницы, то понял, что настоящая дружба не боится ни времени, ни расстояния.
$body$,
  'kunlik-oqish-39'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-39', 'получил', 'получил', 'Oldim', NULL),
  ('kunlik-oqish-39', 'готовиться', 'готовиться', 'Tayyorgarlik ko‘rmoq', NULL),
  ('kunlik-oqish-39', 'платформы', 'платформы', 'Platformada', NULL),
  ('kunlik-oqish-39', 'толпы', 'толпы', 'Olomon', NULL),
  ('kunlik-oqish-39', 'вагон', 'вагон', 'Vagon', NULL),
  ('kunlik-oqish-39', 'обнялись', 'обнялись', 'Quchoqlashdik', NULL),
  ('kunlik-oqish-39', 'проектах', 'проектах', 'Loyihalar', NULL),
  ('kunlik-oqish-39', 'полуночи', 'полуночи', 'Yarim tun', NULL),
  ('kunlik-oqish-39', 'расстояния', 'расстояния', 'Masofa', NULL),
  ('kunlik-oqish-39', 'выходные', 'выходные', 'Dam olish kunlari', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (39, 0, 'Do‘stingiz bilan qachon oxirgi marta uchrashgan edingiz?', 'Когда вы последний раз встречались с другом?'),
  (39, 1, 'Kechirasiz, kechki poyezd soat nechada? – Bir daqiqa, men jadvalni ko‘rib chiqay.', 'Извините, во сколько вечерний поезд? – Одну минуту, я посмотрю расписание.'),
  (39, 2, 'U sizni aeroportda kutib oladimi? – Ha, u meni kutib oladi.', 'Он встретит вас в аэропорту? – Да, он встретит меня.'),
  (39, 3, 'Men hech qachon bunday go‘zal manzarani ko‘rmaganman.', 'Я никогда не видел такого красивого пейзажа.'),
  (39, 4, 'Sizning ukangiz hali ham o‘sha mashinani sotishni xohlaydimi?', 'Твой брат до сих пор хочет продать ту машину?'),
  (39, 5, 'Bolajon, iltimos, bu bananlarni tashlab yubor.', 'Дорогой, пожалуйста, выброси эти бананы.'),
  (39, 6, 'U o‘zining tug‘ilgan kunida hamma mehmonlarni mehr bilan kutib oldi.', 'Он тепло встретил всех гостей на своём дне рождения.'),
  (39, 7, 'Nega siz ularning taklifini rad etdingiz? – Chunki menda vaqt yo‘q edi.', 'Почему вы отказались от их предложения? – Потому что у меня не было времени.'),
  (39, 8, 'Iltimos, bu ma’lumotlarni jadvalga kiriting.', 'Пожалуйста, внесите эти данные в таблицу.'),
  (39, 9, 'U yoshligida futbolni juda yaxshi ko‘rardi, ammo hozir unga qiziqmaydi.', 'В молодости он очень любил футбол, но сейчас не интересуется им.');

-- ========== Kun 40 (takrorlash, kun 31–39) ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 40;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 40
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 40;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 40;

DELETE FROM public.daily_vocab_words WHERE day_number = 40;

DELETE FROM public.daily_grammar_matches WHERE day_number = 40;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 40;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 40;
DELETE FROM public.daily_grammar_topics WHERE day_number = 40;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  40,
  'Повторение: Винительный падеж (kun 31–39)',
  $theory$
**Кого? Что?**

| Savol | Qachon? | Misol |
|-------|---------|-------|
| Кого? | odu./hayvon | Я вижу брата. |
| Что? | neodu. | Я вижу стол. |

**Birlik oxirlari:** брат→брата, сестра→сестру, книгу, окно, ночь (o‘zgarmas), дверь.

**Ko‘plik:** студентов, девушек, книги (neodu. odatda o‘zgarmaydi).

**Olmoshlar В.п.:** меня, тебя, его, её, нас, вас, их.

**Yo‘nalish куда?:** **в** + В.п. (ichkariga) — в школу; **на** + В.п. — на работу, на стадион.

**Fe’llar (В.п.):** видеть, смотреть на, слушать, слышать; знать, понимать, помнить, забывать; ждать, встречать; любить, обожать, уважать, ценить; класть/положить, ставить/поставить + в/на.

**Мне нравится** — alohida (**дательный** + нравится).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (40, 'rule', 0, '«Men akamni kutmoqdaman»', 'Я жду брат.', 'Я жду брата.', 'Я жду брату.', 'Я жду братом.', 1),
  (40, 'rule', 1, '«U yangi mashina sotib oldi»', 'Он купил новая машина.', 'Он купил новую машину.', 'Он купил новой машине.', 'Он купил новой машиной.', 1),
  (40, 'rule', 2, '«Men ularni ko‘rdim»', 'Я видел их.', 'Я видел ими.', 'Я видел им.', 'Я видел они.', 0),
  (40, 'rule', 3, '«Ular maktabga borishadi»', 'Они идут в школу.', 'Они идут на школу.', 'Они идут в школе.', 'Они идут на школе.', 0),
  (40, 'rule', 4, '«Men talabalarni ko‘rdim»', 'Я видел студенты.', 'Я видел студентов.', 'Я видел студентам.', 'Я видел студентами.', 1),
  (40, 'rule', 5, '«Siz meni tushunyapsizmi?»', 'Вы понимаете меня?', 'Вы понимаете я?', 'Вы понимаете мне?', 'Вы понимаете мной?', 0),
  (40, 'rule', 6, '«U sumkani stolga qo‘ydi»', 'Он положил сумку на стол.', 'Он положил сумку в стол.', 'Он положил сумку на столе.', 'Он положил сумку в столе.', 0),
  (40, 'rule', 7, '«U bu qizni yaxshi ko‘radi»', 'Он любит эту девушку.', 'Он любит этот девушка.', 'Он любит этой девушке.', 'Он любит этой девушкой.', 0),
  (40, 'rule', 8, '«U poyezdni kutyapti»', 'Он ждёт поезд.', 'Он ждёт поезда.', 'Он ждёт поезду.', 'Он ждёт поездом.', 0),
  (40, 'rule', 9, '«Men bu masalani unutdim»', 'Я забыл этот вопрос.', 'Я забыл этого вопроса.', 'Я забыл этому вопросу.', 'Я забыл этим вопросом.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (40, 0, 0, 'Men ukamni ko‘rdim.', 'Я видел своего брата.'),
  (40, 0, 1, 'U kitobni o‘qiyapti.', 'Он читает книгу.'),
  (40, 0, 2, 'Biz o‘qituvchini hurmat qilamiz.', 'Мы уважаем учителя.'),
  (40, 0, 3, 'Ular poyezdni kutishyapti.', 'Они ждут поезд.'),
  (40, 0, 4, 'Men o‘z uyimni ko‘ryapman.', 'Я вижу свой дом.'),
  (40, 0, 5, 'Siz ularni bilasizmi?', 'Вы знаете их?'),
  (40, 0, 6, 'Men sening raqamingni unutdim.', 'Я забыл твой номер.'),
  (40, 0, 7, 'Ular yangi uy sotib olishdi.', 'Они купили новый дом.'),
  (40, 0, 8, 'Men onamni sevaman.', 'Я люблю свою маму.'),
  (40, 0, 9, 'Bolalar, meni tinglang.', 'Дети, слушайте меня.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (40, 0, 'uz', '(я, вчера, видел, моего, брата, в, парке)', ARRAY['Я', 'вчера', 'видел', 'моего', 'брата', 'в', 'парке.', 'брат'], 'Я вчера видел моего брата в парке.'),
  (40, 1, 'uz', '(она, любит, читать, детективы, вечером)', ARRAY['Она', 'любит', 'читать', 'детективы', 'вечером.', 'читает'], 'Она любит читать детективы вечером.'),
  (40, 2, 'uz', '(мы, ждём, нашего, преподавателя, у, двери)', ARRAY['Мы', 'ждём', 'нашего', 'преподавателя', 'у', 'двери.', 'ждёмте'], 'Мы ждём нашего преподавателя у двери.'),
  (40, 3, 'uz', '(ты, когда, положил, ключи, на, стол)', ARRAY['Когда', 'ты', 'положил', 'ключи', 'на', 'стол?', 'положила'], 'Когда ты положил ключи на стол?'),
  (40, 4, 'uz', '(они, купили, новую, машину, на, прошлой, неделе)', ARRAY['Они', 'купили', 'новую', 'машину', 'на', 'прошлой', 'неделе.', 'купят'], 'Они купили новую машину на прошлой неделе.'),
  (40, 5, 'uz', '(почему, вы, не, уважаете, своих, родителей)', ARRAY['Почему', 'вы', 'не', 'уважаете', 'своих', 'родителей?', 'уважают'], 'Почему вы не уважаете своих родителей?'),
  (40, 6, 'uz', '(я, никогда, не, забуду, этот, день)', ARRAY['Я', 'никогда', 'не', 'забуду', 'этот', 'день.', 'забываю'], 'Я никогда не забуду этот день.'),
  (40, 7, 'uz', '(дети, смотрят, мультфильм, и, смеются)', ARRAY['Дети', 'смотрят', 'мультфильм', 'и', 'смеются.', 'смотрел'], 'Дети смотрят мультфильм и смеются.'),
  (40, 8, 'uz', '(вы, поедете, в, Санкт-Петербург, на, поезде, или, на, самолёте)', ARRAY['Вы', 'поедете', 'в', 'Санкт-Петербург', 'на', 'поезде', 'или', 'на', 'самолёте?', 'едете'], 'Вы поедете в Санкт-Петербург на поезде или на самолёте?'),
  (40, 9, 'uz', '(я, услышал, твой, голос, по, телефону)', ARRAY['Я', 'услышал', 'твой', 'голос', 'по', 'телефону.', 'в'], 'Я услышал твой голос по телефону.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (40, 0, 'Ertak', 'Сказка'),
  (40, 1, 'Hikoya', 'История'),
  (40, 2, 'Yaxshilik', 'Добро'),
  (40, 3, 'Halollik', 'Честность'),
  (40, 4, 'Katta bo‘lmoq', 'Вырасти'),
  (40, 5, 'Sog‘inmoq (по)', 'Скучать'),
  (40, 6, 'Qo‘ng‘iroq qilmoq', 'Звонить'),
  (40, 7, 'Muvaffaqiyat', 'Успех'),
  (40, 8, 'Ota-ona bo‘lmoq', 'Стать родителем'),
  (40, 9, 'Muhim', 'Важно'),
  (40, 10, 'Qadriyat', 'Ценность'),
  (40, 11, 'Uzoqda yashovchi', 'Живущий далеко'),
  (40, 12, 'Tan olmoq', 'Признавать'),
  (40, 13, 'Imzolamoq', 'Подписывать'),
  (40, 14, 'Tarbiya', 'Воспитание');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  40,
  'Мои воспоминания',
  $body$
Когда я был ребёнком, я очень любил слушать сказки. Моя бабушка каждый вечер читала мне интересные истории.

Я никогда не забуду эти тёплые вечера. Она учила меня добру и честности.

Когда я вырос, я уехал в большой город учиться.

Я скучал по своей семье, по своим друзьям, по своему родному городу.

Каждое воскресенье я звонил домой. Я рассказывал родителям о своих успехах, о своих новых друзьях и о своих планах.

Они всегда поддерживали меня.

Сейчас я сам стал родителем. Я понимаю, как важно любить своих детей и уважать своих родителей.

Я стараюсь передать им всё то хорошее, что дала мне моя семья.
$body$,
  'kunlik-oqish-40'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-40', 'сказки', 'сказки', 'Ertaklar', NULL),
  ('kunlik-oqish-40', 'истории', 'истории', 'Hikoyalar', NULL),
  ('kunlik-oqish-40', 'честности', 'честности', 'Halollik', NULL),
  ('kunlik-oqish-40', 'вырос', 'вырос', 'Katta bo‘ldi', NULL),
  ('kunlik-oqish-40', 'скучал', 'скучал', 'Sog‘indi', NULL),
  ('kunlik-oqish-40', 'родному', 'родному', 'Tug‘ilgan', NULL),
  ('kunlik-oqish-40', 'звонил', 'звонил', 'Qo‘ng‘iroq qilgan', NULL),
  ('kunlik-oqish-40', 'успехах', 'успехах', 'Muvaffaqiyatlar', NULL),
  ('kunlik-oqish-40', 'родителем', 'родителем', 'Ota-ona bo‘ldi', NULL),
  ('kunlik-oqish-40', 'передать', 'передать', 'Yetkazmoq', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (40, 0, 'Bolaligingizda qanday ertaklarni yaxshi ko‘rardingiz?', 'Какие сказки вы любили в детстве?'),
  (40, 1, 'Sizning oilangiz sizga qanday qadriyatlarni o‘rgatgan?', 'Какие ценности привила вам ваша семья?'),
  (40, 2, 'Uzoqda yashovchi yaqinlaringizni qanchalik tez-tez eslaysiz?', 'Как часто вы вспоминаете близких, живущих далеко?'),
  (40, 3, 'Kechagi suhbatda ular qanday yangiliklarni aytib berishdi?', 'Какие новости они рассказали вчера в разговоре?'),
  (40, 4, 'Siz bolalaringizga kechqurun ertak o‘qib berasizmi?', 'Вы читаете детям сказки на ночь?'),
  (40, 5, 'U hech qachon o‘z xatolarini tan olmaydi.', 'Он никогда не признаёт свои ошибки.'),
  (40, 6, 'Iltimos, bu hujjatlarni imzolash uchun menga uzating.', 'Пожалуйста, передайте мне эти документы для подписи.'),
  (40, 7, 'Sayohat paytida men har doim yangi odamlar bilan tanishishga harakat qilaman.', 'В путешествии я всегда стараюсь знакомиться с новыми людьми.'),
  (40, 8, 'U o‘zining tug‘ilib o‘sgan shahrini hech qachon unutmaydi.', 'Он никогда не забывает свой родной город.'),
  (40, 9, 'Sizningcha, farzand tarbiyasida eng muhim narsa nima?', 'Что, по-вашему, самое важное в воспитании детей?');

