-- Kunlik kun 16–20: 1-spryazheniye (hozirgi zamon), takrorlash va dialoglar.

-- ========== Kun 16 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 16;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 16
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 16;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 16;

DELETE FROM public.daily_vocab_words WHERE day_number = 16;

DELETE FROM public.daily_grammar_matches WHERE day_number = 16;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 16;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 16;
DELETE FROM public.daily_grammar_topics WHERE day_number = 16;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  16,
  '1-spryazheniye: читать, делать, работать',
  $theory$
1-spryazheniye: ko‘pchilik fe’llar -ать, -ять, -еть, -овать, -нуть (istisnolar bilan).

Hozirgi zamon: я -ю/-у, ты -ешь, он/она -ет, мы -ем, вы -ете, они -ют/-ут.

-овать: рисовать → я рисую; танцевать → я танцую.

Писать, искать: 1-shaxsda urg‘u oxirida, qolganlarda o‘zakda (я пишу, ты пишешь).

Misol fe’llar: читать, писать, работать, делать, отдыхать, гулять, слушать, думать, понимать…
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (16, 'rule', 0, '«Men o‘qiyman» rus tilida?', 'Я читаешь', 'Я читаю', 'Я читает', 'Я читаем', 1),
  (16, 'rule', 1, '«U (erkak) ishlaydi»?', 'Ты работаешь', 'Он работает', 'Она работает', 'Мы работаем', 1),
  (16, 'rule', 2, '1-shaxs (я) «делать»?', 'я делаешь', 'я делаю', 'я делаем', 'я делают', 1),
  (16, 'rule', 3, '«Sen yozasan»?', 'Ты пишешь', 'Ты пишу', 'Ты пишет', 'Ты пишут', 0),
  (16, 'rule', 4, '«Biz birga ishlaymiz»', 'Мы работаем вместе.', 'Мы работает вместе.', 'Мы работаешь вместе.', 'Мы работают вместе.', 0),
  (16, 'rule', 5, '«Они отдыхают» — bu kim?', 'U ayol dam oladi', 'Ular dam olishadi', 'Sen dam olasan', 'Biz dam olamiz', 1),
  (16, 'rule', 6, '«Писать» shakllari (urg‘u)', 'Faqat я xato', 'Faqat ты xato', 'Faqat они xato', 'Barcha shakllar to‘g‘ri', 3),
  (16, 'rule', 7, 'Qaysi fe’l 1-spryazheniye?', 'учить', 'любить', 'читать', 'говорить', 2),
  (16, 'rule', 8, '«Siz qayerda ishlaysiz?»', 'Где вы работаете?', 'Где ты работаешь?', 'Где вы работаешь?', 'Где ты работаете?', 0),
  (16, 'rule', 9, '«Ular o‘qiydilar»?', 'они читает', 'они читаешь', 'они читают', 'они читаем', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (16, 0, 0, 'Я (работать)', 'я работаю'),
  (16, 0, 1, 'Ты (читать)', 'ты читаешь'),
  (16, 0, 2, 'Он (делать)', 'он делает'),
  (16, 0, 3, 'Мы (рисовать)', 'мы рисуем'),
  (16, 0, 4, 'Вы (отдыхать)', 'вы отдыхаете'),
  (16, 0, 5, 'Они (слушать)', 'они слушают'),
  (16, 0, 6, 'Я (гулять)', 'я гуляю'),
  (16, 0, 7, 'Ты (писать)', 'ты пишешь'),
  (16, 0, 8, 'Она (танцевать)', 'она танцует'),
  (16, 0, 9, 'Мы (понимать)', 'мы понимаем');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (16, 0, 'uz', '(я, читать, книга)', ARRAY['Я', 'читаю', 'книгу.', 'книге', 'читать'], 'Я читаю книгу.'),
  (16, 1, 'uz', '(он, работать, на, завод)', ARRAY['Он', 'работает', 'на', 'заводе.', 'в', 'школе'], 'Он работает на заводе.'),
  (16, 2, 'uz', '(мы, отдыхать, в, парк)', ARRAY['Мы', 'отдыхаем', 'в', 'парке.', 'на', 'улице'], 'Мы отдыхаем в парке.'),
  (16, 3, 'uz', '(ты, понимать, русский, язык)', ARRAY['Ты', 'понимаешь', 'русский', 'язык?', 'знаешь', 'изучаешь'], 'Ты понимаешь русский язык?'),
  (16, 4, 'uz', '(они, играть, в, футбол)', ARRAY['Они', 'играют', 'в', 'футбол.', 'на', 'стадионе'], 'Они играют в футбол.'),
  (16, 5, 'uz', '(она, рисовать, красиво)', ARRAY['Она', 'рисует', 'красиво.', 'рисую', 'танцует'], 'Она рисует красиво.'),
  (16, 6, 'uz', '(я, не, делать, домашнее, задание)', ARRAY['Я', 'не', 'делаю', 'домашнее', 'задание.', 'делает'], 'Я не делаю домашнее задание.'),
  (16, 7, 'uz', '(вы, где, работать)', ARRAY['Где', 'вы', 'работаете?', 'работаешь', 'он'], 'Где вы работаете?'),
  (16, 8, 'uz', '(дети, гулять, на, улица)', ARRAY['Дети', 'гуляют', 'на', 'улице.', 'в', 'парке'], 'Дети гуляют на улице.'),
  (16, 9, 'uz', '(мы, всегда, помогать, мама)', ARRAY['Мы', 'всегда', 'помогаем', 'маме.', 'папе', 'другу'], 'Мы всегда помогаем маме.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (16, 0, 'O‘qimoq', 'Читать'),
  (16, 1, 'Yozmoq', 'Писать'),
  (16, 2, 'Qilmoq', 'Делать'),
  (16, 3, 'Ishlamoq', 'Работать'),
  (16, 4, 'Dam olmoq', 'Отдыхать'),
  (16, 5, 'Sayr qilmoq', 'Гулять'),
  (16, 6, 'Rasm chizmoq', 'Рисовать'),
  (16, 7, 'Raqsga tushmoq', 'Танцевать'),
  (16, 8, 'O‘ynamoq', 'Играть'),
  (16, 9, 'Tinglamoq', 'Слушать'),
  (16, 10, 'O‘ylamoq', 'Думать'),
  (16, 11, 'Tushunmoq', 'Понимать'),
  (16, 12, 'Bilmoq', 'Знать'),
  (16, 13, 'Yordam bermoq', 'Помогать'),
  (16, 14, 'Javob bermoq', 'Отвечать');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  16,
  'Мой обычный день',
  $body$
Каждое утро я встаю в 7 часов. Я делаю зарядку, умываюсь и завтракаю. Потом я иду в университет.

В университете я читаю тексты, пишу упражнения и отвечаю на вопросы. Мой друг Анвар тоже учится в нашем университете. Он всегда помогает мне с русским языком. Мы вместе делаем домашнее задание.

Вечером я гуляю в парке или смотрю телевизор. Мои родители работают до поздна. Они очень устают, но никогда не жалуются. Я люблю свою семью.
$body$,
  'kunlik-oqish-16'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-16', 'встаю', 'встаю', 'Turaman', NULL),
  ('kunlik-oqish-16', 'зарядку', 'зарядку', 'Zaryadka', NULL),
  ('kunlik-oqish-16', 'завтракаю', 'завтракаю', 'Nonushta qilaman', NULL),
  ('kunlik-oqish-16', 'университет', 'университет', 'Universitetga', NULL),
  ('kunlik-oqish-16', 'читаю', 'читаю', 'O‘qiyman', NULL),
  ('kunlik-oqish-16', 'упражнения', 'упражнения', 'Mashqlar', NULL),
  ('kunlik-oqish-16', 'отвечаю', 'отвечаю', 'Javob beraman', NULL),
  ('kunlik-oqish-16', 'Анвар', 'анвар', 'Anvar', NULL),
  ('kunlik-oqish-16', 'помогает', 'помогает', 'Yordam beradi', NULL),
  ('kunlik-oqish-16', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-16', 'домашнее', 'домашнее', 'Uy vazifasi', NULL),
  ('kunlik-oqish-16', 'гуляю', 'гуляю', 'Sayr qilaman', NULL),
  ('kunlik-oqish-16', 'родители', 'родители', 'Ota-ona', NULL),
  ('kunlik-oqish-16', 'устают', 'устают', 'Charchaydilar', NULL),
  ('kunlik-oqish-16', 'жалуются', 'жалуются', 'Shikoyat qiladi', NULL),
  ('kunlik-oqish-16', 'люблю', 'люблю', 'Sevaman / yaxshi ko‘raman', NULL),
  ('kunlik-oqish-16', 'семью', 'семью', 'Oilamni', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (16, 0, 'Men har kuni ertalab soat 7 da turaman.', 'Я каждый день встаю в 7 часов утра.'),
  (16, 1, 'Siz qayerda ishlaysiz? – Men bankda ishlayman.', 'Где вы работаете? – Я работаю в банке.'),
  (16, 2, 'U yaxshi rasm chizadi.', 'Он хорошо рисует.'),
  (16, 3, 'Biz bir-birimizga yordam beramiz.', 'Мы помогаем друг другу.'),
  (16, 4, 'Nega sen bugun uy vazifasini qilmaysan?', 'Почему ты сегодня не делаешь домашнее задание?'),
  (16, 5, 'Bolalar ko‘chada o‘ynashyapti.', 'Дети играют на улице.'),
  (16, 6, 'Men rus tilini tushunaman, lekin yomon gapiraman.', 'Я понимаю русский язык, но плохо говорю.'),
  (16, 7, 'Siz dam olish kunlari nima qilasiz?', 'Что вы делаете в выходные?'),
  (16, 8, 'Ular kechki ovqatni birga tayyorlashadi.', 'Они вместе готовят ужин.'),
  (16, 9, 'Biz har seshanba kuni basseynga boramiz.', 'Мы ходим в бассейн каждый вторник.');

-- ========== Kun 17 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 17;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 17
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 17;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 17;

DELETE FROM public.daily_vocab_words WHERE day_number = 17;

DELETE FROM public.daily_grammar_matches WHERE day_number = 17;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 17;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 17;
DELETE FROM public.daily_grammar_topics WHERE day_number = 17;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  17,
  'Писать, слушать, отвечать, спрашивать (+ чередование)',
  $theory$
Писать: я пишу, ты пишешь, он пишет, они пишут (с → ш в 1 va 3 ko‘plik).

Искать: я ищу, они ищут (с → щ).

Qolgan shakllarda o‘zak o‘zgarmaydi (ты пишешь).

Сказать (kelasi zamon): я скажу, они скажут.

Спрашивать, отвечать — 1-spryazheniye, чередования нет.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (17, 'rule', 0, '«Yozmoq» — 1-shaxs (я)?', 'я пишу', 'я писать', 'я пишешь', 'я пишут', 0),
  (17, 'rule', 1, '«U (ayol) qidiradi»?', 'она ищешь', 'она ищет', 'она ищу', 'она ищут', 1),
  (17, 'rule', 2, '«Sen so‘rayapsan»?', 'Ты спрашиваешь', 'Ты спрашиваю', 'Ты спрашивает', 'Ты спрашивают', 0),
  (17, 'rule', 3, 'Qaysi variant xato?', 'Мы отвечаем', 'Мы отвечаете', 'Иккаласи ham to‘g‘ri', 'Hech biri', 1),
  (17, 'rule', 4, 'Qaysi fe’lda с → ш?', 'читать', 'писать', 'работать', 'отдыхать', 1),
  (17, 'rule', 5, '«Ular» + so‘ramoq', 'они спрашиваю', 'они спрашиваешь', 'они спрашивают', 'они спрашивает', 2),
  (17, 'rule', 6, '«Sen qidirasan»', 'ты ищешь', 'ты ищет', 'ты ищу', 'ты ищут', 0),
  (17, 'rule', 7, '«Men javob beraman»', 'Я отвечаешь', 'Я отвечаю', 'Я отвечает', 'Я отвечают', 1),
  (17, 'rule', 8, '«Они пишут» — qaysi shaxs?', '1-shaxs ko‘plik', '2-shaxs ko‘plik', '3-shaxs ko‘plik', '3-shaxs birlik', 2),
  (17, 'rule', 9, '2-shaxs (ты) «писать»', 'ты пишешь', 'ты пишет', 'ты пишу', 'ты пишут', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (17, 0, 0, 'Писать (я)', 'я пишу'),
  (17, 0, 1, 'Писать (ты)', 'ты пишешь'),
  (17, 0, 2, 'Искать (вы)', 'вы ищете'),
  (17, 0, 3, 'Искать (мы)', 'мы ищем'),
  (17, 0, 4, 'Сказать (он)', 'он скажет'),
  (17, 0, 5, 'Сказать (они)', 'они скажут'),
  (17, 0, 6, 'Спрашивать (я)', 'я спрашиваю'),
  (17, 0, 7, 'Спрашивать (она)', 'она спрашивает'),
  (17, 0, 8, 'Отвечать (мы)', 'мы отвечаем'),
  (17, 0, 9, 'Отвечать (ты)', 'ты отвечаешь');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (17, 0, 'uz', '(я, писать, письмо, мама)', ARRAY['Я', 'пишу', 'письмо', 'маме.', 'папе', 'книгу'], 'Я пишу письмо маме.'),
  (17, 1, 'uz', '(ты, искать, ключи, где)', ARRAY['Где', 'ты', 'ищешь', 'ключи?', 'ищет', 'ищут'], 'Где ты ищешь ключи?'),
  (17, 2, 'uz', '(он, спрашивать, учитель)', ARRAY['Он', 'спрашивает', 'учителя.', 'учитель', 'спрашиваю'], 'Он спрашивает учителя.'),
  (17, 3, 'uz', '(мы, отвечать, на, вопрос)', ARRAY['Мы', 'отвечаем', 'на', 'вопрос.', 'вопросы', 'отвечаете'], 'Мы отвечаем на вопрос.'),
  (17, 4, 'uz', '(они, не, писать, диктант)', ARRAY['Они', 'не', 'пишут', 'диктант.', 'пишу', 'пишет'], 'Они не пишут диктант.'),
  (17, 5, 'uz', '(что, вы, искать, в, сумка)', ARRAY['Что', 'вы', 'ищете', 'в', 'сумке?', 'ищешь'], 'Что вы ищете в сумке?'),
  (17, 6, 'uz', '(она, всегда, отвечать, правильно)', ARRAY['Она', 'всегда', 'отвечает', 'правильно.', 'отвечаю', 'спрашивает'], 'Она всегда отвечает правильно.'),
  (17, 7, 'uz', '(почему, ты, не, спрашивать)', ARRAY['Почему', 'ты', 'не', 'спрашиваешь?', 'спрашивает', 'спрашиваю'], 'Почему ты не спрашиваешь?'),
  (17, 8, 'uz', '(дети, писать, с ошибками)', ARRAY['Дети', 'пишут', 'с', 'ошибками.', 'пишу', 'пишешь'], 'Дети пишут с ошибками.'),
  (17, 9, 'uz', '(я, не, понимать, что, ты, говорить)', ARRAY['Я', 'не', 'понимаю,', 'что', 'ты', 'говоришь.', 'говорит'], 'Я не понимаю, что ты говоришь.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (17, 0, 'So‘ramoq', 'Спрашивать'),
  (17, 1, 'Javob bermoq', 'Отвечать'),
  (17, 2, 'Yozmoq', 'Писать'),
  (17, 3, 'Qidirmoq', 'Искать'),
  (17, 4, 'Aytmoq (bir marta)', 'Сказать'),
  (17, 5, 'Yig‘lamoq', 'Плакать'),
  (17, 6, 'Tinglamoq', 'Слушать'),
  (17, 7, 'Tushuntirmoq', 'Объяснять'),
  (17, 8, 'Takrorlamoq', 'Повторять'),
  (17, 9, 'Xato', 'Ошибка'),
  (17, 10, 'To‘g‘ri', 'Правильно'),
  (17, 11, 'Savol', 'Вопрос'),
  (17, 12, 'Javob', 'Ответ'),
  (17, 13, 'Qo‘l', 'Рука'),
  (17, 14, 'Bosh', 'Голова');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  17,
  'На уроке русского языка',
  $body$
Сейчас урок русского языка. Я сижу в аудитории и внимательно слушаю преподавателя. Преподаватель объясняет новую тему.

Потом он спрашивает:
– Кто хочет ответить?

Моя подруга Анна поднимает руку и отвечает на вопрос. Она говорит правильно. Преподаватель хвалит её.

Я тоже хочу ответить, но ещё думаю. Я ищу правильное слово в голове. Наконец, я поднимаю руку и отвечаю. Преподаватель улыбается и говорит:
– Отлично! Ты хорошо понимаешь тему.
$body$,
  'kunlik-oqish-17'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-17', 'внимательно', 'внимательно', 'Diqqat bilan', NULL),
  ('kunlik-oqish-17', 'слушаю', 'слушаю', 'Tinglayman', NULL),
  ('kunlik-oqish-17', 'объясняет', 'объясняет', 'Tushuntiradi', NULL),
  ('kunlik-oqish-17', 'тему', 'тему', 'Mavzu', NULL),
  ('kunlik-oqish-17', 'спрашивает', 'спрашивает', 'So‘raydi', NULL),
  ('kunlik-oqish-17', 'ответить', 'ответить', 'Javob berish', NULL),
  ('kunlik-oqish-17', 'поднимает', 'поднимает', 'Ko‘taradi', NULL),
  ('kunlik-oqish-17', 'руку', 'руку', 'Qo‘lni', NULL),
  ('kunlik-oqish-17', 'хвалит', 'хвалит', 'Maqtaydi', NULL),
  ('kunlik-oqish-17', 'думаю', 'думаю', 'O‘ylayapman', NULL),
  ('kunlik-oqish-17', 'ищу', 'ищу', 'Qidiryapman', NULL),
  ('kunlik-oqish-17', 'голове', 'голове', 'Boshda', NULL),
  ('kunlik-oqish-17', 'Наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-17', 'улыбается', 'улыбается', 'Tabassum qiladi', NULL),
  ('kunlik-oqish-17', 'понимаешь', 'понимаешь', 'Tushunasan', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (17, 0, 'Sinfda o‘qituvchi nimani so‘rayapti?', 'Что спрашивает учитель в классе?'),
  (17, 1, 'Men har doim uy vazifasini yozaman.', 'Я всегда пишу домашнее задание.'),
  (17, 2, 'Kalitlaringizni qayerda qidiryapsiz?', 'Где вы ищете свои ключи?'),
  (17, 3, 'U savollarga tez javob beradi.', 'Он быстро отвечает на вопросы.'),
  (17, 4, 'Nega sen menga javob bermayapsan?', 'Почему ты мне не отвечаешь?'),
  (17, 5, 'Iltimos, gapimni bo‘lmang, tinglang.', 'Пожалуйста, не перебивайте меня, слушайте.'),
  (17, 6, 'Siz xato yozyapsiz, bu so‘z boshqacha yoziladi.', 'Вы пишете неправильно, это слово пишется иначе.'),
  (17, 7, 'Ular o‘qituvchidan yordam so‘rashadi.', 'Они просят помощи у учителя.'),
  (17, 8, 'Men hamma narsani tushunaman, lekin gapira olmayman.', 'Я всё понимаю, но не могу говорить.'),
  (17, 9, 'Darsda diqqat bilan tinglang va savollar bering.', 'На уроке внимательно слушайте и задавайте вопросы.');

-- ========== Kun 18 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 18;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 18
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 18;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 18;

DELETE FROM public.daily_vocab_words WHERE day_number = 18;

DELETE FROM public.daily_grammar_matches WHERE day_number = 18;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 18;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 18;
DELETE FROM public.daily_grammar_topics WHERE day_number = 18;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  18,
  'Понимать, знать, думать, изучать',
  $theory$
Чередования нет: понимаю / знаю / думаю / изучаю…

Farqlar:
• понимать — hozirgi tushunish jarayoni.
• знать — fakt, ma’lumot.
• думать — fikrlash (+ о ком / что…).
• изучать — fan yoki tilni o‘rganish.

Taqqoslang: Я понимаю русский язык. / Я знаю русский язык. / Я изучаю русский язык в университете.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (18, 'rule', 0, '«Tushunmoq» — я?', 'я понимаю', 'я понимаешь', 'я понимает', 'я понимаем', 0),
  (18, 'rule', 1, '«Sen bilasan»', 'ты знаю', 'ты знаешь', 'ты знает', 'ты знаем', 1),
  (18, 'rule', 2, '«U o‘ylaydi»', 'Он думаешь', 'Он думаю', 'Он думает', 'Он думают', 2),
  (18, 'rule', 3, '«Biz o‘rganamiz»', 'мы изучаем', 'мы изучаешь', 'мы изучает', 'мы изучают', 0),
  (18, 'rule', 4, '«Bilmoq»?', 'понимать', 'знать', 'думать', 'изучать', 1),
  (18, 'rule', 5, '«Ular tushunadilar»', 'они понимаю', 'они понимаешь', 'они понимает', 'они понимают', 3),
  (18, 'rule', 6, '«Men o‘ylayapman»', 'Я думаю', 'Я думаешь', 'Я думает', 'Я думают', 0),
  (18, 'rule', 7, '«Вы знаете» — shaxs?', '2-shaxs birlik', '2-shaxs ko‘plik', '3-shaxs ko‘plik', '1-shaxs ko‘plik', 1),
  (18, 'rule', 8, 'Jarayonni билдиради?', 'знать', 'понимать', 'думать', 'изучать', 1),
  (18, 'rule', 9, 'Qaysi gap xato?', 'мы знаем', 'вы знаете', 'они знают', 'я знаешь', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (18, 0, 0, 'Понимать', 'tushunmoq'),
  (18, 0, 1, 'Знать', 'bilmoq'),
  (18, 0, 2, 'Думать', 'o‘ylamoq'),
  (18, 0, 3, 'Изучать', 'o‘rganmoq (fan)'),
  (18, 0, 4, 'Я понимаю', 'men tushunaman'),
  (18, 0, 5, 'Ты знаешь', 'sen bilasan'),
  (18, 0, 6, 'Он думает', 'u o‘ylaydi'),
  (18, 0, 7, 'Мы изучаем', 'biz o‘rganamiz'),
  (18, 0, 8, 'Вы понимаете', 'siz tushunasiz'),
  (18, 0, 9, 'Они знают', 'ular bilishadi');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (18, 0, 'uz', '(я, не, понимать, ты)', ARRAY['Я', 'тебя', 'не', 'понимаю.', 'тебе', 'знаю'], 'Я тебя не понимаю.'),
  (18, 1, 'uz', '(ты, знать, этот, человек)', ARRAY['Ты', 'знаешь', 'этого', 'человека?', 'знает', 'знаю'], 'Ты знаешь этого человека?'),
  (18, 2, 'uz', '(он, думать, о, работа)', ARRAY['Он', 'думает', 'о', 'работе.', 'работу', 'думаю'], 'Он думает о работе.'),
  (18, 3, 'uz', '(мы, изучать, русский, язык, в, университет)', ARRAY['Мы', 'изучаем', 'русский', 'язык', 'в', 'университете.', 'изучает'], 'Мы изучаем русский язык в университете.'),
  (18, 4, 'uz', '(вы, понимать, что, я, говорить)', ARRAY['Вы', 'понимаете,', 'что', 'я', 'говорю?', 'говорит', 'понимаю'], 'Вы понимаете, что я говорю?'),
  (18, 5, 'uz', '(они, много, знать, о, Россия)', ARRAY['Они', 'много', 'знают', 'о', 'России.', 'понимают', 'думают'], 'Они много знают о России.'),
  (18, 6, 'uz', '(я, думать, что, ты, прав)', ARRAY['Я', 'думаю,', 'что', 'ты', 'прав.', 'права', 'думаешь'], 'Я думаю, что ты прав.'),
  (18, 7, 'uz', '(почему, ты, не, знать, это, слово)', ARRAY['Почему', 'ты', 'не', 'знаешь', 'это', 'слово?', 'знает'], 'Почему ты не знаешь это слово?'),
  (18, 8, 'uz', '(она, изучать, медицина, уже, 3, год)', ARRAY['Она', 'изучает', 'медицину', 'уже', '3', 'года.', 'изучаем'], 'Она изучает медицину уже 3 года.'),
  (18, 9, 'uz', '(мы, рады, что, вы, понимать, нас)', ARRAY['Мы', 'рады,', 'что', 'вы', 'понимаете', 'нас.', 'знаете'], 'Мы рады, что вы понимаете нас.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (18, 0, 'Tushunmoq', 'Понимать'),
  (18, 1, 'Bilmoq', 'Знать'),
  (18, 2, 'O‘ylamoq', 'Думать'),
  (18, 3, 'O‘rganmoq (fan, til)', 'Изучать'),
  (18, 4, 'Erkin', 'Свободно'),
  (18, 5, 'Xato', 'Ошибка'),
  (18, 6, 'To‘g‘ri', 'Правильно'),
  (18, 7, 'Yaxshi', 'Хорошо'),
  (18, 8, 'Yomon', 'Плохо'),
  (18, 9, 'Tez-tez', 'Часто'),
  (18, 10, 'Ba’zida', 'Иногда'),
  (18, 11, 'Har doim', 'Всегда'),
  (18, 12, 'Hech qachon', 'Никогда'),
  (18, 13, 'Orzu', 'Мечта'),
  (18, 14, 'Bilim', 'Знание');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  18,
  'Мои знания',
  $body$
Я думаю, что русский язык – это очень интересно. Я изучаю его уже второй год.

Сейчас я хорошо понимаю преподавателя, но иногда есть ошибки. Мой друг Анвар знает русский язык лучше меня. Он часто помогает мне.

Я думаю, что через год я буду свободно говорить по-русски.

Мои родители не знают русского языка. Они только понимают несколько слов: «здравствуйте», «спасибо», «до свидания».

Я хочу научить их русскому языку. Это моя мечта.
$body$,
  'kunlik-oqish-18'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-18', 'изучаю', 'изучаю', 'O‘rganyapman', NULL),
  ('kunlik-oqish-18', 'второй', 'второй', 'Ikkinchi', NULL),
  ('kunlik-oqish-18', 'ошибки', 'ошибки', 'Xatolar', NULL),
  ('kunlik-oqish-18', 'лучше', 'лучше', 'Yaxshiroq', NULL),
  ('kunlik-oqish-18', 'через', 'через', 'Orqali / keyin', NULL),
  ('kunlik-oqish-18', 'свободно', 'свободно', 'Erkin', NULL),
  ('kunlik-oqish-18', 'несколько', 'несколько', 'Bir necha', NULL),
  ('kunlik-oqish-18', 'научить', 'научить', 'O‘rgatmoq', NULL),
  ('kunlik-oqish-18', 'Анвар', 'анвар', 'Anvar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (18, 0, 'Siz meni tushunyapsizmi?', 'Вы меня понимаете?'),
  (18, 1, 'Men bu odamni yaxshi bilaman.', 'Я хорошо знаю этого человека.'),
  (18, 2, 'U nima haqida o‘ylayapti?', 'О чём он думает?'),
  (18, 3, 'Biz universitetda iqtisodiyotni o‘rganyapmiz.', 'Мы изучаем экономику в университете.'),
  (18, 4, 'Kechirasiz, men sizning ismingizni bilmayman.', 'Извините, я не знаю вашего имени.'),
  (18, 5, 'Sizningcha, ertaga havo qanday bo‘ladi?', 'Как вы думаете, какая завтра будет погода?'),
  (18, 6, 'U rus tilini mukammal biladi.', 'Он знает русский язык отлично.'),
  (18, 7, 'Nega sen meni tushunmayapsan?', 'Почему ты меня не понимаешь?'),
  (18, 8, 'Biz hozir yangi mavzuni o‘rganyapmiz.', 'Мы сейчас изучаем новую тему.'),
  (18, 9, 'O‘ylaymanki, siz haqsiz.', 'Я думаю, что вы правы.');

-- ========== Kun 19 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 19;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 19
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 19;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 19;

DELETE FROM public.daily_vocab_words WHERE day_number = 19;

DELETE FROM public.daily_grammar_matches WHERE day_number = 19;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 19;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 19;
DELETE FROM public.daily_grammar_topics WHERE day_number = 19;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  19,
  '1-spryazheniye: dialoglar va inkor',
  $theory$
O‘rganilgan 1-spryazheniye fe’llarini gap va situatsiyada qo‘llang.

Inkor: не + fe’l (я не читаю).

Savol so‘zlari: что? где? когда? почему? как? + fe’lning to‘g‘ri shakli.

Misollar: Что ты делаешь? Где он работает?
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (19, 'rule', 0, '«Sen nima qilyapsan?»', 'Что ты делаю?', 'Что ты делаешь?', 'Что ты делает?', 'Что ты делаем?', 1),
  (19, 'rule', 1, '«U qayerda ishlaydi?»', 'Где он работает?', 'Где ты работаешь?', 'Где вы работаете?', 'Где они работают?', 0),
  (19, 'rule', 2, '«не» bilan to‘g‘ri gap', 'Я не говорю по-русски.', 'Я не говорят по-русски.', 'Я не говоришь по-русски.', 'Я не говорите по-русски.', 0),
  (19, 'rule', 3, '«Ular rus tilini yaxshi biladilar»', 'Они хорошо знает русский язык.', 'Они хорошо знаешь русский язык.', 'Они хорошо знают русский язык.', 'Они хорошо знаю русский язык.', 2),
  (19, 'rule', 4, 'Savol so‘zi va tartib', 'Faqat «Что ты делаешь?»', 'Faqat «Ты что делаешь?»', 'Ikkalasi ham odatiy', 'Ikkalasi ham xato', 2),
  (19, 'rule', 5, '«Biz birga o‘qiymiz»', 'Мы читаем вместе.', 'Мы читаешь вместе.', 'Мы читает вместе.', 'Мы читают вместе.', 0),
  (19, 'rule', 6, '2-shaxs (ты) to‘g‘ri', 'Ты хорошо играешь в футбол.', 'Ты хорошо играю в футбол.', 'Ты хорошо играет в футбол.', 'Ты хорошо играем в футбол.', 0),
  (19, 'rule', 7, '«U (ayol) g‘alati o‘ylaydi»', 'Она странно думаю.', 'Она странно думаешь.', 'Она странно думает.', 'Она странно думают', 2),
  (19, 'rule', 8, '«Men uni tushunmayman»', 'Я не понимаю его.', 'Я не понимаешь его.', 'Я не понимает его.', 'Я не понимают его.', 0),
  (19, 'rule', 9, '«Вы слушаете меня?» — kimga?', 'Faqat bitta kishi (rasmiy)', 'Faqat bir necha kishi', 'Ikkalasi ham mumkin', 'Hech kimga', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (19, 0, 0, 'Что ты делаешь?', 'Я читаю книгу.'),
  (19, 0, 1, 'Где работает твой брат?', 'Он работает в банке.'),
  (19, 0, 2, 'Ты понимаешь меня?', 'Да, я понимаю.'),
  (19, 0, 3, 'Почему вы не отвечаете?', 'Потому что мы думаем.'),
  (19, 0, 4, 'Кто рисует этот портрет?', 'Моя сестра рисует.'),
  (19, 0, 5, 'Вы знаете этого человека?', 'Нет, мы не знаем его.'),
  (19, 0, 6, 'Что вы изучаете?', 'Мы изучаем русский язык.'),
  (19, 0, 7, 'Как ты думаешь?', 'Я думаю, что это правильно.'),
  (19, 0, 8, 'Они гуляют в парке?', 'Да, они гуляют.'),
  (19, 0, 9, 'Ты пишешь письмо?', 'Да, я пишу.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (19, 0, 'uz', '(вы, куда, идти)', ARRAY['Куда', 'вы', 'идёте?', 'идёт', 'иду'], 'Куда вы идёте?'),
  (19, 1, 'uz', '(я, не, знать, его, адрес)', ARRAY['Я', 'не', 'знаю', 'его', 'адрес.', 'знаешь'], 'Я не знаю его адрес.'),
  (19, 2, 'uz', '(почему, ты, не, отвечать, на, мой, вопрос)', ARRAY['Почему', 'ты', 'не', 'отвечаешь', 'на', 'мой', 'вопрос?', 'отвечает'], 'Почему ты не отвечаешь на мой вопрос?'),
  (19, 3, 'uz', '(мы, всегда, делать, домашнее, задание, вечером)', ARRAY['Мы', 'всегда', 'делаем', 'домашнее', 'задание', 'вечером.', 'делает'], 'Мы всегда делаем домашнее задание вечером.'),
  (19, 4, 'uz', '(что, он, сейчас, делать)', ARRAY['Что', 'он', 'сейчас', 'делает?', 'делаешь', 'делаю'], 'Что он сейчас делает?'),
  (19, 5, 'uz', '(вы, понимать, по-русски)', ARRAY['Вы', 'понимаете', 'по-русски?', 'понимаю', 'понимаешь'], 'Вы понимаете по-русски?'),
  (19, 6, 'uz', '(она, хорошо, играть, на, гитара)', ARRAY['Она', 'хорошо', 'играет', 'на', 'гитаре.', 'играю', 'играешь'], 'Она хорошо играет на гитаре.'),
  (19, 7, 'uz', '(мы, не, гулять, сегодня, потому что, дождь)', ARRAY['Мы', 'не', 'гуляем', 'сегодня,', 'потому', 'что', 'дождь.', 'гуляет'], 'Мы не гуляем сегодня, потому что дождь.'),
  (19, 8, 'uz', '(как, ты, думать, о, этот, фильм)', ARRAY['Как', 'ты', 'думаешь', 'об', 'этом', 'фильме?', 'думает'], 'Как ты думаешь об этом фильме?'),
  (19, 9, 'uz', '(они, изучать, английский, и, немецкий)', ARRAY['Они', 'изучают', 'английский', 'и', 'немецкий.', 'изучаем', 'изучает'], 'Они изучают английский и немецкий.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (19, 0, 'Gaplashmoq', 'Разговаривать'),
  (19, 1, 'Taklif qilmoq', 'Предлагать'),
  (19, 2, 'Qabul qilmoq', 'Принимать'),
  (19, 3, 'Kutubxona', 'Библиотека'),
  (19, 4, 'Kino', 'Кино'),
  (19, 5, 'Konsert', 'Концерт'),
  (19, 6, 'Film', 'Фильм'),
  (19, 7, 'Kitob', 'Книга'),
  (19, 8, 'Tarix', 'История'),
  (19, 9, 'Fikr', 'Мысль'),
  (19, 10, 'Maslahat', 'Совет'),
  (19, 11, 'Savol', 'Вопрос'),
  (19, 12, 'Javob', 'Ответ'),
  (19, 13, 'Tez', 'Быстро'),
  (19, 14, 'Sekin', 'Медленно');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  19,
  'Разговор друзей',
  $body$
– Привет, Анна! Что ты делаешь?

– Привет, Саша! Я читаю интересную книгу по истории.

– А где твой брат?

– Он работает в библиотеке. Он помогает студентам найти книги.

– Ты знаешь, почему я тебя не видел вчера?

– Потому что я был на концерте.

– Как ты думаешь, понравится мне этот фильм?

– Я думаю, что да. Ты любишь детективы.

– Спасибо за совет. Сейчас я иду в кино. Пока!

– Пока! Хорошего вечера!
$body$,
  'kunlik-oqish-19'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-19', 'истории', 'истории', 'Tarix bo‘yicha', NULL),
  ('kunlik-oqish-19', 'библиотеке', 'библиотеке', 'Kutubxonada', NULL),
  ('kunlik-oqish-19', 'студентам', 'студентам', 'Talabalarga', NULL),
  ('kunlik-oqish-19', 'видел', 'видел', 'Ko‘rdim', NULL),
  ('kunlik-oqish-19', 'вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-19', 'концерте', 'концерте', 'Konsertda', NULL),
  ('kunlik-oqish-19', 'понравится', 'понравится', 'Yoqadi', NULL),
  ('kunlik-oqish-19', 'детективы', 'детективы', 'Detektivlar', NULL),
  ('kunlik-oqish-19', 'совет', 'совет', 'Maslahat', NULL),
  ('kunlik-oqish-19', 'вечера', 'вечера', 'Kechning', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (19, 0, 'Kechirasiz, siz bilan gaplashsam bo‘ladimi?', 'Извините, можно с вами поговорить?'),
  (19, 1, 'Bugun kechqurun nima qilyapsiz?', 'Что вы делаете сегодня вечером?'),
  (19, 2, 'Men sizning fikringizni tushunaman.', 'Я понимаю вашу мысль.'),
  (19, 3, 'U nega bunchalik tez gapiryapti?', 'Почему он так быстро говорит?'),
  (19, 4, 'Biz har dam olish kunida bog‘ga boramiz.', 'Мы ходим в парк каждые выходные.'),
  (19, 5, 'Siz qanday musiqa tinglaysiz?', 'Какую музыку вы слушаете?'),
  (19, 6, 'Ular hozir nima haqida gaplashyapti?', 'О чём они сейчас разговаривают?'),
  (19, 7, 'Men bu masala haqida ko‘p o‘yladim.', 'Я много думал об этом вопросе.'),
  (19, 8, 'Sizningcha, u bizning taklifimizni qabul qiladimi?', 'Как вы думаете, он примет наше предложение?'),
  (19, 9, 'Iltimos, sekinroq gapiring, men hamma narsani tushunishni xohlayman.', 'Пожалуйста, говорите медленнее, я хочу всё понять.');

-- ========== Kun 20 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 20;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 20
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 20;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 20;

DELETE FROM public.daily_vocab_words WHERE day_number = 20;

DELETE FROM public.daily_grammar_matches WHERE day_number = 20;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 20;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 20;
DELETE FROM public.daily_grammar_topics WHERE day_number = 20;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  20,
  '1-spryazheniye: takrorlash (16–20)',
  $theory$
Guruhlar: asosiy (читать…), muloqot (слушать…), bilish (понимать…), harakat (рисовать…).

Qoida: я -ю; ты -ешь; он/она -ет; мы -ем; вы -ете; они -ют.

Cheredovanie: писать → пишу/пишут; искать → ищу/ищут.

Inkor: не + fe’l. Savollar: что, где, когда, почему, как.

2-spryazheniye misoli: любить (keyingi darsda).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (20, 'rule', 0, 'Qaysi fe’l 1-spryazheniye emas?', 'читать', 'любить', 'работать', 'играть', 1),
  (20, 'rule', 1, '«Men yozaman»', 'я пишу', 'я пишешь', 'я пишет', 'я пишут', 0),
  (20, 'rule', 2, '«не» bilan', 'Я не читаю газеты.', 'Я не читаешь газеты.', 'Я не читает газеты.', 'Я не читают газеты.', 0),
  (20, 'rule', 3, '«Ular qayerda dam oladi?»', 'Где они отдыхаешь?', 'Где они отдыхает?', 'Где они отдыхают?', 'Где они отдыхаем?', 2),
  (20, 'rule', 4, '«Она хорошо рисует»', 'Она хорошо рисует.', 'Она хорошо рисуешь.', 'Она хорошо рисую.', 'Она хорошо рисуют.', 0),
  (20, 'rule', 5, '«Siz qayerda ishlaysiz?» — kimga?', 'Faqat bitta kishi (rasmiy)', 'Faqat bir necha kishi', 'Ikkalasi ham', 'Hech kimga', 2),
  (20, 'rule', 6, 'Qaysi gap xato? (смотреть — 2-spryazheniye)', 'мы смотрим', 'вы смотрите', 'они смотрят', 'я смотришь', 3),
  (20, 'rule', 7, '«U nima haqida o‘ylaydi?»', 'О чём он думает?', 'О чём он думаешь?', 'О чём он думаю?', 'О чём он думают?', 0),
  (20, 'rule', 8, '«Biz har kuni bog‘da sayr qilamiz»', 'Мы каждый день гуляем в парке.', 'Мы каждый день гуляешь в парке.', 'Мы каждый день гуляет в парке.', 'Мы каждый день гуляют в парке.', 0),
  (20, 'rule', 9, 'Cheredovanie: писать', 'Я пишу, ты пишешь, они пишут.', 'они пишат', 'ты писаешь', 'ты пишишь', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (20, 0, 0, 'Читать (мы)', 'Мы читаем газету.'),
  (20, 0, 1, 'Писать (ты)', 'Ты пишешь письмо.'),
  (20, 0, 2, 'Понимать (я)', 'Я понимаю тебя.'),
  (20, 0, 3, 'Работать (он)', 'Он работает в офисе.'),
  (20, 0, 4, 'Гулять (они)', 'Они гуляют во дворе.'),
  (20, 0, 5, 'Отвечать (вы)', 'Вы отвечаете правильно.'),
  (20, 0, 6, 'Знать (она)', 'Она знает ответ.'),
  (20, 0, 7, 'Играть (мы)', 'Мы играем в шахматы.'),
  (20, 0, 8, 'Думать (ты)', 'Ты думаешь о будущем.'),
  (20, 0, 9, 'Изучать (они)', 'Они изучают историю.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (20, 0, 'uz', '(каждый, день, я, читать, новости, в, интернет)', ARRAY['Каждый', 'день', 'я', 'читаю', 'новости', 'в', 'интернете.', 'читает'], 'Каждый день я читаю новости в интернете.'),
  (20, 1, 'uz', '(ты, почему, не, отвечать, на, мой, звонок)', ARRAY['Почему', 'ты', 'не', 'отвечаешь', 'на', 'мой', 'звонок?', 'отвечает'], 'Почему ты не отвечаешь на мой звонок?'),
  (20, 2, 'uz', '(они, сейчас, играть, в, теннис, на, стадион)', ARRAY['Они', 'сейчас', 'играют', 'в', 'теннис', 'на', 'стадионе.', 'играет'], 'Они сейчас играют в теннис на стадионе.'),
  (20, 3, 'uz', '(мы, всегда, помогать, друг, другу)', ARRAY['Мы', 'всегда', 'помогаем', 'друг', 'другу.', 'помогаете', 'помогает'], 'Мы всегда помогаем друг другу.'),
  (20, 4, 'uz', '(вы, что, думать, о, этот, план)', ARRAY['Что', 'вы', 'думаете', 'об', 'этом', 'плане?', 'думаешь'], 'Что вы думаете об этом плане?'),
  (20, 5, 'uz', '(она, хорошо, знать, французский, язык)', ARRAY['Она', 'хорошо', 'знает', 'французский', 'язык.', 'знаю', 'знаешь'], 'Она хорошо знает французский язык.'),
  (20, 6, 'uz', '(я, не, понимать, почему, ты, так, говорить)', ARRAY['Я', 'не', 'понимаю,', 'почему', 'ты', 'так', 'говоришь.', 'говорит'], 'Я не понимаю, почему ты так говоришь.'),
  (20, 7, 'uz', '(дети, с удовольствием, рисовать, красками)', ARRAY['Дети', 'с', 'удовольствием', 'рисуют', 'красками.', 'рисуешь'], 'Дети с удовольствием рисуют красками.'),
  (20, 8, 'uz', '(мой, друг, искать, работу, уже, месяц)', ARRAY['Мой', 'друг', 'ищет', 'работу', 'уже', 'месяц.', 'ищут'], 'Мой друг ищет работу уже месяц.'),
  (20, 9, 'uz', '(мы, изучать, русский, язык, второй, год)', ARRAY['Мы', 'изучаем', 'русский', 'язык', 'второй', 'год.', 'изучает'], 'Мы изучаем русский язык второй год.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (20, 0, 'Xat', 'Письмо'),
  (20, 1, 'Do‘st', 'Друг'),
  (20, 2, 'Kutmoq', 'Ждать'),
  (20, 3, 'Kelmoq', 'Приходить'),
  (20, 4, 'Kechikmoq', 'Опаздывать'),
  (20, 5, 'Loyiha', 'Проект'),
  (20, 6, 'Yoz', 'Лето'),
  (20, 7, 'Qrim', 'Крым'),
  (20, 8, 'Bir vaqtning o‘zida', 'Одновременно'),
  (20, 9, 'Ulgurmoq', 'Успевать'),
  (20, 10, 'Holat', 'Ситуация'),
  (20, 11, 'Bo‘lmoq (vaziyatda)', 'Быть'),
  (20, 12, 'Qaytmoq', 'Возвращаться'),
  (20, 13, 'Taom', 'Еда'),
  (20, 14, 'Maslahat', 'Совет');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  20,
  'Письмо другу',
  $body$
Привет, мой дорогой друг!

Как твои дела? Я живу в Москве уже два месяца. Каждый день я встаю в 7 часов утра, завтракаю и еду в университет. В университете я много читаю, пишу и отвечаю на вопросы.

Мне очень нравится русский язык. Я понимаю преподавателя, но иногда делаю ошибки.

Мои новые друзья – Анна и Павел – помогают мне. Мы вместе гуляем по городу, смотрим достопримечательности и общаемся на русском языке.

Я думаю, что скоро буду говорить свободно.

А как ты? Что ты делаешь сейчас? Напиши мне письмо. Жду с нетерпением!

Пока, твой друг Азиз.
$body$,
  'kunlik-oqish-20'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-20', 'дорогой', 'дорогой', 'Aziz', NULL),
  ('kunlik-oqish-20', 'дела', 'дела', 'Ishlar', NULL),
  ('kunlik-oqish-20', 'месяца', 'месяца', 'Oy', NULL),
  ('kunlik-oqish-20', 'нравится', 'нравится', 'Yoqtadi', NULL),
  ('kunlik-oqish-20', 'друзья', 'друзья', 'Do‘stlar', NULL),
  ('kunlik-oqish-20', 'Павел', 'павел', 'Pavel', NULL),
  ('kunlik-oqish-20', 'достопримечательности', 'достопримечательности', 'Diqqatga sazovor joylar', NULL),
  ('kunlik-oqish-20', 'общаемся', 'общаемся', 'Muloqot qilamiz', NULL),
  ('kunlik-oqish-20', 'скоро', 'скоро', 'Tez orada', NULL),
  ('kunlik-oqish-20', 'нетерпением', 'нетерпением', 'Sabrsizlik bilan', NULL),
  ('kunlik-oqish-20', 'Азиз', 'азиз', 'Aziz', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (20, 0, 'Siz so‘raganingizda, men har doim javob beraman.', 'Я всегда отвечаю, когда вы спрашиваете.'),
  (20, 1, 'U hech qachon kechikmaydi, har doim vaqtida keladi.', 'Он никогда не опаздывает, всегда приходит вовремя.'),
  (20, 2, 'Biz kelasi hafta yangi loyihani boshlaymiz.', 'Мы начинаем новый проект на следующей неделе.'),
  (20, 3, 'Nega bugun juda charchaganga o‘xshaysan?', 'Почему ты сегодня выглядишь очень уставшим?'),
  (20, 4, 'Ular har yozda Qrimga borishadi.', 'Они ездят в Крым каждое лето.'),
  (20, 5, 'Men sizning maslahatingizni diqqat bilan tinglayman.', 'Я внимательно слушаю ваш совет.'),
  (20, 6, 'Siz qanday qilib bir vaqtning o‘zida ko‘p ishni qilishga ulgurasiz?', 'Как вы успеваете делать много дел одновременно?'),
  (20, 7, 'U kitoblarni faqat kechqurun o‘qiydi.', 'Он читает книги только вечером.'),
  (20, 8, 'Men seni juda yaxshi tushunaman, chunki o‘zim ham shunday vaziyatda bo‘lganman.', 'Я очень хорошо понимаю тебя, потому что сам был в такой ситуации.'),
  (20, 9, 'Ular endigina restorandan qaytishyapti va taom haqida gapirishyapti.', 'Они только что возвращаются из ресторана и разговаривают об еде.');
