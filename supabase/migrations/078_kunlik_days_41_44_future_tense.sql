-- Kunlik kun 41–44: kelasi zamon — murakkab (НСВ), oddiy (СВ), НСВ/СВ farqi, dialog va rejalar.
-- Spiral stub (077) uchun 43–44 qatorlari almashtiriladi; 41–42 yangi.

-- ========== Tozalash: 41–44 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number >= 41 AND day_number <= 44;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 41 AND day_number <= 44
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 41 AND day_number <= 44;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 41 AND day_number <= 44;

DELETE FROM public.daily_vocab_words WHERE day_number >= 41 AND day_number <= 44;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 41 AND day_number <= 44;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 41 AND day_number <= 44;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 41 AND day_number <= 44;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 41 AND day_number <= 44;

-- ========== Kun 41 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  41,
  'Kelasi zamon: murakkab (буду + инфинитив, НСВ)',
  $theory$
**Murakkab kelasi zamon** — **быть** fe’lining kelasi shakli + **инфинитив** (НСВ). Misol: **читать** → **буду читать**.

Shaxslar (misol **читать**): я буду, ты будешь, он/она будет, мы будем, вы будете, они будут.

**Qoidalar:** faqat НСВ bilan; jarayon yoki takrorlanuvchi harakat; rejalar va vaqt bilan bog‘liq harakatlar.

**Inkор:** не + буду/будешь/… + инфинитив — *Я не буду читать.*

**So‘roq:** *Будешь читать?* / *Что ты будешь делать?*

Oddiy kelasi zamon (СВ) — keyingi kunlar.

Holat uchun **буду + otlar**: *Я буду учителем.* (tvoritelniy: кем? учителем)
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (41, 'rule', 0, '«Men o‘qiyman (kelasi zamonda)» — qaysi gap?', 'Я буду читать.', 'Я читаю.', 'Я читал.', 'Я прочитаю.', 0),
  (41, 'rule', 1, '«U kelasi zamonda ishlaydi»', 'Он работает.', 'Он работал.', 'Он будет работать.', 'Он поработает.', 2),
  (41, 'rule', 2, 'Qaysi gapda «буду» asosiy ma’noda (harakat + инфинитив) bilan to‘g‘ri?', 'Я буду завтра в школе.', 'Я буду завтра учиться.', 'Ikkalasi ham xuddi shu ma’noda.', 'Hech biri.', 1),
  (41, 'rule', 3, '«Biz yozamiz (kelasi, jarayon)»', 'Мы будем писать.', 'Мы пишем.', 'Мы писали.', 'Мы напишем.', 0),
  (41, 'rule', 4, '«Men kelasi hafta ishlamayman» — inkор', 'Я не буду работать на следующей неделе.', 'Я не работаю на следующей неделе.', 'Я не работал на следующей неделе.', 'Я не буду работаю на следующей неделе.', 0),
  (41, 'rule', 5, '«Siz ertaga nima qilasiz?»', 'Что вы делаете завтра?', 'Что вы будете делать завтра?', 'Что вы сделаете завтра?', 'Что вы делали завтра?', 1),
  (41, 'rule', 6, '«U kechqurun uyda o‘tiradi (kelasi)»', 'Он будет сидеть дома вечером.', 'Он будет сидит дома вечером.', 'Он будет сидел дома вечером.', 'Он будет сижу дома вечером.', 0),
  (41, 'rule', 7, '«Ular kechki ovqat tayyorlaydilar (jarayon, kelasi)»', 'Они будут готовить ужин.', 'Они готовят ужин.', 'Они приготовят ужин.', 'Они готовили ужин.', 0),
  (41, 'rule', 8, '«Sen kelasi yakshanba nima qilasan?»', 'Что ты будешь делать в следующее воскресенье?', 'Что ты делаешь в следующее воскресенье?', 'Что ты сделаешь в следующее воскресенье?', 'Что ты делал в следующее воскресенье?', 0),
  (41, 'rule', 9, '«Men o‘qituvchi bo‘laman (holat)»', 'Я буду учителем.', 'Я буду учитель.', 'Я буду учителя.', 'Я буду учителю.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (41, 0, 0, 'Я (читать)', 'Я буду читать'),
  (41, 0, 1, 'Ты (писать)', 'Ты будешь писать'),
  (41, 0, 2, 'Он (работать)', 'Он будет работать'),
  (41, 0, 3, 'Мы (гулять)', 'Мы будем гулять'),
  (41, 0, 4, 'Вы (отдыхать)', 'Вы будете отдыхать'),
  (41, 0, 5, 'Они (учиться)', 'Они будут учиться'),
  (41, 0, 6, 'Я (говорить)', 'Я буду говорить'),
  (41, 0, 7, 'Ты (слушать)', 'Ты будешь слушать'),
  (41, 0, 8, 'Он (помогать)', 'Он будет помогать'),
  (41, 0, 9, 'Мы (делать)', 'Мы будем делать');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (41, 0, 'uz', '(я, завтра, читать, новый, книга)', ARRAY['Я', 'завтра', 'буду', 'читать', 'новую', 'книгу.', 'читаю'], 'Я завтра буду читать новую книгу.'),
  (41, 1, 'uz', '(ты, что, делать, вечером)', ARRAY['Что', 'ты', 'будешь', 'делать', 'вечером?', 'делаешь'], 'Что ты будешь делать вечером?'),
  (41, 2, 'uz', '(они, не, работать, в, субботу)', ARRAY['Они', 'не', 'будут', 'работать', 'в', 'субботу.', 'работают'], 'Они не будут работать в субботу.'),
  (41, 3, 'uz', '(мы, гулять, в, парке, завтра)', ARRAY['Мы', 'будем', 'гулять', 'в', 'парке', 'завтра.', 'гуляем'], 'Мы будем гулять в парке завтра.'),
  (41, 4, 'uz', '(она, готовить, обед, через, час)', ARRAY['Она', 'будет', 'готовить', 'обед', 'через', 'час.', 'готовит'], 'Она будет готовить обед через час.'),
  (41, 5, 'uz', '(вы, где, отдыхать, летом)', ARRAY['Где', 'вы', 'будете', 'отдыхать', 'летом?', 'отдыхаете'], 'Где вы будете отдыхать летом?'),
  (41, 6, 'uz', '(я, учить, русский, язык, весь, год)', ARRAY['Я', 'буду', 'учить', 'русский', 'язык', 'весь', 'год.', 'учу'], 'Я буду учить русский язык весь год.'),
  (41, 7, 'uz', '(дети, играть, на, улице, после, дождя)', ARRAY['Дети', 'будут', 'играть', 'на', 'улице', 'после', 'дождя.', 'играют'], 'Дети будут играть на улице после дождя.'),
  (41, 8, 'uz', '(мы, смотреть, телевизор, и, ужинать)', ARRAY['Мы', 'будем', 'смотреть', 'телевизор', 'и', 'ужинать.', 'смотрим'], 'Мы будем смотреть телевизор и ужинать.'),
  (41, 9, 'uz', '(когда, ты, звонить, мне)', ARRAY['Когда', 'ты', 'будешь', 'звонить', 'мне?', 'звонишь'], 'Когда ты будешь звонить мне?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (41, 0, 'Ertaga', 'Завтра'),
  (41, 1, 'Bo‘sh kun', 'Свободный день'),
  (41, 2, 'Kech turmoq', 'Встать поздно'),
  (41, 3, 'Pochta', 'Почта'),
  (41, 4, 'Jo‘natmoq', 'Отправлять'),
  (41, 5, 'Uchrashmoq', 'Встретиться'),
  (41, 6, 'Aytib bermoq', 'Рассказывать'),
  (41, 7, 'Kechqurun', 'Вечером'),
  (41, 8, 'Qo‘ng‘iroq qilmoq', 'Звонить / позвонить'),
  (41, 9, 'Dam olish kuni', 'Выходной'),
  (41, 10, 'Sayohat qilmoq', 'Путешествовать'),
  (41, 11, 'Birga', 'Вместе'),
  (41, 12, 'Nega?', 'Почему?'),
  (41, 13, 'Restoran', 'Ресторан'),
  (41, 14, 'Butun kun', 'Весь день');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  41,
  'Мои планы на завтра',
  $body$
Завтра у меня будет свободный день. Я не буду работать.

Утром я встану поздно. Я буду пить кофе и читать газету. Потом я пойду на почту. Я буду отправлять письма друзьям.

Днём я встречусь с Антоном. Мы будем гулять по городу и разговаривать.

Вечером я позвоню маме. Я буду рассказывать ей о своих планах. Потом я буду смотреть фильм по телевизору.

Я думаю, что завтра будет хороший день. Главное — я буду делать только то, что мне нравится.
$body$,
  'kunlik-oqish-41'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-41', 'Завтра', 'завтра', 'Ertaga', NULL),
  ('kunlik-oqish-41', 'свободный', 'свободный', 'Bo‘sh', NULL),
  ('kunlik-oqish-41', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-41', 'работать', 'работать', 'Ishlamoq', NULL),
  ('kunlik-oqish-41', 'Утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-41', 'встану', 'встану', 'Turaman (СВ)', NULL),
  ('kunlik-oqish-41', 'поздно', 'поздно', 'Kech', NULL),
  ('kunlik-oqish-41', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-41', 'пить', 'пить', 'Ichmoq', NULL),
  ('kunlik-oqish-41', 'кофе', 'кофе', 'Kofe', NULL),
  ('kunlik-oqish-41', 'читать', 'читать', 'O‘qimoq', NULL),
  ('kunlik-oqish-41', 'газету', 'газету', 'Gazetani', NULL),
  ('kunlik-oqish-41', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-41', 'пойду', 'пойду', 'Boraman (СВ)', NULL),
  ('kunlik-oqish-41', 'почту', 'почту', 'Pochtani', NULL),
  ('kunlik-oqish-41', 'отправлять', 'отправлять', 'Jo‘natmoq', NULL),
  ('kunlik-oqish-41', 'письма', 'письма', 'Xatlar', NULL),
  ('kunlik-oqish-41', 'друзьям', 'друзьям', 'Do‘stlarga', NULL),
  ('kunlik-oqish-41', 'Днём', 'днём', 'Kunduzi', NULL),
  ('kunlik-oqish-41', 'встречусь', 'встречусь', 'Uchrashaman (СВ)', NULL),
  ('kunlik-oqish-41', 'Антоном', 'антоном', 'Anton bilan', NULL),
  ('kunlik-oqish-41', 'гулять', 'гулять', 'Sayr qilmoq', NULL),
  ('kunlik-oqish-41', 'городу', 'городу', 'Shaharga', NULL),
  ('kunlik-oqish-41', 'разговаривать', 'разговаривать', 'Suhbatlashmoq', NULL),
  ('kunlik-oqish-41', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-41', 'позвоню', 'позвоню', 'Qo‘ng‘iroq qilaman (СВ)', NULL),
  ('kunlik-oqish-41', 'маме', 'маме', 'Onamga', NULL),
  ('kunlik-oqish-41', 'рассказывать', 'рассказывать', 'Aytib bermoq', NULL),
  ('kunlik-oqish-41', 'планах', 'планах', 'Rejalarda', NULL),
  ('kunlik-oqish-41', 'смотреть', 'смотреть', 'Ko‘rmoq', NULL),
  ('kunlik-oqish-41', 'фильм', 'фильм', 'Film', NULL),
  ('kunlik-oqish-41', 'телевизору', 'телевизору', 'Televizorda', NULL),
  ('kunlik-oqish-41', 'думаю', 'думаю', 'O‘ylayman', NULL),
  ('kunlik-oqish-41', 'хороший', 'хороший', 'Yaxshi', NULL),
  ('kunlik-oqish-41', 'Главное', 'главное', 'Eng muhimi', NULL),
  ('kunlik-oqish-41', 'делать', 'делать', 'Qilmoq', NULL),
  ('kunlik-oqish-41', 'нравится', 'нравится', 'Yoqtimoq', NULL),
  ('kunlik-oqish-41', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-41', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-41', 'ней', 'ней', 'Unga (ona)', NULL),
  ('kunlik-oqish-41', 'своих', 'своих', 'O‘zimning', NULL),
  ('kunlik-oqish-41', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-41', 'не', 'не', 'Emas', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (41, 0, 'Siz ertaga nima qilasiz?', 'Что вы будете делать завтра?'),
  (41, 1, 'Ertalab men uzoq uxlayman, chunki dam olish kuni.', 'Утром я буду долго спать, потому что выходной.'),
  (41, 2, 'U kechqurun do‘stlariga qo‘ng‘iroq qiladi.', 'Он будет звонить друзьям вечером.'),
  (41, 3, 'Biz bu yozda birga sayohat qilamiz.', 'Мы будем путешествовать вместе этим летом.'),
  (41, 4, 'Nega siz ertaga ishga bormaysiz?', 'Почему вы не будете завтра на работе?'),
  (41, 5, 'Ular kechki ovqatni tayyorlamaydilar, restoranga boradilar.', 'Они не будут готовить ужин, они пойдут в ресторан.'),
  (41, 6, 'Siz qaerda dam olasiz? – Men uyda dam olaman.', 'Где вы будете отдыхать? – Я буду отдыхать дома.'),
  (41, 7, 'Qachon sizga qo‘ng‘iroq qilish mumkin?', 'Когда можно будет вам позвонить?'),
  (41, 8, 'Men ertaga butun kun ingliz tilini o‘rganaman.', 'Я буду учить английский язык весь день завтра.'),
  (41, 9, 'Sizningcha, ertaga havo yaxshi bo‘ladimi?', 'Как вы думаете, завтра будет хорошая погода?');

-- ========== Kun 42 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  42,
  'Kelasi zamon: oddiy (СВ fe’llari)',
  $theory$
**Oddiy kelasi zamon** — СВ fe’lining o‘zi o‘zgaradi (я **напишу**, ты **напишешь**…). Hozirgi zamon yo‘q, faqat o‘tgan va kelasi.

**НСВ:** *буду писать* — jarayon, uzoq vaqt.
**СВ:** *напишу* — natija, bir marta.

**Taqqoslash:** *Завтра я буду писать письмо весь вечер.* / *Завтра я напишу письмо и отправлю его.*

**Inkор СВ:** *не* + kelasi shakl — *Я не напишу.*

**Refleksiv СВ:** *Они встретятся.*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (42, 'rule', 0, '«Men yozaman (va tugataman)»', 'Я буду писать.', 'Я пишу.', 'Я напишу.', 'Я писал.', 2),
  (42, 'rule', 1, '«U xatni yozadi va jo‘natadi (kelasi, natija)»', 'Он будет писать письмо и отправит.', 'Он напишет письмо и отправит.', 'Он пишет письмо и отправляет.', 'Он писал письмо и отправил.', 1),
  (42, 'rule', 2, '«Men bu ishni ertaga tugataman»', 'Я закончу эту работу завтра.', 'Я буду заканчивать эту работу завтра.', 'Я заканчиваю эту работу завтра.', 'Я заканчивал эту работу завтра.', 0),
  (42, 'rule', 3, '«Biz ularni uchratamiz (bir marta)»', 'Мы будем встречать их.', 'Мы встречаем их.', 'Мы встретим их.', 'Мы встречали их.', 2),
  (42, 'rule', 4, '«U kelasi hafta bu kitobni tugatmaydi»', 'Он не будет заканчивать эту книгу на следующей неделе.', 'Он не закончит эту книгу на следующей неделе.', 'Он не заканчивает эту книгу на следующей неделе.', 'Он не заканчивал эту книгу на следующей неделе.', 1),
  (42, 'rule', 5, '«Siz ertaga nima qilasiz? – Men xat yozaman» — eng mos', 'Faqat jarayon gap.', 'Faqat natija gap.', 'Ikkalasi ham kontekstga qarab mumkin.', 'Hech biri.', 2),
  (42, 'rule', 6, '«прочитаю» qaysi gapda mos (bir marta)?', 'Я прочитаю эту книгу завтра вечером.', 'Я прочитаю эту книгу каждый вечер.', 'Я прочитаю эту книгу и отдыхаю.', 'Hech qaysi.', 0),
  (42, 'rule', 7, '«Ular bir marta uchrashadilar»', 'Они будут встречаться.', 'Они встречаются.', 'Они встретятся.', 'Они встречались.', 2),
  (42, 'rule', 8, '«Sen bu topshiriqni bajarasanmi? (natija)»', 'Ты будешь выполнять это задание?', 'Ты выполнишь это задание?', 'Ты выполняешь это задание?', 'Ты выполнял это задание?', 1),
  (42, 'rule', 9, '«Men sizga bitta marta, aniq vaqtda qo‘ng‘iroq qilaman»', 'Я буду звонить вам.', 'Я звоню вам.', 'Я позвоню вам.', 'Я звонил вам.', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (42, 0, 0, 'Я буду читать книгу весь вечер.', 'Я прочитаю эту книгу за неделю.'),
  (42, 0, 1, 'Я буду звонить тебе каждый день.', 'Я позвоню тебе завтра утром.'),
  (42, 0, 2, 'Мы будем встречаться каждую субботу.', 'Мы встретимся у метро.'),
  (42, 0, 3, 'Он будет писать письмо час.', 'Он напишет письмо и отправит.'),
  (42, 0, 4, 'Я буду учить стихотворение весь день.', 'Я выучу стихотворение к вечеру.'),
  (42, 0, 5, 'Она будет готовить обед с 3 до 5.', 'Она приготовит обед к 5 часам.'),
  (42, 0, 6, 'Мы будем смотреть фильм, когда ты придёшь.', 'Мы посмотрим фильм и пойдём гулять.'),
  (42, 0, 7, 'Он будет переводить текст два часа.', 'Он переведёт текст за час.'),
  (42, 0, 8, 'Я буду ждать тебя у выхода.', 'Я дождусь тебя, не уходи.'),
  (42, 0, 9, 'Они будут решать эту проблему долго.', 'Они решат эту проблему быстро.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (42, 0, 'uz', '(я, завтра, прочитать, этот, книга)', ARRAY['Я', 'завтра', 'прочитаю', 'эту', 'книгу.', 'читаю'], 'Я завтра прочитаю эту книгу.'),
  (42, 1, 'uz', '(ты, когда, написать, письмо, мама)', ARRAY['Когда', 'ты', 'напишешь', 'письмо', 'маме?', 'пишешь'], 'Когда ты напишешь письмо маме?'),
  (42, 2, 'uz', '(мы, встретить, наш, друг, на, вокзал)', ARRAY['Мы', 'встретим', 'нашего', 'друга', 'на', 'вокзале.', 'встречаем'], 'Мы встретим нашего друга на вокзале.'),
  (42, 3, 'uz', '(она, приготовить, ужин, к, 7, часам)', ARRAY['Она', 'приготовит', 'ужин', 'к', '7', 'часам.', 'готовит'], 'Она приготовит ужин к 7 часам.'),
  (42, 4, 'uz', '(вы, позвонить, мне, сегодня, вечером)', ARRAY['Вы', 'позвоните', 'мне', 'сегодня', 'вечером?', 'звоните'], 'Вы позвоните мне сегодня вечером?'),
  (42, 5, 'uz', '(они, построить, новый, дом, в, следующем, году)', ARRAY['Они', 'построят', 'новый', 'дом', 'в', 'следующем', 'году.', 'строят'], 'Они построят новый дом в следующем году.'),
  (42, 6, 'uz', '(я, не, забыть, твой, день, рождения)', ARRAY['Я', 'не', 'забуду', 'твой', 'день', 'рождения.', 'забываю'], 'Я не забуду твой день рождения.'),
  (42, 7, 'uz', '(когда, ты, вернуться, из, отпуска)', ARRAY['Когда', 'ты', 'вернёшься', 'из', 'отпуска?', 'возвращаешься'], 'Когда ты вернёшься из отпуска?'),
  (42, 8, 'uz', '(он, купить, машина, через, месяц)', ARRAY['Он', 'купит', 'машину', 'через', 'месяц.', 'покупает'], 'Он купит машину через месяц.'),
  (42, 9, 'uz', '(мы, решить, эта, проблема, вместе)', ARRAY['Мы', 'решим', 'эту', 'проблему', 'вместе.', 'решаем'], 'Мы решим эту проблему вместе.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (42, 0, 'Ish (vazifa)', 'Дело'),
  (42, 1, 'Shanba', 'Суббота'),
  (42, 2, 'Muvaffaqiyat', 'Успех'),
  (42, 3, 'Mahsulot', 'Продукт'),
  (42, 4, 'Kesmoq', 'Нарезать'),
  (42, 5, 'Qaynatmoq', 'Сварить'),
  (42, 6, 'O‘tiramoq (birga)', 'Посидеть'),
  (42, 7, 'Kulmoq', 'Посмеяться'),
  (42, 8, 'Yangilik', 'Новость'),
  (42, 9, 'Nihoyat', 'Наконец'),
  (42, 10, 'Ishonmoq', 'Быть уверенным'),
  (42, 11, 'Vazifa', 'Задание / задача'),
  (42, 12, 'Qaytib kelmoq', 'Вернуться'),
  (42, 13, 'Qancha vaqtda', 'За сколько времени'),
  (42, 14, 'Kiraverish', 'Вход');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  42,
  'Мои планы на выходные',
  $body$
В эти выходные я сделаю много дел.

В субботу утром я позвоню родителям. Я расскажу им о своих успехах. Потом я поеду в магазин и куплю продукты.

Днём я приготовлю обед для всей семьи. Я нарежу овощи и сварю суп.

Вечером я встречусь с друзьями в кафе. Мы посидим там пару часов, поговорим о жизни и посмеёмся.

В воскресенье я напишу письмо своему старому другу в другой город. Я расскажу ему о всех новостях.

Наконец, я посмотрю новый фильм по телевизору и отдохну.

Я уверен, что эти выходные будут прекрасными.
$body$,
  'kunlik-oqish-42'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-42', 'выходные', 'выходные', 'Dam olish kunlari', NULL),
  ('kunlik-oqish-42', 'сделаю', 'сделаю', 'Qilaman (СВ)', NULL),
  ('kunlik-oqish-42', 'дел', 'дел', 'Ishlar', NULL),
  ('kunlik-oqish-42', 'субботу', 'субботу', 'Shanbani', NULL),
  ('kunlik-oqish-42', 'утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-42', 'позвоню', 'позвоню', 'Qo‘ng‘iroq qilaman (СВ)', NULL),
  ('kunlik-oqish-42', 'родителям', 'родителям', 'Ota-onamga', NULL),
  ('kunlik-oqish-42', 'расскажу', 'расскажу', 'Aytib beraman (СВ)', NULL),
  ('kunlik-oqish-42', 'успехах', 'успехах', 'Muvaffaqiyatlar haqida', NULL),
  ('kunlik-oqish-42', 'поеду', 'поеду', 'Boraman (transport, СВ)', NULL),
  ('kunlik-oqish-42', 'магазин', 'магазин', 'Do‘kon', NULL),
  ('kunlik-oqish-42', 'куплю', 'куплю', 'Sotib olaman (СВ)', NULL),
  ('kunlik-oqish-42', 'продукты', 'продукты', 'Mahsulotlar', NULL),
  ('kunlik-oqish-42', 'Днём', 'днём', 'Kunduzi', NULL),
  ('kunlik-oqish-42', 'приготовлю', 'приготовлю', 'Tayyorlayman (СВ)', NULL),
  ('kunlik-oqish-42', 'обед', 'обед', 'Tushlik', NULL),
  ('kunlik-oqish-42', 'семьи', 'семьи', 'Oilaning', NULL),
  ('kunlik-oqish-42', 'нарежу', 'нарежу', 'Kesaman (СВ)', NULL),
  ('kunlik-oqish-42', 'овощи', 'овощи', 'Sabzavotlar', NULL),
  ('kunlik-oqish-42', 'сварю', 'сварю', 'Qaynataman (СВ)', NULL),
  ('kunlik-oqish-42', 'суп', 'суп', 'Sho‘rva', NULL),
  ('kunlik-oqish-42', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-42', 'встречусь', 'встречусь', 'Uchrashaman (СВ)', NULL),
  ('kunlik-oqish-42', 'друзьями', 'друзьями', 'Do‘stlar bilan', NULL),
  ('kunlik-oqish-42', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-42', 'посидим', 'посидим', 'O‘tirib olamiz (СВ)', NULL),
  ('kunlik-oqish-42', 'часов', 'часов', 'Soat', NULL),
  ('kunlik-oqish-42', 'поговорим', 'поговорим', 'Gaplashamiz (СВ)', NULL),
  ('kunlik-oqish-42', 'жизни', 'жизни', 'Hayot haqida', NULL),
  ('kunlik-oqish-42', 'посмеёмся', 'посмеемся', 'Kulib yuboramiz (СВ)', NULL),
  ('kunlik-oqish-42', 'воскресенье', 'воскресенье', 'Yakshanba', NULL),
  ('kunlik-oqish-42', 'напишу', 'напишу', 'Yozaman (СВ)', NULL),
  ('kunlik-oqish-42', 'письмо', 'письмо', 'Xat', NULL),
  ('kunlik-oqish-42', 'другу', 'другу', 'Do‘stga', NULL),
  ('kunlik-oqish-42', 'город', 'город', 'Shahar', NULL),
  ('kunlik-oqish-42', 'новостях', 'новостях', 'Yangiliklar haqida', NULL),
  ('kunlik-oqish-42', 'Наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-42', 'посмотрю', 'посмотрю', 'Ko‘raman (СВ)', NULL),
  ('kunlik-oqish-42', 'отдохну', 'отдохну', 'Dam olaman (СВ)', NULL),
  ('kunlik-oqish-42', 'уверен', 'уверен', 'Ishonaman', NULL),
  ('kunlik-oqish-42', 'прекрасными', 'прекрасными', 'Ajoyib', NULL),
  ('kunlik-oqish-42', 'старому', 'старому', 'Eski', NULL),
  ('kunlik-oqish-42', 'фильм', 'фильм', 'Film', NULL),
  ('kunlik-oqish-42', 'телевизору', 'телевизору', 'Televizorda', NULL),
  ('kunlik-oqish-42', 'эти', 'эти', 'Bu', NULL),
  ('kunlik-oqish-42', 'всей', 'всей', 'Butun (oilaga nisbatan)', NULL),
  ('kunlik-oqish-42', 'другой', 'другой', 'Boshqa', NULL),
  ('kunlik-oqish-42', 'их', 'их', 'Ularga', NULL),
  ('kunlik-oqish-42', 'ему', 'ему', 'Unga', NULL),
  ('kunlik-oqish-42', 'там', 'там', 'U yerda', NULL),
  ('kunlik-oqish-42', 'пару', 'пару', 'Bir necha', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (42, 0, 'Siz bu vazifani qachon bajarasiz?', 'Когда вы выполните это задание?'),
  (42, 1, 'Men ertaga do‘stimga qo‘ng‘iroq qilaman.', 'Я позвоню другу завтра.'),
  (42, 2, 'Ular qaytib kelganlarida, biz ularni kutib olamiz.', 'Когда они вернутся, мы их встретим.'),
  (42, 3, 'Siz bu kitobni qancha vaqtda o‘qib chiqasiz?', 'За сколько времени вы прочитаете эту книгу?'),
  (42, 4, 'Ertaga soat 6 da uchrashamiz.', 'Встретимся завтра в 6 часов.'),
  (42, 5, 'U hech qachon kechikmaydi, vaqtida keladi.', 'Он никогда не опоздает, придёт вовремя.'),
  (42, 6, 'Iltimos, kiraverishda meni kuting.', 'Пожалуйста, подождите меня у входа.'),
  (42, 7, 'Siz ertalab nonushtani o‘zingiz tayyorlaysizmi?', 'Вы сами приготовите завтрак утром?'),
  (42, 8, 'U yozda Qrimga boradi va u yerda bir oy dam oladi.', 'Летом он поедет в Крым и отдохнёт там месяц.'),
  (42, 9, 'Kechirasiz, sizning vaqtingizni olib qo‘ymayman.', 'Извините, я не буду отнимать ваше время.');

-- ========== Kun 43 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  43,
  'Kelasi zamonda НСВ va СВ farqi',
  $theory$
**Savol:** *Что буду делать?* (jarayon) vs *Что сделаю?* (natija).

**НСВ kelasi:** буду + инфинитив — uzoqlik, takror, davomiylik.
**СВ kelasi:** fe’lning kelasi shakli — yakun, chegarlangan vaqt, «за час», «скоро».

**Juftlar:** читать — прочитать; писать — написать; делать — сделать; говорить — сказать; решать — решить; покупать — купить.

**Inkор:** *Я не буду это делать.* / *Я не сделаю этого.*

Диалогда bir savol jarayonga (*будешь делать?*), keyingisi natijaga (*сделаешь?*) yo‘naltirilishi mumkin.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (43, 'rule', 0, '«Men kechqurun kitob o‘qiyman» — jarayon (kelasi)', 'Я буду читать книгу вечером.', 'Я прочитаю книгу вечером.', 'Я читаю книгу вечером.', 'Я читал книгу вечером.', 0),
  (43, 'rule', 1, '«U kelasi hafta loyihani tugatadi»', 'Он будет заканчивать этот проект на следующей неделе.', 'Он закончит этот проект на следующей неделе.', 'Он заканчивает этот проект на следующей неделе.', 'Он заканчивал этот проект на следующей неделе.', 1),
  (43, 'rule', 2, '«Sen ertaga nima qilasan?» — jarayonga urg‘u', 'Что ты будешь делать завтра?', 'Что ты сделаешь завтра?', 'Что ты делаешь завтра?', 'Что ты делал завтра?', 0),
  (43, 'rule', 3, '«Har kuni ertalab nonushta tayyorlayman» — kelasi, takror', 'Каждое утро я буду готовить завтрак.', 'Каждое утро я приготовлю завтрак.', 'Каждое утро я готовлю завтрак.', 'Каждое утро я готовил завтрак.', 0),
  (43, 'rule', 4, '«Siz bu muammoni qanday hal qilasiz?»', 'Как вы будете решать эту проблему?', 'Как вы решите эту проблему?', 'Обе формы возможны (по контексту).', 'Только прошедшее время.', 2),
  (43, 'rule', 5, '«U bu ishni qilmaydi» — natija', 'Он не будет делать эту работу.', 'Он не сделает эту работу.', 'Он не делает эту работу.', 'Он не делал эту работу.', 1),
  (43, 'rule', 6, '«Qachon kelasan?» — muntazam kelish jarayoni', 'Когда ты будешь приходить?', 'Когда ты придёшь?', 'Когда ты приходишь?', 'Когда ты пришёл?', 0),
  (43, 'rule', 7, '«U bir oyda ingliz tilini o‘rganadi» — chegarlangan natija', 'Он будет учить английский язык за месяц.', 'Он выучит английский язык за месяц.', 'Он учит английский язык за месяц.', 'Он учил английский язык за месяц.', 1),
  (43, 'rule', 8, '«Men poyezdni kutaman» — uzoq jarayon', 'Я буду ждать поезд.', 'Я подожду поезд.', 'Я жду поезд.', 'Я ждал поезд.', 0),
  (43, 'rule', 9, '«U bu savolga javob beradi»', 'Он будет отвечать на этот вопрос.', 'Он ответит на этот вопрос.', 'Он отвечает на этот вопрос.', 'Он отвечал на этот вопрос.', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (43, 0, 0, 'Я буду просыпаться в 7 каждое утро.', 'Я завтра утром проснусь в 7.'),
  (43, 0, 1, 'Она будет готовить ужин два часа.', 'Она за час приготовит ужин.'),
  (43, 0, 2, 'Мы будем говорить весь вечер.', 'Мы за час решим этот вопрос.'),
  (43, 0, 3, 'За сколько времени ты будешь читать книгу?', 'За сколько времени ты прочитаешь книгу?'),
  (43, 0, 4, 'Они каждый день будут звонить мне утром.', 'Они завтра утром мне позвонят.'),
  (43, 0, 5, 'Я буду ждать тебя — не торопись.', 'Я тебя дождусь, не уходи.'),
  (43, 0, 6, 'Он долго будет делать эту работу.', 'Он быстро сделает эту работу.'),
  (43, 0, 7, 'Дети вечером не будут спать долго.', 'Дети завтра рано уснут.'),
  (43, 0, 8, 'Летом я каждый день буду гулять с друзьями.', 'Летом мы один раз поедем в путешествие.'),
  (43, 0, 9, 'Он каждый день занимается спортом.', 'Он завтра один раз сходит в спортзал.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (43, 0, 'uz', '(я, завтра, весь, вечер, читать, книга)', ARRAY['Я', 'завтра', 'весь', 'вечер', 'буду', 'читать', 'книгу.', 'прочитаю'], 'Я завтра весь вечер буду читать книгу.'),
  (43, 1, 'uz', '(ты, завтра, прочитать, этот, рассказ, и, пересказать)', ARRAY['Ты', 'завтра', 'прочитаешь', 'этот', 'рассказ', 'и', 'перескажешь.', 'будешь'], 'Ты завтра прочитаешь этот рассказ и перескажешь.'),
  (43, 2, 'uz', '(мы, каждый, день, ходить, в, бассейн)', ARRAY['Мы', 'каждый', 'день', 'будем', 'ходить', 'в', 'бассейн.', 'ходим'], 'Мы каждый день будем ходить в бассейн.'),
  (43, 3, 'uz', '(он, через, неделю, купить, новый, телефон)', ARRAY['Он', 'через', 'неделю', 'купит', 'новый', 'телефон.', 'будет'], 'Он через неделю купит новый телефон.'),
  (43, 4, 'uz', '(вы, когда, вернуться, из, командировка)', ARRAY['Когда', 'вы', 'вернётесь', 'из', 'командировки?', 'вернетесь'], 'Когда вы вернётесь из командировки?'),
  (43, 5, 'uz', '(я, не, забыть, твой, совет)', ARRAY['Я', 'не', 'забуду', 'твой', 'совет.', 'буду'], 'Я не забуду твой совет.'),
  (43, 6, 'uz', '(они, долго, спорить, но, не, решить, проблема)', ARRAY['Они', 'будут', 'долго', 'спорить,', 'но', 'не', 'решат', 'проблему.', 'решили'], 'Они будут долго спорить, но не решат проблему.'),
  (43, 7, 'uz', '(что, ты, делать, на, выходных, – отдыхать)', ARRAY['Что', 'ты', 'будешь', 'делать', 'на', 'выходных?', '–', 'Отдыхать.', 'сделаешь'], 'Что ты будешь делать на выходных? – Отдыхать.'),
  (43, 8, 'uz', '(она, приготовить, ужин, к, 8, часам)', ARRAY['Она', 'приготовит', 'ужин', 'к', '8', 'часам.', 'будет'], 'Она приготовит ужин к 8 часам.'),
  (43, 9, 'uz', '(мы, обязательно, встретиться, летом)', ARRAY['Мы', 'обязательно', 'встретимся', 'летом.', 'будем'], 'Мы обязательно встретимся летом.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (43, 0, 'Yoz', 'Лето'),
  (43, 1, 'Dengiz', 'Море'),
  (43, 2, 'Sayohat', 'Поездка'),
  (43, 3, 'Tayyorgarlik ko‘rmoq', 'Готовиться'),
  (43, 4, 'Cho‘milish kostyumi', 'Купальный костюм'),
  (43, 5, 'Krem', 'Крем'),
  (43, 6, 'Quyosh', 'Солнце / загар'),
  (43, 7, 'Buterbrod', 'Бутерброд'),
  (43, 8, 'Chodir', 'Палатка'),
  (43, 9, 'Qarmoq', 'Удочка'),
  (43, 10, 'Sho‘ng‘imoq', 'Нырять'),
  (43, 11, 'Krol (suzish)', 'Кроль'),
  (43, 12, 'Bog‘ga qaramoq', 'Ухаживать'),
  (43, 13, 'Chig‘anoq', 'Ракушка'),
  (43, 14, 'Unutilmas', 'Незабываемый');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  43,
  'Летние планы',
  $body$
Летом я и моя семья поедем на море. Мы будем отдыхать там две недели.

Я уже начал готовиться к поездке. На этой неделе я куплю новые купальные костюмы и крем от загара.

Мама сказала, что она приготовит вкусные бутерброды в дорогу. Папа пообещал взять палатку и удочки.

Мы будем жить в палатке и каждый день купаться. Я научусь плавать кролем и нырять.

Бабушка не поедет с нами, потому что она будет ухаживать за огородом. Но она попросила нас привезти ей ракушки и красивый камень.

Я уверен, что эта поездка будет незабываемой. Мы будем вспоминать её всю зиму.
$body$,
  'kunlik-oqish-43'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-43', 'Летом', 'летом', 'Yozda', NULL),
  ('kunlik-oqish-43', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-43', 'поедем', 'поедем', 'Boramiz (СВ)', NULL),
  ('kunlik-oqish-43', 'море', 'море', 'Dengiz', NULL),
  ('kunlik-oqish-43', 'будем', 'будем', 'Bo‘lamiz', NULL),
  ('kunlik-oqish-43', 'отдыхать', 'отдыхать', 'Dam olmoq', NULL),
  ('kunlik-oqish-43', 'недели', 'недели', 'Hafta', NULL),
  ('kunlik-oqish-43', 'начал', 'начал', 'Boshladim', NULL),
  ('kunlik-oqish-43', 'готовиться', 'готовиться', 'Tayyorgarlik ko‘rmoq', NULL),
  ('kunlik-oqish-43', 'поездке', 'поездке', 'Sayohatga', NULL),
  ('kunlik-oqish-43', 'куплю', 'куплю', 'Sotib olaman (СВ)', NULL),
  ('kunlik-oqish-43', 'купальные', 'купальные', 'Cho‘milish …', NULL),
  ('kunlik-oqish-43', 'костюмы', 'костюмы', 'Kostyumlar', NULL),
  ('kunlik-oqish-43', 'крем', 'крем', 'Krem', NULL),
  ('kunlik-oqish-43', 'загара', 'загара', 'Quyoshdan qoralanish', NULL),
  ('kunlik-oqish-43', 'сказала', 'сказала', 'Aytdi', NULL),
  ('kunlik-oqish-43', 'приготовит', 'приготовит', 'Tayyorlaydi (СВ)', NULL),
  ('kunlik-oqish-43', 'бутерброды', 'бутерброды', 'Buterbrodlar', NULL),
  ('kunlik-oqish-43', 'дорогу', 'дорогу', 'Yo‘lga', NULL),
  ('kunlik-oqish-43', 'пообещал', 'пообещал', 'Va’da berdi', NULL),
  ('kunlik-oqish-43', 'палатку', 'палатку', 'Chodirni', NULL),
  ('kunlik-oqish-43', 'удочки', 'удочки', 'Qarmoqlar', NULL),
  ('kunlik-oqish-43', 'жить', 'жить', 'Yashamoq', NULL),
  ('kunlik-oqish-43', 'палатке', 'палатке', 'Chodirda', NULL),
  ('kunlik-oqish-43', 'купаться', 'купаться', 'Cho‘milmoq', NULL),
  ('kunlik-oqish-43', 'научусь', 'научусь', 'O‘rganaman (СВ)', NULL),
  ('kunlik-oqish-43', 'плавать', 'плавать', 'Suzmoq', NULL),
  ('kunlik-oqish-43', 'кролем', 'кролем', 'Krol uslubi', NULL),
  ('kunlik-oqish-43', 'нырять', 'нырять', 'Sho‘ng‘imoq', NULL),
  ('kunlik-oqish-43', 'Бабушка', 'бабушка', 'Buva', NULL),
  ('kunlik-oqish-43', 'поедет', 'поедет', 'Boradi (СВ)', NULL),
  ('kunlik-oqish-43', 'ухаживать', 'ухаживать', 'Parvarish qilmoq', NULL),
  ('kunlik-oqish-43', 'огородом', 'огородом', 'Bog‘ bilan', NULL),
  ('kunlik-oqish-43', 'попросила', 'попросила', 'So‘radi', NULL),
  ('kunlik-oqish-43', 'привезти', 'привезти', 'Olib kelmoq', NULL),
  ('kunlik-oqish-43', 'ракушки', 'ракушки', 'Chig‘anoqlar', NULL),
  ('kunlik-oqish-43', 'камень', 'камень', 'Tosh', NULL),
  ('kunlik-oqish-43', 'поездка', 'поездка', 'Sayohat', NULL),
  ('kunlik-oqish-43', 'незабываемой', 'незабываемой', 'Unutilmas', NULL),
  ('kunlik-oqish-43', 'вспоминать', 'вспоминать', 'Eslamoq', NULL),
  ('kunlik-oqish-43', 'зиму', 'зиму', 'Qish davomida', NULL),
  ('kunlik-oqish-43', 'уверен', 'уверен', 'Ishonaman', NULL),
  ('kunlik-oqish-43', 'вкусные', 'вкусные', 'Mazali', NULL),
  ('kunlik-oqish-43', 'взять', 'взять', 'Olmoq', NULL),
  ('kunlik-oqish-43', 'каждый', 'каждый', 'Har', NULL),
  ('kunlik-oqish-43', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-43', 'нами', 'нами', 'Biz bilan', NULL),
  ('kunlik-oqish-43', 'нас', 'нас', 'Bizdan', NULL),
  ('kunlik-oqish-43', 'ей', 'ей', 'Unga', NULL),
  ('kunlik-oqish-43', 'её', 'ее', 'Uni', NULL),
  ('kunlik-oqish-43', 'эта', 'эта', 'Bu', NULL),
  ('kunlik-oqish-43', 'новые', 'новые', 'Yangi', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (43, 0, 'Siz bu yozda qayerda dam olasiz?', 'Где вы будете отдыхать этим летом?'),
  (43, 1, 'U dengiz bo‘yiga bormoqchi va ikki hafta dam olmoqchi.', 'Он хочет поехать на море и отдохнуть две недели.'),
  (43, 2, 'Siz sayohatga tayyorgarlik ko‘rishni qachon boshlaysiz?', 'Когда вы начнёте готовиться к поездке?'),
  (43, 3, 'Ertaga do‘konga boraman va yangi sarg‘ish krem sotib olaman.', 'Завтра я пойду в магазин и куплю новый крем для загара.'),
  (43, 4, 'Sizning onangiz yo‘l uchun nima tayyorlaydi?', 'Что ваша мама приготовит в дорогу?'),
  (43, 5, 'Biz chodirda yashaymiz va har kuni dengizda suzamiz.', 'Мы будем жить в палатке и каждый день купаться.'),
  (43, 6, 'U baliq tutishni yaxshi ko‘radi, shuning uchun qarmoq oladi.', 'Он любит ловить рыбу, поэтому возьмёт удочки.'),
  (43, 7, 'Siz suzishni qachon o‘rgandingiz? – Bolaligimda o‘rganganman.', 'Когда вы научились плавать? – Я научился в детстве.'),
  (43, 8, 'Buvisi uchun dengizdan nima olib kelasiz? – Chig‘anoq va tosh.', 'Что вы привезёте бабушке с моря? – Ракушки и камень.'),
  (43, 9, 'Ushbu sayohat qishda ham esda qoladimi? – Albatta!', 'Эта поездка запомнится на всю зиму? – Конечно!');

-- ========== Kun 44 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  44,
  'Kelasi zamon: dialog va rejalar (takrorlash)',
  $theory$
**Kalit iboralar:** весь день, каждый долго → ko‘pincha НСВ (*буду делать*); за час, скоро, завтра (natija) → ko‘pincha СВ (*сделаю*, *прочитаю*).

**So‘zdagi farq:** *готовиться* (jarayon) / *приготовиться* (tayyor bo‘lish natijasi).

**Dialog namunasi:**
– *Что ты будешь делать вечером?*
– *Буду смотреть телевизор.*
– *А уроки ты сделаешь?*
– *Да, сделаю утром.*

Inkор boshlashdan voz kechish: *никогда не буду этим заниматься.*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (44, 'rule', 0, '«Kechqurun nima qilasan? – Televizor ko‘raman» — jarayon', 'Что ты сделаешь вечером? – Посмотрю телевизор.', 'Что ты будешь делать вечером? – Буду смотреть телевизор.', 'Что ты делаешь вечером? – Смотрю телевизор.', 'Hech biri.', 1),
  (44, 'rule', 1, '«Tayyorgarlik ko‘rishga vaqting bormi?»', 'У тебя будет время готовиться?', 'У тебя будет время приготовиться?', 'У тебя есть время готовиться?', 'Hech biri.', 0),
  (44, 'rule', 2, '«Скоро» bilan — odatda natija', 'Скоро я буду читать эту книгу.', 'Скоро я прочитаю эту книгу.', 'Скоро я читаю эту книгу.', 'Hech biri.', 1),
  (44, 'rule', 3, '«U kuni bo‘yi uyda o‘tirib turadi» — davomiylik', 'Он будет сидеть дома целый день и ничего не будет делать.', 'Он посидит дома целый день и ничего не сделает.', 'Он сидит дома целый день и ничего не делает.', 'Hech biri.', 0),
  (44, 'rule', 4, '«U ertalab soat 9 gacha uyg‘onadi» — bir lahzalik natija', 'Он будет просыпаться утром до 9 часов.', 'Он проснётся утром до 9 часов.', 'Он просыпается утром до 9 часов.', 'Hech biri.', 1),
  (44, 'rule', 5, '«Qachon kelasan? – Soat 6 da» — aniq bir martalik', 'Когда ты будешь приходить? – В 6 часов.', 'Когда ты придёшь? – В 6 часов.', 'Когда ты приходишь? – В 6 часов.', 'Hech biri.', 1),
  (44, 'rule', 6, '«Men bunga hech qachon qarshilik qilmayman» — boshlashni ham inkор', 'Я никогда не буду этим заниматься.', 'Я никогда не займусь этим.', 'Я никогда этим не занимаюсь.', 'Hech biri.', 0),
  (44, 'rule', 7, '«U bu topshiriqni tez bajaradi»', 'Он будет выполнять это задание быстро.', 'Он выполнит это задание быстро.', 'Он выполняет это задание быстро.', 'Hech biri.', 1),
  (44, 'rule', 8, '«Har kuni men soat 7 da uyg‘onaman» — kelasi rejada takror', 'Каждый день я буду просыпаться в 7.', 'Каждый день я проснусь в 7.', 'Каждый день я просыпаюсь в 7.', 'Hech biri.', 0),
  (44, 'rule', 9, '«Sizga qachon qo‘ng‘iroq qilishim mumkin?» — bir martalik', 'Когда я могу тебе звонить?', 'Когда я могу тебе позвонить?', 'Когда я тебе звоню?', 'Hech biri.', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (44, 0, 0, 'Ertaga nima qilasan? — Kitob o‘qiyman (davomiylik).', '— Что ты будешь делать завтра? — Буду читать книгу.'),
  (44, 0, 1, 'Ertaga nima qilasan? — Kitobni o‘qib tugataman.', '— Что ты сделаешь завтра? — Прочитаю книгу.'),
  (44, 0, 2, 'Kechqurun menga qo‘ng‘iroq qila olasanmi? — Ha.', '— Ты можешь мне позвонить вечером? — Да, позвоню.'),
  (44, 0, 3, 'Kechqurun albatta qo‘ng‘iroq qil.', '— Обязательно позвони мне вечером.'),
  (44, 0, 4, 'Bu ishni qancha vaqtda tugatasiz? — Taxminan ikki soatda.', '— За сколько времени вы сможете сделать эту работу? — Примерно за два часа.'),
  (44, 0, 5, 'Bu ishni qancha vaqt davomida qilasiz? — Taxminan ikki soat.', '— Сколько времени вы будете делать эту работу? — Примерно два часа.'),
  (44, 0, 6, 'U keladimi? — Ha, keladi (har safar).', '— Он будет приходить? — Да, будет приходить.'),
  (44, 0, 7, 'U keladimi? — Ha, vaqtida keladi.', '— Он придёт? — Да, придёт вовремя.'),
  (44, 0, 8, 'Sizga nonushta tayyorlab qo‘yaymi? — Yo‘q, o‘zim tayyorlayman.', '— Приготовить тебе завтрак? — Нет, я приготовлю сам.'),
  (44, 0, 9, 'Kutib turasizmi? — Ha, kutaman.', '— Вы будете ждать? — Да, буду ждать.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (44, 0, 'uz', '(завтра, я, весь, день, читать, и, писать)', ARRAY['Завтра', 'я', 'весь', 'день', 'буду', 'читать', 'и', 'писать.', 'прочитаю'], 'Завтра я весь день буду читать и писать.'),
  (44, 1, 'uz', '(через, месяц, мы, переехать, в, новый, дом)', ARRAY['Через', 'месяц', 'мы', 'переедем', 'в', 'новый', 'дом.', 'переехали'], 'Через месяц мы переедем в новый дом.'),
  (44, 2, 'uz', '(ты, долго, ждать, меня, перед, театр)', ARRAY['Ты', 'будешь', 'долго', 'ждать', 'меня', 'перед', 'театром?', 'подождёшь'], 'Ты будешь долго ждать меня перед театром?'),
  (44, 3, 'uz', '(когда, вы, закончить, этот, проект)', ARRAY['Когда', 'вы', 'закончите', 'этот', 'проект?', 'заканчиваете'], 'Когда вы закончите этот проект?'),
  (44, 4, 'uz', '(я, не, быть, делать, это, никогда)', ARRAY['Я', 'никогда', 'не', 'буду', 'делать', 'это.', 'сделаю'], 'Я никогда не буду делать это.'),
  (44, 5, 'uz', '(она, быстро, научиться, говорить, по-русски)', ARRAY['Она', 'быстро', 'научится', 'говорить', 'по-русски.', 'учится'], 'Она быстро научится говорить по-русски.'),
  (44, 6, 'uz', '(мы, каждый, утро, бегать, в, парке)', ARRAY['Мы', 'будем', 'бегать', 'в', 'парке', 'каждое', 'утро.', 'пробежим'], 'Мы будем бегать в парке каждое утро.'),
  (44, 7, 'uz', '(ты, что, подарить, маме, на, день, рождения)', ARRAY['Что', 'ты', 'подаришь', 'маме', 'на', 'день', 'рождения?', 'будешь'], 'Что ты подаришь маме на день рождения?'),
  (44, 8, 'uz', '(дети, скоро, вырасти, и, уехать, учиться)', ARRAY['Дети', 'скоро', 'вырастут', 'и', 'уедут', 'учиться.', 'вырастают'], 'Дети скоро вырастут и уедут учиться.'),
  (44, 9, 'uz', '(я, обязательно, прийти, на, твой, концерт)', ARRAY['Я', 'обязательно', 'приду', 'на', 'твой', 'концерт.', 'буду'], 'Я обязательно приду на твой концерт.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (44, 0, 'Dam olish kunlari', 'Выходные'),
  (44, 1, 'Dacha', 'Дача'),
  (44, 2, 'Sug‘ormoq', 'Полить'),
  (44, 3, 'Hosil', 'Урожай'),
  (44, 4, 'Yig‘moq', 'Собрать'),
  (44, 5, 'Quyoshda yonmoq', 'Загорать'),
  (44, 6, 'Loyiha', 'Проект'),
  (44, 7, 'Tugatmoq', 'Закончить'),
  (44, 8, 'Oxir', 'Конец'),
  (44, 9, 'Omad tilamoq', 'Желаю удачи'),
  (44, 10, 'Tez orada', 'Скоро'),
  (44, 11, 'Ko‘rishmoq', 'Увидеться'),
  (44, 12, 'Masala', 'Вопрос'),
  (44, 13, 'Va’da bermoq', 'Обещать'),
  (44, 14, 'Ishonch hosil qilmoq', 'Убедиться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  44,
  'Разговор друзей о будущем',
  $body$
– Привет, Лена! Что ты будешь делать в следующее воскресенье?

– Привет, Саша! Я буду готовиться к экзамену. А что ты будешь делать?

– Я поеду на дачу к бабушке. Я помогу ей полить цветы и собрать урожай.

– А что ты сделаешь вечером?

– Вечером я посмотрю новый фильм или почитаю книгу. А что ты будешь делать летом?

– Летом мы поедем с семьёй в Сочи. Мы будем загорать и купаться каждый день.

– А ты отдохнёшь или будешь работать?

– Я буду работать над своим проектом. Я надеюсь, что закончу его к концу лета.

– Желаю тебе удачи! Скоро увидимся!

– Спасибо! Пока!
$body$,
  'kunlik-oqish-44'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-44', 'Привет', 'привет', 'Salom', NULL),
  ('kunlik-oqish-44', 'воскресенье', 'воскресенье', 'Yakshanba', NULL),
  ('kunlik-oqish-44', 'будешь', 'будешь', 'Bo‘lasan', NULL),
  ('kunlik-oqish-44', 'делать', 'делать', 'Qilmoq', NULL),
  ('kunlik-oqish-44', 'готовиться', 'готовиться', 'Tayyorgarlik ko‘rmoq', NULL),
  ('kunlik-oqish-44', 'экзамену', 'экзамену', 'Imtihonga', NULL),
  ('kunlik-oqish-44', 'поеду', 'поеду', 'Boraman (СВ)', NULL),
  ('kunlik-oqish-44', 'дачу', 'дачу', 'Dachaga', NULL),
  ('kunlik-oqish-44', 'бабушке', 'бабушке', 'Buvaga', NULL),
  ('kunlik-oqish-44', 'помогу', 'помогу', 'Yordam beraman (СВ)', NULL),
  ('kunlik-oqish-44', 'полить', 'полить', 'Sug‘ormoq', NULL),
  ('kunlik-oqish-44', 'цветы', 'цветы', 'Gullar', NULL),
  ('kunlik-oqish-44', 'собрать', 'собрать', 'Yig‘moq', NULL),
  ('kunlik-oqish-44', 'урожай', 'урожай', 'Hosil', NULL),
  ('kunlik-oqish-44', 'сделаешь', 'сделаешь', 'Qilasan (СВ)', NULL),
  ('kunlik-oqish-44', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-44', 'посмотрю', 'посмотрю', 'Ko‘raman (СВ)', NULL),
  ('kunlik-oqish-44', 'почитаю', 'почитаю', 'O‘qiyman (СВ)', NULL),
  ('kunlik-oqish-44', 'летом', 'летом', 'Yozda', NULL),
  ('kunlik-oqish-44', 'поедем', 'поедем', 'Boramiz (СВ)', NULL),
  ('kunlik-oqish-44', 'семьёй', 'семьей', 'Oila bilan', NULL),
  ('kunlik-oqish-44', 'Сочи', 'сочи', 'Sochi', NULL),
  ('kunlik-oqish-44', 'загорать', 'загорать', 'Quyoshda yonmoq', NULL),
  ('kunlik-oqish-44', 'купаться', 'купаться', 'Cho‘milmoq', NULL),
  ('kunlik-oqish-44', 'отдохнёшь', 'отдохнешь', 'Dam olasan (СВ)', NULL),
  ('kunlik-oqish-44', 'работать', 'работать', 'Ishlamoq', NULL),
  ('kunlik-oqish-44', 'проектом', 'проектом', 'Loyiha ustida', NULL),
  ('kunlik-oqish-44', 'надеюсь', 'надеюсь', 'Umid qilaman', NULL),
  ('kunlik-oqish-44', 'закончу', 'закончу', 'Tugataman (СВ)', NULL),
  ('kunlik-oqish-44', 'концу', 'концу', 'Oxirigacha', NULL),
  ('kunlik-oqish-44', 'лета', 'лета', 'Yozning', NULL),
  ('kunlik-oqish-44', 'Желаю', 'желаю', 'Tilayman', NULL),
  ('kunlik-oqish-44', 'удачи', 'удачи', 'Omad', NULL),
  ('kunlik-oqish-44', 'увидимся', 'увидимся', 'Ko‘rishamiz', NULL),
  ('kunlik-oqish-44', 'Спасибо', 'спасибо', 'Rahmat', NULL),
  ('kunlik-oqish-44', 'Пока', 'пока', 'Xayr', NULL),
  ('kunlik-oqish-44', 'следующее', 'следующее', 'Kelasi', NULL),
  ('kunlik-oqish-44', 'новый', 'новый', 'Yangi', NULL),
  ('kunlik-oqish-44', 'фильм', 'фильм', 'Film', NULL),
  ('kunlik-oqish-44', 'книгу', 'книгу', 'Kitobni', NULL),
  ('kunlik-oqish-44', 'каждый', 'каждый', 'Har', NULL),
  ('kunlik-oqish-44', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-44', 'будем', 'будем', 'Bo‘lamiz', NULL),
  ('kunlik-oqish-44', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-44', 'своим', 'своим', 'O‘zimning', NULL),
  ('kunlik-oqish-44', 'ей', 'ей', 'Unga', NULL),
  ('kunlik-oqish-44', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-44', 'А', 'а', 'Unda / va', NULL),
  ('kunlik-oqish-44', 'Что', 'что', 'Nima', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (44, 0, 'Siz bu hafta oxirida nima qilasiz?', 'Что вы будете делать в эти выходные?'),
  (44, 1, 'Men bu masalani ertaga hal qilaman, va’da beraman.', 'Я решу этот вопрос завтра, обещаю.'),
  (44, 2, 'U har kuni ertalab 20 daqiqa mashq qiladi.', 'Он будет делать зарядку 20 минут каждое утро.'),
  (44, 3, 'Ertaga soat 7 da uyg‘onishingizga ishonch hosil qiling.', 'Убедитесь, что вы проснётесь завтра в 7 часов.'),
  (44, 4, 'Siz bu yozda qayerda dam olasiz? – Men hali qaror qilmadim.', 'Где вы будете отдыхать этим летом? – Я ещё не решил.'),
  (44, 5, 'Ular o‘z loyihalarini qachon taqdim etishadi?', 'Когда они представят свои проекты?'),
  (44, 6, 'Yomg‘ir to‘xtagach, biz sayrga chiqamiz.', 'Когда дождь кончится, мы пойдём гулять.'),
  (44, 7, 'Sizningcha, u taklifimizni qabul qiladimi?', 'Как вы думаете, он примет наше предложение?'),
  (44, 8, 'Iltimos, menga bu kitobni tavsiya qiling. Men uni albatta o‘qib chiqaman.', 'Пожалуйста, порекомендуйте мне эту книгу. Я обязательно её прочитаю.'),
  (44, 9, 'Ushbu muvaffaqiyat kelajakda yanada kattaroq yutuqlarga olib keladi.', 'Этот успех приведёт к ещё большим достижениям в будущем.');
