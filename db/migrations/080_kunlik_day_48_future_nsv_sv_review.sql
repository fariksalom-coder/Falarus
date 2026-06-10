-- Kunlik kun 48: kelasi zamon takrorlash — НСВ (буду + инфинитив) vs СВ.

DELETE FROM public.daily_practice_prompts WHERE day_number = 48;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 48
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 48;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 48;

DELETE FROM public.daily_vocab_words WHERE day_number = 48;

DELETE FROM public.daily_grammar_matches WHERE day_number = 48;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 48;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 48;
DELETE FROM public.daily_grammar_topics WHERE day_number = 48;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  48,
  'Kelasi zamon: НСВ vs СВ (takrorlash, 41–47)',
  $theory$
**Murakkab kelasi (НСВ):** буду / будешь … + **инфинитив** — jarayon, takror: *весь день буду читать*, *каждый день буду вставать*.

**Oddiy kelasi (СВ):** fe’lning o‘zi — natija, bir marta: *прочитаю*, *встану*, *закончит за час*.

**Inkор:** не буду читать / не прочитаю.

**So‘roq:** *Будешь читать?* vs *Прочитаешь?*

**Kalit:** весь день, долго, каждый день → НСВ; за час, скоро, наконец, сразу → ko‘pincha СВ.

41–47 kunlardagi harakat va niyat bilan birga mashq qiling.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (48, 'rule', 0, '«Ertaga men butun kun kitob o‘qiyman» — jarayon', 'Я прочитаю книгу завтра весь день.', 'Я буду читать книгу завтра весь день.', 'Я читаю книгу завтра весь день.', 'Я читал книгу завтра весь день.', 1),
  (48, 'rule', 1, '«U bu ishni bir soatda tugatadi» — natija', 'Он будет заканчивать эту работу за час.', 'Он закончит эту работу за час.', 'Он заканчивает эту работу за час.', 'Он заканчивал эту работу за час.', 1),
  (48, 'rule', 2, '«Har kuni kechqurun men radio tinglayman» — kelasi, takror', 'Каждый вечер я буду слушать радио.', 'Каждый вечер я послушаю радио.', 'Каждый вечер я слушаю радио.', 'Каждый вечер я слушал радио.', 0),
  (48, 'rule', 3, '«Ertaga soat 5 da kelishingiz kerak» — bir marta', 'Вам нужно будет приходить завтра в 5 часов.', 'Вам нужно будет прийти завтра в 5 часов.', 'Вам нужно приходить завтра в 5 часов.', 'Вам нужно прийти завтра в 5 часов.', 1),
  (48, 'rule', 4, '«Men hech qachon u bilan gaplashmayman» — umumiy rad (jarayon)', 'Я никогда не буду с ним говорить.', 'Я никогда не скажу ему.', 'Обе формы возможны, но смысл разный.', 'Я никогда не говорил с ним.', 0),
  (48, 'rule', 5, '«Ular bu masalani uzoq muhokama qiladilar» — jarayon', 'Они будут обсуждать эту проблему долго.', 'Они обсудят эту проблему долго.', 'Они обсуждают эту проблему долго.', 'Они обсуждали эту проблему долго.', 0),
  (48, 'rule', 6, '«Через неделю» — natija bilan', 'Через неделю я буду читать эту книгу.', 'Через неделю я прочитаю эту книгу.', 'Через неделю я читаю эту книгу.', 'Через неделю я читал эту книгу.', 1),
  (48, 'rule', 7, '«Kechirasiz, men sizning vaqtingizni olib qo‘ymayman»', 'Извините, я не буду отнимать ваше время.', 'Извините, я не отниму ваше время.', 'Извините, я не отнимаю ваше время.', 'Извините, я не отнимал ваше время.', 0),
  (48, 'rule', 8, '«U darhol javob beradi» — сразу + СВ', 'Он сразу будет отвечать.', 'Он сразу ответит.', 'Он сразу отвечает.', 'Он сразу ответил бы.', 1),
  (48, 'rule', 9, '«Biz ertaga ertalab uchrashamiz va gaplashamiz»', 'Мы встретимся и будем разговаривать завтра утром.', 'Мы будем встречаться и поговорим завтра утром.', 'Мы встречаемся и говорим завтра утром.', 'Мы встретились и поговорили завтра утром.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (48, 0, 0, 'Ertaga ertalab soat 7 da turaman (bir marta).', 'Я встану завтра утром в 7 часов.'),
  (48, 0, 1, 'Har kuni ertalab soat 7 da turaman.', 'Каждый день я буду вставать в 7 часов.'),
  (48, 0, 2, 'U bu kitobni bir hafta o‘qiydi (jarayon).', 'Он будет читать эту книгу неделю.'),
  (48, 0, 3, 'U bu kitobni bir haftada o‘qib chiqadi (natija).', 'Он прочитает эту книгу за неделю.'),
  (48, 0, 4, 'Biz ertaga butun kun sayr qilamiz (jarayon).', 'Мы будем гулять завтра весь день.'),
  (48, 0, 5, 'Biz ertaga bir marta sayr qilamiz.', 'Завтра мы погуляем вместе.'),
  (48, 0, 6, 'U kelganda, men hujjatlarni tayyorlab qo‘yaman (natija).', 'Я подготовлю документы, когда он придёт.'),
  (48, 0, 7, 'U kelganda, men hujjatlarni tayyorlayotgan bo‘laman (jarayon).', 'Я буду готовить документы, когда он придёт.'),
  (48, 0, 8, 'Yozda men ko‘p sayohat qilaman (takror).', 'Я буду много путешествовать летом.'),
  (48, 0, 9, 'Yozda men bir marta sayohat qilaman.', 'Я съезжу в путешествие один раз летом.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (48, 0, 'uz', '(завтра, я, весь, вечер, готовить, ужин)', ARRAY['Завтра', 'я', 'весь', 'вечер', 'буду', 'готовить', 'ужин.', 'приготовлю'], 'Завтра я весь вечер буду готовить ужин.'),
  (48, 1, 'uz', '(через, два, дня, он, вернуться, из, поездка)', ARRAY['Через', 'два', 'дня', 'он', 'вернётся', 'из', 'поездки.', 'вернулся'], 'Через два дня он вернётся из поездки.'),
  (48, 2, 'uz', '(каждое, воскресенье, мы, ходить, в, церковь)', ARRAY['Каждое', 'воскресенье', 'мы', 'будем', 'ходить', 'в', 'церковь.', 'ходим'], 'Каждое воскресенье мы будем ходить в церковь.'),
  (48, 3, 'uz', '(ты, когда, наконец, сделать, домашнее, задание)', ARRAY['Когда', 'ты', 'наконец', 'сделаешь', 'домашнее', 'задание?', 'делаешь'], 'Когда ты наконец сделаешь домашнее задание?'),
  (48, 4, 'uz', '(я, не, брать, твой, вещи, без, разрешение)', ARRAY['Я', 'не', 'буду', 'брать', 'твои', 'вещи', 'без', 'разрешения.', 'возьму'], 'Я не буду брать твои вещи без разрешения.'),
  (48, 5, 'uz', '(они, скоро, переехать, в, новая, квартира)', ARRAY['Они', 'скоро', 'переедут', 'в', 'новую', 'квартиру.', 'переезжают'], 'Они скоро переедут в новую квартиру.'),
  (48, 6, 'uz', '(мы, весь, июль, жить, на, дача)', ARRAY['Мы', 'весь', 'июль', 'будем', 'жить', 'на', 'даче.', 'живём'], 'Мы весь июль будем жить на даче.'),
  (48, 7, 'uz', '(вы, что, подарить, мужу, на, годовщина)', ARRAY['Что', 'вы', 'подарите', 'мужу', 'на', 'годовщину?', 'купите'], 'Что вы подарите мужу на годовщину?'),
  (48, 8, 'uz', '(дети, есть, и, потом, сразу, лечь, спать)', ARRAY['Дети', 'поедят', 'и', 'потом', 'сразу', 'лягут', 'спать.', 'едят'], 'Дети поедят и потом сразу лягут спать.'),
  (48, 9, 'uz', '(я, обязательно, прийти, на, твой, концерт, даже, если, будет, дождь)', ARRAY['Я', 'обязательно', 'приду', 'на', 'твой', 'концерт,', 'даже', 'если', 'будет', 'дождь.', 'прийти'], 'Я обязательно приду на твой концерт, даже если будет дождь.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (48, 0, 'Oddiy', 'Обычный'),
  (48, 1, 'Bir necha', 'Несколько'),
  (48, 2, 'Hikoya', 'Рассказ'),
  (48, 3, 'Ozmoq', 'Похудеть'),
  (48, 4, 'Yugurmoq', 'Бегать'),
  (48, 5, 'Topmoq (ish)', 'Найти'),
  (48, 6, 'Sayohat', 'Путешествие'),
  (48, 7, 'Italiya', 'Италия'),
  (48, 8, 'Uy qurmoq', 'Построить'),
  (48, 9, 'Ekmoq (bog‘)', 'Посадить'),
  (48, 10, 'Bog‘', 'Сад'),
  (48, 11, 'Reja', 'План'),
  (48, 12, 'Tuyulmoq', 'Казаться'),
  (48, 13, 'Amalga oshirmoq', 'Осуществить'),
  (48, 14, 'Qo‘rqmaslik', 'Не бояться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  48,
  'Что я буду делать завтра, а что сделаю через год',
  $body$
Завтра у меня будет обычный день. Я встану в 7 утра, позавтракаю и пойду на работу. Я буду работать до вечера, потом вернусь домой и буду отдыхать: посмотрю сериал, пообщаюсь с семьёй и рано лягу спать.

Это повседневная рутина, но именно такие дни складываются в привычку и дисциплину. Вечером я коротко запишу план на завтра, чтобы ничего не забыть.

А через год я сделаю много нового. Я научусь играть на гитаре, прочитаю 20 книг и напишу несколько рассказов. Я похудею на 5 килограммов и начну бегать по утрам — сначала медленно, потом всё увереннее.

Я найду новую, более интересную работу и буду учиться новым навыкам каждую неделю. Я съезжу в путешествие в Италию и увижу море: давно мечтал об этом.

А через пять лет я построю свой дом и посажу сад. Я представляю деревья у забора, скамейку во дворе и утренний кофе на террасе.

Все эти планы кажутся мне большими, но я знаю, что могу их осуществить. Главное — не бояться и делать первые шаги, даже когда непонятно, с чего начать.

Если маленькие задачи получаются завтра, большие цели становятся ближе через год и через пять лет.
$body$,
  'kunlik-oqish-48'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-48', 'Завтра', 'завтра', 'Ertaga', NULL),
  ('kunlik-oqish-48', 'обычный', 'обычный', 'Oddiy', NULL),
  ('kunlik-oqish-48', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-48', 'встану', 'встану', 'Turaman (СВ)', NULL),
  ('kunlik-oqish-48', 'утра', 'утра', 'Ertalab', NULL),
  ('kunlik-oqish-48', 'позавтракаю', 'позавтракаю', 'Nonushta qilaman (СВ)', NULL),
  ('kunlik-oqish-48', 'пойду', 'пойду', 'Boraman (СВ)', NULL),
  ('kunlik-oqish-48', 'работу', 'работу', 'Ishga', NULL),
  ('kunlik-oqish-48', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-48', 'работать', 'работать', 'Ishlamoq', NULL),
  ('kunlik-oqish-48', 'вечера', 'вечера', 'Kechgacha', NULL),
  ('kunlik-oqish-48', 'вернусь', 'вернусь', 'Qaytaman (СВ)', NULL),
  ('kunlik-oqish-48', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-48', 'отдыхать', 'отдыхать', 'Dam olmoq', NULL),
  ('kunlik-oqish-48', 'повседневная', 'повседневная', 'Kundalik', NULL),
  ('kunlik-oqish-48', 'рутина', 'рутина', 'Rutina', NULL),
  ('kunlik-oqish-48', 'привычку', 'привычку', 'Odat', NULL),
  ('kunlik-oqish-48', 'дисциплину', 'дисциплину', 'Intizom', NULL),
  ('kunlik-oqish-48', 'запишу', 'запишу', 'Yozib qo‘yaman', NULL),
  ('kunlik-oqish-48', 'год', 'год', 'Yil', NULL),
  ('kunlik-oqish-48', 'сделаю', 'сделаю', 'Qilaman (СВ)', NULL),
  ('kunlik-oqish-48', 'научусь', 'научусь', 'O‘rganaman (СВ)', NULL),
  ('kunlik-oqish-48', 'играть', 'играть', 'O‘ynamoq', NULL),
  ('kunlik-oqish-48', 'гитаре', 'гитаре', 'Gitarada', NULL),
  ('kunlik-oqish-48', 'прочитаю', 'прочитаю', 'O‘qiyman (tugataman)', NULL),
  ('kunlik-oqish-48', 'книг', 'книг', 'Kitoblar', NULL),
  ('kunlik-oqish-48', 'напишу', 'напишу', 'Yozaman (СВ)', NULL),
  ('kunlik-oqish-48', 'рассказов', 'рассказов', 'Hikoyalar', NULL),
  ('kunlik-oqish-48', 'похудею', 'похудею', 'Ozaman (СВ)', NULL),
  ('kunlik-oqish-48', 'килограммов', 'килограммов', 'Kilogramm', NULL),
  ('kunlik-oqish-48', 'начну', 'начну', 'Boshlayman (СВ)', NULL),
  ('kunlik-oqish-48', 'бегать', 'бегать', 'Yugurmoq', NULL),
  ('kunlik-oqish-48', 'найду', 'найду', 'Topaman (СВ)', NULL),
  ('kunlik-oqish-48', 'интересную', 'интересную', 'Qiziqarli', NULL),
  ('kunlik-oqish-48', 'съезжу', 'съезжу', 'Sayohatga chiqaman', NULL),
  ('kunlik-oqish-48', 'путешествие', 'путешествие', 'Sayohat', NULL),
  ('kunlik-oqish-48', 'Италию', 'италию', 'Italiyaga', NULL),
  ('kunlik-oqish-48', 'увижу', 'увижу', 'Ko‘raman (СВ)', NULL),
  ('kunlik-oqish-48', 'море', 'море', 'Dengiz', NULL),
  ('kunlik-oqish-48', 'пять', 'пять', 'Besh', NULL),
  ('kunlik-oqish-48', 'лет', 'лет', 'Yil', NULL),
  ('kunlik-oqish-48', 'построю', 'построю', 'Quraman (СВ)', NULL),
  ('kunlik-oqish-48', 'посажу', 'посажу', 'Ekaman (СВ)', NULL),
  ('kunlik-oqish-48', 'планы', 'планы', 'Rejalar', NULL),
  ('kunlik-oqish-48', 'кажутся', 'кажутся', 'Tuyiladi', NULL),
  ('kunlik-oqish-48', 'осуществить', 'осуществить', 'Amalga oshirmoq', NULL),
  ('kunlik-oqish-48', 'Главное', 'главное', 'Eng muhimi', NULL),
  ('kunlik-oqish-48', 'бояться', 'бояться', 'Qo‘rqmoq', NULL),
  ('kunlik-oqish-48', 'шаги', 'шаги', 'Qadamlar', NULL),
  ('kunlik-oqish-48', 'навыкам', 'навыкам', 'Ko‘nikmalarga', NULL),
  ('kunlik-oqish-48', 'мечтал', 'мечтал', 'Orzu qilgan edim', NULL),
  ('kunlik-oqish-48', 'террасе', 'террасе', 'Terrasada', NULL),
  ('kunlik-oqish-48', 'скамейку', 'скамейку', 'Skameyka', NULL),
  ('kunlik-oqish-48', 'забора', 'забора', 'To‘siq', NULL),
  ('kunlik-oqish-48', 'семьёй', 'семьей', 'Oila bilan', NULL),
  ('kunlik-oqish-48', 'посмотрю', 'посмотрю', 'Ko‘raman', NULL),
  ('kunlik-oqish-48', 'пообщаюсь', 'пообщаюсь', 'Suhbatlashaman', NULL),
  ('kunlik-oqish-48', 'лягу', 'лягу', 'Yotaman (СВ)', NULL),
  ('kunlik-oqish-48', 'спать', 'спать', 'Uxlamoq', NULL),
  ('kunlik-oqish-48', 'увереннее', 'увереннее', 'Ishonchliroq', NULL),
  ('kunlik-oqish-48', 'медленно', 'медленно', 'Sekin', NULL),
  ('kunlik-oqish-48', 'цели', 'цели', 'Maqsadlar', NULL),
  ('kunlik-oqish-48', 'задачи', 'задачи', 'Vazifalar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (48, 0, 'Ertaga ishdan keyin nima qilasan? – Do‘stim bilan uchrashaman.', 'Что ты будешь делать завтра после работы? – Встречусь с другом.'),
  (48, 1, 'U bu yozda qayerda dam oladi? – U dengizga boradi.', 'Где он будет отдыхать этим летом? – Он поедет на море.'),
  (48, 2, 'Siz qachon yangi loyihani boshlaysiz?', 'Когда вы начнёте новый проект?'),
  (48, 3, 'Biz kelasi yilning o‘zida yangi uy sotib olamiz.', 'Мы купим новый дом уже в следующем году.'),
  (48, 4, 'U ertaga ertalab ertaroq turadi va mashq qiladi.', 'Завтра утром он встанет пораньше и сделает зарядку.'),
  (48, 5, 'Siz bu kitobni qancha vaqtda o‘qib chiqasiz?', 'За сколько времени вы прочитаете эту книгу?'),
  (48, 6, 'Ular kelganda, men sizga xabar beraman.', 'Когда они придут, я сообщу вам.'),
  (48, 7, 'Men hech qachon sizni tark etmayman, va’da beraman.', 'Я никогда не брошу вас, обещаю.'),
  (48, 8, 'Ushbu mashaqqatli ishlardan keyin, men uzoq vaqt dam olaman.', 'После этой трудной работы я буду долго отдыхать.'),
  (48, 9, 'Agar shoshmasangiz, men sizni kutib turaman.', 'Если вы не торопитесь, я подожду вас.');
