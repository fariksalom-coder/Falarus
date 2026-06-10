-- Kunlik kun 55–56: у- (уйти/уехать), об-/пере- (обойти/перейти …).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 55 AND day_number <= 56;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 55 AND day_number <= 56
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 55 AND day_number <= 56;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 55 AND day_number <= 56;

DELETE FROM public.daily_vocab_words WHERE day_number >= 55 AND day_number <= 56;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 55 AND day_number <= 56;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 55 AND day_number <= 56;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 55 AND day_number <= 56;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 55 AND day_number <= 56;

-- ========== Kun 55 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  55,
  'Harakat: у- (уйти / уехать — qayerdan ketish)',
  $theory$
**У-** — bir joydan **chiqib ketish**, uzoqlashish (СВ); savol: *откуда?*

**Уйти** — piyoda: *уйду, ушёл…*

**Уехать** — transportda: *уеду, уехал…*

**Farq:** *прийти* — qayerga kelish; *уйти* — qayerdan ketish (*из дома*, *от вас*).

**Inkor:** *не уйду*, *не уехал*.

Transport uchun *улететь* ham uchraydi. Poyezd uchun odatta *уехал*, *поезд уехал*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (55, 'rule', 0, '«U uydan ketdi (piyoda, chiqib ketdi)»', 'Он ушёл из дома.', 'Он уехал из дома.', 'Он пришёл из дома.', 'Он пошёл из дома.', 0),
  (55, 'rule', 1, '«Siz qachon Moskvadan ketasiz (transportda)?»', 'Когда вы уйдёте из Москвы?', 'Когда вы уедете из Москвы?', 'Когда вы приедете в Москву?', 'Когда вы поедете в Москву?', 1),
  (55, 'rule', 2, '«U kecha kechqurun ketdi (transportda)»', 'Он ушёл вчера вечером.', 'Он уехал вчера вечером.', 'Он приехал вчера вечером.', 'Он поехал вчера вечером.', 1),
  (55, 'rule', 3, '«Men sizdan uzoq vaqtga ketaman (piyoda)»', 'Я уйду от вас надолго.', 'Я уеду от вас надолго.', 'Я приду к вам надолго.', 'Я пойду к вам надолго.', 0),
  (55, 'rule', 4, '«U kecha ishdan ketmadi»', 'Он не ушёл с работы вчера.', 'Он не уехал с работы вчера.', 'Он не пришёл на работу вчера.', 'Он не пошёл на работу вчера.', 0),
  (55, 'rule', 5, '«Ular Qrimdan qachon ketishdi?»', 'Когда они ушли из Крыма?', 'Когда они уехали из Крыма?', 'Когда они приехали в Крым?', 'Когда они поехали в Крым?', 1),
  (55, 'rule', 6, '«U (ayol) kecha kechki ovqatdan keyin ketdi»', 'Она ушла после ужина вчера.', 'Она ушёл после ужина вчера.', 'Она ушло после ужина вчера.', 'Она ушли после ужина вчера.', 0),
  (55, 'rule', 7, '«Kim sizdan yordam so‘rab keldi?»', 'Кто пришёл к вам за помощью?', 'Кто ушёл от вас за помощью?', 'Кто приехал к вам за помощью?', 'Кто пошёл к вам за помощью?', 0),
  (55, 'rule', 8, '«U kelasi hafta shahardan ketadi (transportda)»', 'Он уедет из города на следующей неделе.', 'Он уйдёт из города на следующей неделе.', 'Он приедет в город на следующей неделе.', 'Он поедет из города на следующей неделе.', 0),
  (55, 'rule', 9, '«Poezd qachon ketadi?»', 'Когда уйдет поезд?', 'Когда уедет поезд?', 'Когда приедет поезд?', 'Когда поедет поезд?', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (55, 0, 0, 'U (erkak) uydan ketdi.', 'Он ушёл из дома.'),
  (55, 0, 1, 'U (ayol) teatrdan ketdi.', 'Она ушла из театра.'),
  (55, 0, 2, 'U (ayol) Peterburgdan ketdi (transportda).', 'Она уехала из Петербурга.'),
  (55, 0, 3, 'Ular maktabdan ketishdi (piyoda).', 'Они ушли из школы.'),
  (55, 0, 4, 'Siz qachon ofisdan ketasiz?', 'Когда вы уйдёте из офиса?'),
  (55, 0, 5, 'Ular poyezdda ketishdi.', 'Они уехали на поезде.'),
  (55, 0, 6, 'Poyezd allaqachon ketdi.', 'Поезд уже уехал.'),
  (55, 0, 7, 'Samolyot ketdi.', 'Самолёт улетел.'),
  (55, 0, 8, 'Siz uchrashuvdan keyin qayerga ketdingiz?', 'Куда вы ушли после встречи?'),
  (55, 0, 9, 'Ular kecha kechqurun ketishdi (transportda).', 'Они уехали вчера вечером.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (55, 0, 'uz', '(он, уже, уйти, из, дом)', ARRAY['Он', 'уже', 'ушёл', 'из', 'дома.', 'пришёл'], 'Он уже ушёл из дома.'),
  (55, 1, 'uz', '(когда, ты, уехать, из, командировка)', ARRAY['Когда', 'ты', 'уехал', 'из', 'командировки?', 'ушёл'], 'Когда ты уехал из командировки?'),
  (55, 2, 'uz', '(мы, завтра, уйти, с, работы, рано)', ARRAY['Мы', 'завтра', 'уйдём', 'с', 'работы', 'рано.', 'уйдем'], 'Мы завтра уйдём с работы рано.'),
  (55, 3, 'uz', '(поезд, уехать, с, вокзал, 5, минут, назад)', ARRAY['Поезд', 'уехал', 'с', 'вокзала', '5', 'минут', 'назад.', 'ушёл'], 'Поезд уехал с вокзала 5 минут назад.'),
  (55, 4, 'uz', '(она, не, уйти, с, урок, потому, что, болела)', ARRAY['Она', 'не', 'ушла', 'с', 'урока,', 'потому', 'что', 'болела.', 'ушёл'], 'Она не ушла с урока, потому что болела.'),
  (55, 5, 'uz', '(вы, откуда, уехать, в, прошлом, году)', ARRAY['Откуда', 'вы', 'уехали', 'в', 'прошлом', 'году?', 'ушли'], 'Откуда вы уехали в прошлом году?'),
  (55, 6, 'uz', '(я, уйти, от, тебя, в, 6, часов)', ARRAY['Я', 'уйду', 'от', 'тебя', 'в', '6', 'часов.', 'уеду'], 'Я уйду от тебя в 6 часов.'),
  (55, 7, 'uz', '(дети, уехать, на, каникулы, к, бабушке)', ARRAY['Дети', 'уехали', 'на', 'каникулы', 'к', 'бабушке.', 'ушли'], 'Дети уехали на каникулы к бабушке.'),
  (55, 8, 'uz', '(гости, уже, уйти, когда, ты, пришёл)', ARRAY['Гости', 'уже', 'ушли,', 'когда', 'ты', 'пришёл.', 'ушёл'], 'Гости уже ушли, когда ты пришёл.'),
  (55, 9, 'uz', '(когда, ты, уехать, позвони, мне)', ARRAY['Когда', 'уедешь,', 'позвони', 'мне.', 'уйдёшь'], 'Когда уедешь, позвони мне.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (55, 0, 'Ketmoq (chiqib ketmoq — piyoda)', 'Уйти'),
  (55, 1, 'Ketmoq (jo‘nab ketmoq — transportda)', 'Уехать'),
  (55, 2, 'Doimiy', 'Постоянный'),
  (55, 3, 'Yashash joyi', 'Место жительства'),
  (55, 4, 'Kuzatmoq (yo‘lga)', 'Провожать'),
  (55, 5, 'Vokzal binosi', 'Здание вокзала'),
  (55, 6, 'Kassa', 'Касса'),
  (55, 7, 'Orqasidan qaramoq', 'Смотреть вслед'),
  (55, 8, 'Perron', 'Перрон'),
  (55, 9, 'Yetib kelmoq', 'Приехать'),
  (55, 10, 'Joylashmoq (turar joy)', 'Устроиться'),
  (55, 11, 'Talabalar turar joyi', 'Общежитие'),
  (55, 12, 'Xursand bo‘lmoq (kim uchun)', 'Радоваться за кого-то'),
  (55, 13, 'G‘amginlik', 'Грусть'),
  (55, 14, 'Sog‘inmoq', 'Скучать');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  55,
  'Отъезд друга',
  $body$
Вчера мой лучший друг Антон уехал из нашего города в Москву на постоянное место жительства: он давно мечтал об этом и наконец всё устроил.

Утром я пришёл к нему на вокзал провожать. Когда я вошёл в здание вокзала, он стоял у кассы с небольшим рюкзаком и чемоданом — немного нервничал, но улыбался.

Мы обнялись и немного поговорили о дороге и новой квартире. Потом он сказал:
– Мне пора. Я ухожу. Не скучай.

Он взял свой чемодан, помахал мне рукой и пошёл к поезду. Я смотрел ему вслед, пока поезд не уехал с перрона — всё время чувствовалось, как быстро летят минуты прощания.

Вечером он позвонил мне и сказал, что уже приехал в Москву и устроился в общежитие недалеко от университета. Я очень рад за него, но всё равно чувствую лёгкую грусть: без него дома станет тише.

Мы обязательно увидимся снова — Антон пообещал приехать на Новый год, а я пообещал навестить его летом.
$body$,
  'kunlik-oqish-55'
);

-- ========== Kun 56 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  56,
  'Harakat: об- / пере- (обойти · перейти …)',
  $theory$
**Обойти / объехать** — **atrofdan aylanib o‘tish** (*что? кого?*): *Я обошёл лужу.* · *Мы объехали пробку.*

**Перейти / переехать** — **kesib o‘tish** (*через что?*) yoki boshqa joyga **ko‘chib o‘tish**: *перешёл дорогу* · *переехали в новый город.*

**O‘tgan zamon:** *обошёл*, *перешёл*, *переехали* va h.k.

**Tez-tez xato:** tirbandlik uchun mashinada *объехать*, piyoda *обойти*; yo‘lni piyoda *перейти*, transportda ko‘pincha *переехать*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (56, 'rule', 0, '«U ko‘lmakni aylanib o‘tdi (piyoda)»', 'Он обошёл лужу.', 'Он объехал лужу.', 'Он перешёл лужу.', 'Он переехал лужу.', 0),
  (56, 'rule', 1, '«Biz tirbandlikni aylanib o‘tdik (transportda)»', 'Мы обошли пробку.', 'Мы объехали пробку.', 'Мы перешли пробку.', 'Мы переехали пробку.', 1),
  (56, 'rule', 2, '«U yo‘lni kesib o‘tdi (piyoda)»', 'Он перешёл дорогу.', 'Он переехал дорогу.', 'Он обошёл дорогу.', 'Он объехал дорогу.', 0),
  (56, 'rule', 3, '«Ular yangi uyga ko‘chib o‘tishdi»', 'Они перешли в новую квартиру.', 'Они переехали в новую квартиру.', 'Они обошли новую квартиру.', 'Они объехали новую квартиру.', 1),
  (56, 'rule', 4, '«Biz to‘siqni aylanib o‘tdik (transportda)»', 'Мы объехали препятствие.', 'Мы обошли препятствие.', 'Мы переехали препятствие.', 'Мы перешли препятствие.', 0),
  (56, 'rule', 5, '«Siz qachon yangi ofisga ko‘chib o‘tasiz?»', 'Когда вы перейдёте в новый офис?', 'Когда вы переедете в новый офис?', 'Когда вы обойдёте новый офис?', 'Когда вы поедете в новый офис?', 1),
  (56, 'rule', 6, '«U (ayol) daryoni kesib o‘tdi (transportda)»', 'Она перешла реку.', 'Она переехала реку.', 'Она обошла реку.', 'Она объехала реку.', 1),
  (56, 'rule', 7, '«Kechirasiz, siz menga yo‘l bermadingiz»', 'Извините, вы меня объехали.', 'Извините, вы меня обошли.', 'Извините, вы меня перешли.', 'Извините, вы меня переехали.', 1),
  (56, 'rule', 8, '«U hamma to‘siqlarni yengib o‘tdi (ko‘chma ma’no, piyoda)»', 'Он обошёл все препятствия.', 'Он объехал все препятствия.', 'Он перешёл все препятствия.', 'Он переехал все препятствия.', 0),
  (56, 'rule', 9, '«Piyodalar yo‘lni qayerdan kesib o‘tadi?»', 'Где пешеходы переходят дорогу?', 'Где пешеходы переезжают дорогу?', 'Где пешеходы обходят дорогу?', 'Где пешеходы объезжают дорогу?', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (56, 0, 0, 'U ko‘lmakni aylanib o‘tdi (piyoda).', 'Он обошёл лужу.'),
  (56, 0, 1, 'Biz shahar markazini aylanib o‘tdik (transportda).', 'Мы объехали центр города.'),
  (56, 0, 2, 'U (ayol) ko‘prikdan o‘tdi (piyoda).', 'Она перешла через мост.'),
  (56, 0, 3, 'Ular temir yo‘lni kesib o‘tishdi (transportda).', 'Они переехали железную дорогу.'),
  (56, 0, 4, 'Men yangi kvartiraga ko‘chib o‘tdim.', 'Я переехал в новую квартиру.'),
  (56, 0, 5, 'U mashina bilan chuqurni aylanib o‘tdi.', 'Он объехал яму на дороге.'),
  (56, 0, 6, 'Biz chegarani kesib o‘tdik.', 'Мы переехали через границу.'),
  (56, 0, 7, 'U (ayol) svetoforning yashil chirog‘ida yo‘lni kesib o‘tdi.', 'Она перешла дорогу на зелёный свет.'),
  (56, 0, 8, 'Ular temir yo‘lni kesib o‘tishdi (piyoda).', 'Они перешли железную дорогу.'),
  (56, 0, 9, 'Svetofor yonib turibdi. Yo‘lni qanday kesib o‘taman?', 'Как мне перейти дорогу?');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (56, 0, 'uz', '(я, обойти, лужа, и, пойти, дальше)', ARRAY['Я', 'обошёл', 'лужу', 'и', 'пошёл', 'дальше.', 'перешёл'], 'Я обошёл лужу и пошёл дальше.'),
  (56, 1, 'uz', '(мы, объехать, пробка, на, машина)', ARRAY['Мы', 'объехали', 'пробку', 'на', 'машине.', 'обошли'], 'Мы объехали пробку на машине.'),
  (56, 2, 'uz', '(она, перейти, улица, на, зелёный, свет)', ARRAY['Она', 'перешла', 'улицу', 'на', 'зелёный', 'свет.', 'переехала'], 'Она перешла улицу на зелёный свет.'),
  (56, 3, 'uz', '(они, переехать, через, мост, и, остановиться)', ARRAY['Они', 'переехали', 'через', 'мост', 'и', 'остановились.', 'перешли'], 'Они переехали через мост и остановились.'),
  (56, 4, 'uz', '(ты, когда, переехать, в, новый, дом)', ARRAY['Когда', 'ты', 'переехал', 'в', 'новый', 'дом?', 'перешёл'], 'Когда ты переехал в новый дом?'),
  (56, 5, 'uz', '(я, не, мочь, обойти, этот, камень)', ARRAY['Я', 'не', 'могу', 'обойти', 'этот', 'камень.', 'перейти'], 'Я не могу обойти этот камень.'),
  (56, 6, 'uz', '(водитель, объехать, яма, и, продолжить, путь)', ARRAY['Водитель', 'объехал', 'яму', 'и', 'продолжил', 'путь.', 'обошёл'], 'Водитель объехал яму и продолжил путь.'),
  (56, 7, 'uz', '(дети, перейти, дорога, в, неположенном, месте)', ARRAY['Дети', 'перешли', 'дорогу', 'в', 'неположенном', 'месте.', 'переехали'], 'Дети перешли дорогу в неположенном месте.'),
  (56, 8, 'uz', '(мы, переехать, в, другой, город, в, прошлом, году)', ARRAY['Мы', 'переехали', 'в', 'другой', 'город', 'в', 'прошлом', 'году.', 'перешли'], 'Мы переехали в другой город в прошлом году.'),
  (56, 9, 'uz', '(как, перейти, через, эта, площадь)', ARRAY['Как', 'перейти', 'через', 'эту', 'площадь?', 'переехать'], 'Как перейти через эту площадь?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (56, 0, 'Aylanib o‘tmoq (piyoda)', 'Обойти'),
  (56, 1, 'Aylanib o‘tmoq (transportda)', 'Объехать'),
  (56, 2, 'Kesib o‘tmoq (piyoda)', 'Перейти'),
  (56, 3, 'Kesib o‘tmoq (transportda); ko‘chib o‘tmoq', 'Переехать'),
  (56, 4, 'Ko‘lmak', 'Лужа'),
  (56, 5, 'Tirbandlik', 'Пробка'),
  (56, 6, 'To‘siq', 'Препятствие'),
  (56, 7, 'Chuqur (yo‘lda)', 'Яма'),
  (56, 8, 'Piyodalar o‘tish joyi', 'Пешеходный переход'),
  (56, 9, 'Svetofor', 'Светофор'),
  (56, 10, 'Yashil chiroq', 'Зелёный свет'),
  (56, 11, 'Ko‘chib o‘tmoq', 'Переезжать'),
  (56, 12, 'Chegara', 'Граница'),
  (56, 13, 'Daryoning narigi tomoni', 'Другой берег реки'),
  (56, 14, 'Piyodalar yo‘lagi', 'Тротуар');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  56,
  'Дорога домой',
  $body$
Вчера я возвращался домой с работы по привычному маршруту. Обычно я хожу через парк, но вчера парк был закрыт на ремонт — пришлось обойти его по длинной улице вдоль школы и аптеки.

Когда я подошёл к перекрёстку, я увидел большую лужу прямо на дороге. Я решил обойти её по тротуару и только потом перейти оживлённую улицу.

Я дождался зелёного света и быстро перешёл дорогу: машины шумели, но переход был безопасным. На следующей улице я увидел своего соседа в машине — он сигналил мне и показывал на яму впереди.

Я понял предупреждение и обошёл яму слева, чтобы не промочить обувь и не споткнуться.

Наконец я дошёл до дома и с удивлением узнал новость: мои родители уже переехали на новую дачу за городом и оставили записку на двери.

Я немного расстроился, позвонил им по телефону и выслушал весёлый рассказ о переезде. Вечером мы долго болтали, а я решил завтра навестить их уже на новом месте — дорога домой оказалась неожиданной, но интересной.
$body$,
  'kunlik-oqish-56'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-55', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-55', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-55', 'без', 'без', '…siz', NULL),
  ('kunlik-oqish-55', 'быстро', 'быстро', 'Tez', NULL),
  ('kunlik-oqish-55', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-55', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-55', 'взял', 'взял', 'Oldi', NULL),
  ('kunlik-oqish-55', 'вокзал', 'вокзал', 'Vokzal', NULL),
  ('kunlik-oqish-55', 'вокзала', 'вокзала', 'Vokzalning', NULL),
  ('kunlik-oqish-55', 'вошёл', 'вошел', 'Kirdi (СВ)', NULL),
  ('kunlik-oqish-55', 'время', 'время', 'Vaqt', NULL),
  ('kunlik-oqish-55', 'всё', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-55', 'вслед', 'вслед', 'Orqasidan', NULL),
  ('kunlik-oqish-55', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-55', 'год', 'год', 'Yil', NULL),
  ('kunlik-oqish-55', 'города', 'города', 'Shahar (род)', NULL),
  ('kunlik-oqish-55', 'грусть', 'грусть', 'G‘amginlik', NULL),
  ('kunlik-oqish-55', 'давно', 'давно', 'Uzoq vaqtdan beri', NULL),
  ('kunlik-oqish-55', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-55', 'дороге', 'дороге', 'yo‘lda', NULL),
  ('kunlik-oqish-55', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-55', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-55', 'ему', 'ему', 'Unga', NULL),
  ('kunlik-oqish-55', 'жительства', 'жительства', 'Yashash (joy)', NULL),
  ('kunlik-oqish-55', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-55', 'здание', 'здание', 'Bino', NULL),
  ('kunlik-oqish-55', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-55', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-55', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-55', 'как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-55', 'кассы', 'кассы', 'Kassa', NULL),
  ('kunlik-oqish-55', 'квартире', 'квартире', 'Kvartirada', NULL),
  ('kunlik-oqish-55', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-55', 'лёгкую', 'легкую', 'Yengil', NULL),
  ('kunlik-oqish-55', 'летом', 'летом', 'Yozda', NULL),
  ('kunlik-oqish-55', 'летят', 'летят', 'Uchadi', NULL),
  ('kunlik-oqish-55', 'лучший', 'лучший', 'Eng yaxshi', NULL),
  ('kunlik-oqish-55', 'место', 'место', 'joy', NULL),
  ('kunlik-oqish-55', 'мечтал', 'мечтал', 'Orzu qilgan edim', NULL),
  ('kunlik-oqish-55', 'минуты', 'минуты', 'Daqiqalar', NULL),
  ('kunlik-oqish-55', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-55', 'мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-55', 'Москву', 'москву', 'Moskvaga', NULL),
  ('kunlik-oqish-55', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-55', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-55', 'навестить', 'навестить', 'Tashrif buyurmoq', NULL),
  ('kunlik-oqish-55', 'наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-55', 'нашего', 'нашего', 'Bizning (род)', NULL),
  ('kunlik-oqish-55', 'Не', 'не', 'Emas', NULL),
  ('kunlik-oqish-55', 'небольшим', 'небольшим', 'Kichik (bilan)', NULL),
  ('kunlik-oqish-55', 'него', 'него', 'U (род)', NULL),
  ('kunlik-oqish-55', 'недалеко', 'недалеко', 'Uzoq emas', NULL),
  ('kunlik-oqish-55', 'немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-55', 'нему', 'нему', 'Unga', NULL),
  ('kunlik-oqish-55', 'нервничал', 'нервничал', 'Asabiylashardi', NULL),
  ('kunlik-oqish-55', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-55', 'новой', 'новой', 'yangi', NULL),
  ('kunlik-oqish-55', 'Новый', 'новый', 'Yangi', NULL),
  ('kunlik-oqish-55', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-55', 'об', 'об', '…haqida', NULL),
  ('kunlik-oqish-55', 'обнялись', 'обнялись', 'Quchoqlashdik', NULL),
  ('kunlik-oqish-55', 'общежитие', 'общежитие', 'Talabalar turar joyi', NULL),
  ('kunlik-oqish-55', 'обязательно', 'обязательно', 'Albatta', NULL),
  ('kunlik-oqish-55', 'он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-55', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-55', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-55', 'перрона', 'перрона', 'Perrondan', NULL),
  ('kunlik-oqish-55', 'поговорили', 'поговорили', 'Gaplashdik', NULL),
  ('kunlik-oqish-55', 'поезд', 'поезд', 'Poyezd', NULL),
  ('kunlik-oqish-55', 'поезду', 'поезду', 'Poyezdga', NULL),
  ('kunlik-oqish-55', 'позвонил', 'позвонил', 'qo‘ng‘iroq qildi', NULL),
  ('kunlik-oqish-55', 'пока', 'пока', 'Maguncha', NULL),
  ('kunlik-oqish-55', 'помахал', 'помахал', 'Qo‘l siltadi', NULL),
  ('kunlik-oqish-55', 'пообещал', 'пообещал', 'Va’da berdi', NULL),
  ('kunlik-oqish-55', 'пора', 'пора', 'Vaqt keldi', NULL),
  ('kunlik-oqish-55', 'постоянное', 'постоянное', 'Doimiy', NULL),
  ('kunlik-oqish-55', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-55', 'пошёл', 'пошел', 'Ketdi (boshlanish, СВ)', NULL),
  ('kunlik-oqish-55', 'приехал', 'приехал', 'Yetib keldi', NULL),
  ('kunlik-oqish-55', 'приехать', 'приехать', 'Yetib kelmoq (transport, СВ)', NULL),
  ('kunlik-oqish-55', 'пришёл', 'пришел', 'Keldi', NULL),
  ('kunlik-oqish-55', 'провожать', 'провожать', 'Kuzatmoq', NULL),
  ('kunlik-oqish-55', 'прощания', 'прощания', 'Xayrlashuv', NULL),
  ('kunlik-oqish-55', 'равно', 'равно', 'Baribir', NULL),
  ('kunlik-oqish-55', 'рад', 'рад', 'Xursand', NULL),
  ('kunlik-oqish-55', 'рукой', 'рукой', 'Qo‘l bilan', NULL),
  ('kunlik-oqish-55', 'рюкзаком', 'рюкзаком', 'Ryukzak bilan', NULL),
  ('kunlik-oqish-55', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-55', 'свой', 'свой', 'O‘zing', NULL),
  ('kunlik-oqish-55', 'сказал', 'сказал', 'Dedi', NULL),
  ('kunlik-oqish-55', 'скучай', 'скучай', 'Sog‘inma', NULL),
  ('kunlik-oqish-55', 'смотрел', 'смотрел', 'qarardi', NULL),
  ('kunlik-oqish-55', 'снова', 'снова', 'yana', NULL),
  ('kunlik-oqish-55', 'станет', 'станет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-55', 'стоял', 'стоял', 'Turardi', NULL),
  ('kunlik-oqish-55', 'тише', 'тише', 'Jimroq', NULL),
  ('kunlik-oqish-55', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-55', 'увидимся', 'увидимся', 'Ko‘rishamiz', NULL),
  ('kunlik-oqish-55', 'уехал', 'уехал', 'Ketdi (transport, СВ)', NULL),
  ('kunlik-oqish-55', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-55', 'улыбался', 'улыбался', 'Kulardi', NULL),
  ('kunlik-oqish-55', 'университета', 'университета', 'Universitetdan', NULL),
  ('kunlik-oqish-55', 'устроил', 'устроил', 'Hal qildi', NULL),
  ('kunlik-oqish-55', 'устроился', 'устроился', 'Joylashdi', NULL),
  ('kunlik-oqish-55', 'Утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-55', 'ухожу', 'ухожу', 'Ketyapman', NULL),
  ('kunlik-oqish-55', 'чемодан', 'чемодан', 'Chamadon', NULL),
  ('kunlik-oqish-55', 'чемоданом', 'чемоданом', 'Chamadon bilan', NULL),
  ('kunlik-oqish-55', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-55', 'чувствовалось', 'чувствовалось', 'His qilinardi', NULL),
  ('kunlik-oqish-55', 'чувствую', 'чувствую', 'his qilaman', NULL),
  ('kunlik-oqish-55', 'этом', 'этом', 'Bu (joyda)', NULL),
  ('kunlik-oqish-55', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-56', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-56', 'аптеки', 'аптеки', 'Apteka', NULL),
  ('kunlik-oqish-56', 'безопасным', 'безопасным', 'Xavfsiz', NULL),
  ('kunlik-oqish-56', 'болтали', 'болтали', 'Gaplashdik', NULL),
  ('kunlik-oqish-56', 'большую', 'большую', 'Katta', NULL),
  ('kunlik-oqish-56', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-56', 'быстро', 'быстро', 'Tez', NULL),
  ('kunlik-oqish-56', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-56', 'вдоль', 'вдоль', 'Bo‘ylab', NULL),
  ('kunlik-oqish-56', 'весёлый', 'веселый', 'Shod', NULL),
  ('kunlik-oqish-56', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-56', 'возвращался', 'возвращался', 'Qaytayotgan edim', NULL),
  ('kunlik-oqish-56', 'впереди', 'впереди', 'Oldinda', NULL),
  ('kunlik-oqish-56', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-56', 'выслушал', 'выслушал', 'Tingladi', NULL),
  ('kunlik-oqish-56', 'городом', 'городом', 'Shahar tashqarisida', NULL),
  ('kunlik-oqish-56', 'дачу', 'дачу', 'Dachaga', NULL),
  ('kunlik-oqish-56', 'двери', 'двери', 'Eshik', NULL),
  ('kunlik-oqish-56', 'длинной', 'длинной', 'Uzun', NULL),
  ('kunlik-oqish-56', 'до', 'до', '…gacha', NULL),
  ('kunlik-oqish-56', 'дождался', 'дождался', 'Kutdim', NULL),
  ('kunlik-oqish-56', 'долго', 'долго', 'Uzoq', NULL),
  ('kunlik-oqish-56', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-56', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-56', 'дорога', 'дорога', 'Yo‘l', NULL),
  ('kunlik-oqish-56', 'дороге', 'дороге', 'yo‘lda', NULL),
  ('kunlik-oqish-56', 'дорогу', 'дорогу', 'Yo‘lga', NULL),
  ('kunlik-oqish-56', 'дошёл', 'дошел', 'Yetib keldi', NULL),
  ('kunlik-oqish-56', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-56', 'её', 'ее', 'Uni', NULL),
  ('kunlik-oqish-56', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-56', 'завтра', 'завтра', 'Ertaga', NULL),
  ('kunlik-oqish-56', 'закрыт', 'закрыт', 'Yopiq', NULL),
  ('kunlik-oqish-56', 'записку', 'записку', 'Eslatma yozuvi', NULL),
  ('kunlik-oqish-56', 'зелёного', 'зеленого', 'Yashil', NULL),
  ('kunlik-oqish-56', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-56', 'им', 'им', 'ularga', NULL),
  ('kunlik-oqish-56', 'интересной', 'интересной', 'qiziqarli', NULL),
  ('kunlik-oqish-56', 'их', 'их', 'Ularga', NULL),
  ('kunlik-oqish-56', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-56', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-56', 'лужу', 'лужу', 'Ko‘lmakni', NULL),
  ('kunlik-oqish-56', 'маршруту', 'маршруту', 'Marshrut', NULL),
  ('kunlik-oqish-56', 'машине', 'машине', 'Mashinada', NULL),
  ('kunlik-oqish-56', 'машины', 'машины', 'Mashinalar', NULL),
  ('kunlik-oqish-56', 'месте', 'месте', 'Joyda', NULL),
  ('kunlik-oqish-56', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-56', 'мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-56', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-56', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-56', 'навестить', 'навестить', 'Tashrif buyurmoq', NULL),
  ('kunlik-oqish-56', 'Наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-56', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-56', 'немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-56', 'неожиданной', 'неожиданной', 'Kutilmagan', NULL),
  ('kunlik-oqish-56', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-56', 'новом', 'новом', 'Yangi (предл.)', NULL),
  ('kunlik-oqish-56', 'новость', 'новость', 'Yangilik', NULL),
  ('kunlik-oqish-56', 'новую', 'новую', 'yangi', NULL),
  ('kunlik-oqish-56', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-56', 'обойти', 'обойти', 'Aylanib o‘tmoq', NULL),
  ('kunlik-oqish-56', 'обошёл', 'обошел', 'Aylanib o‘tdi (СВ)', NULL),
  ('kunlik-oqish-56', 'обувь', 'обувь', 'Oyoq kiyimi', NULL),
  ('kunlik-oqish-56', 'Обычно', 'обычно', 'Odatda', NULL),
  ('kunlik-oqish-56', 'оживлённую', 'оживленную', 'Tirband', NULL),
  ('kunlik-oqish-56', 'оказалась', 'оказалась', 'Bo‘ldi', NULL),
  ('kunlik-oqish-56', 'он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-56', 'оставили', 'оставили', 'Qoldirishdi', NULL),
  ('kunlik-oqish-56', 'парк', 'парк', 'Park', NULL),
  ('kunlik-oqish-56', 'переезде', 'переезде', 'Ko‘chish haqida', NULL),
  ('kunlik-oqish-56', 'переехали', 'переехали', 'Ko‘chib o‘tdilar; kesib o‘tishdi', NULL),
  ('kunlik-oqish-56', 'перейти', 'перейти', 'Kesib o‘tmoq', NULL),
  ('kunlik-oqish-56', 'перекрёстку', 'перекрестку', 'Chorrahaga', NULL),
  ('kunlik-oqish-56', 'переход', 'переход', 'Piyodalar o‘tish joyi', NULL),
  ('kunlik-oqish-56', 'перешёл', 'перешел', 'Kesib o‘tdi (СВ)', NULL),
  ('kunlik-oqish-56', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-56', 'подошёл', 'подошел', 'Yaqinlashdim', NULL),
  ('kunlik-oqish-56', 'позвонил', 'позвонил', 'qo‘ng‘iroq qildi', NULL),
  ('kunlik-oqish-56', 'показывал', 'показывал', 'Ko‘rsatardi', NULL),
  ('kunlik-oqish-56', 'понял', 'понял', 'Tushundim', NULL),
  ('kunlik-oqish-56', 'потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-56', 'предупреждение', 'предупреждение', 'Ogohlantirish', NULL),
  ('kunlik-oqish-56', 'привычному', 'привычному', 'Odatiy', NULL),
  ('kunlik-oqish-56', 'пришлось', 'пришлось', 'To‘g‘ri keldi', NULL),
  ('kunlik-oqish-56', 'промочить', 'промочить', 'Ho‘llamoq', NULL),
  ('kunlik-oqish-56', 'прямо', 'прямо', 'To‘g‘ridan-to‘g‘ri', NULL),
  ('kunlik-oqish-56', 'работы', 'работы', 'Ishdan keyin', NULL),
  ('kunlik-oqish-56', 'рассказ', 'рассказ', 'Hikoya', NULL),
  ('kunlik-oqish-56', 'расстроился', 'расстроился', 'Xafa bo‘ldi', NULL),
  ('kunlik-oqish-56', 'ремонт', 'ремонт', 'Ta’mirlash', NULL),
  ('kunlik-oqish-56', 'решил', 'решил', 'Qaror qildi', NULL),
  ('kunlik-oqish-56', 'родители', 'родители', 'Ota-ona', NULL),
  ('kunlik-oqish-56', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-56', 'света', 'света', 'Chiroq', NULL),
  ('kunlik-oqish-56', 'своего', 'своего', 'o‘zining', NULL),
  ('kunlik-oqish-56', 'сигналил', 'сигналил', 'Signal berardi', NULL),
  ('kunlik-oqish-56', 'слева', 'слева', 'Chapdan', NULL),
  ('kunlik-oqish-56', 'следующей', 'следующей', 'Keyingi', NULL),
  ('kunlik-oqish-56', 'соседа', 'соседа', 'Qo‘shni', NULL),
  ('kunlik-oqish-56', 'споткнуться', 'споткнуться', 'Toyilib ketmoq', NULL),
  ('kunlik-oqish-56', 'телефону', 'телефону', 'Telefon', NULL),
  ('kunlik-oqish-56', 'только', 'только', 'Faqat', NULL),
  ('kunlik-oqish-56', 'тротуару', 'тротуару', 'Piyodalar yo‘lagiga', NULL),
  ('kunlik-oqish-56', 'увидел', 'увидел', 'ko‘rdi', NULL),
  ('kunlik-oqish-56', 'удивлением', 'удивлением', 'Hayrat bilan', NULL),
  ('kunlik-oqish-56', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-56', 'узнал', 'узнал', 'Bildi', NULL),
  ('kunlik-oqish-56', 'улице', 'улице', 'ko‘chada', NULL),
  ('kunlik-oqish-56', 'улицу', 'улицу', 'Ko‘chani', NULL),
  ('kunlik-oqish-56', 'хожу', 'хожу', 'Boraman (muntazam)', NULL),
  ('kunlik-oqish-56', 'через', 'через', 'Orqali', NULL),
  ('kunlik-oqish-56', 'чтобы', 'чтобы', 'Shunda ki', NULL),
  ('kunlik-oqish-56', 'школы', 'школы', 'Maktab', NULL),
  ('kunlik-oqish-56', 'шумели', 'шумели', 'Shovqin qilardi', NULL),
  ('kunlik-oqish-56', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-56', 'яму', 'яму', 'Chuqurni', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (55, 0, 'Sizning do‘stingiz qachon ketdi?', 'Когда уехал ваш друг?'),
  (55, 1, 'U kecha kechqurun poyezdda ketdi.', 'Он уехал вчера вечером на поезде.'),
  (55, 2, 'Siz uni vokzalda kuzatib qo‘ydingizmi?', 'Вы проводили его на вокзале?'),
  (55, 3, 'U soat nechada uydan chiqib ketdi?', 'Во сколько он ушёл из дома?'),
  (55, 4, 'Nega uchrashuvdan oldin ketib qoldingiz?', 'Почему вы ушли до встречи?'),
  (55, 5, 'U samolyotda ketdi, chunki tezroq yetib borish kerak edi.', 'Он улетел на самолёте, потому что нужно было быстрее добраться.'),
  (55, 6, 'Poyezd allaqachon ketganmi? – Ha, 5 daqiqa oldin.', 'Поезд уже уехал? – Да, 5 минут назад.'),
  (55, 7, 'Siz qachon ofisdan ketasiz? – Bir soatdan keyin.', 'Когда вы уйдёте из офиса? – Через час.'),
  (55, 8, 'U hech qachon bu shahardan ketmasligini aytdi.', 'Он сказал, что никогда не уедет из этого города.'),
  (55, 9, 'Kechirasiz, men sizdan uzoq vaqtga ketishim kerak.', 'Извините, я должен уйти от вас надолго.'),
  (56, 0, 'Ko‘lmakni aylanib o‘tish uchun siz chap tomonga burilishingiz kerak.', 'Чтобы обойти лужу, вам нужно повернуть налево.'),
  (56, 1, 'Haydovchi tirbandlikni aylanib o‘tdi va tezroq yetib keldi.', 'Водитель объехал пробку и приехал быстрее.'),
  (56, 2, 'Qayerda yo‘lni kesib o‘tish mumkin? – Svetofor yonida.', 'Где можно перейти дорогу? – У светофора.'),
  (56, 3, 'Siz qachon yangi kvartiraga ko‘chib o‘tdingiz?', 'Когда вы переехали в новую квартиру?'),
  (56, 4, 'U mashinasini yangi garajga qo‘yish uchun hovlini aylanib o‘tishi kerak.', 'Ему нужно объехать двор, чтобы поставить машину в новый гараж.'),
  (56, 5, 'Bolalar, piyodalar o‘tish joyidan yo‘lni kesib o‘ting.', 'Дети, переходите дорогу по пешеходному переходу.'),
  (56, 6, 'Bu toshni aylanib o‘tib bo‘lmaydi, juda katta.', 'Этот камень нельзя обойти, он очень большой.'),
  (56, 7, 'Ular chegarani kesib o‘tgach, hujjatlarni tekshirishdi.', 'Когда они переехали границу, проверили документы.'),
  (56, 8, 'Siz metro orqali daryoning narigi tomoniga qanday o‘tasiz?', 'Как вы перейдёте на другой берег реки через метро?'),
  (56, 9, 'U butun shaharni aylanib chiqdi, lekin kerakli uyni topmadi.', 'Он объехал весь город, но не нашёл нужный дом.');

