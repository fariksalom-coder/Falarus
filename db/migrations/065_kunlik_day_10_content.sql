-- Kunlik kun 10: Несколько, много/мало, pul va vaqt.

DELETE FROM public.daily_practice_prompts WHERE day_number = 10;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 10
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 10;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 10;

DELETE FROM public.daily_vocab_words WHERE day_number = 10;

DELETE FROM public.daily_grammar_matches WHERE day_number = 10;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 10;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 10;
DELETE FROM public.daily_grammar_topics WHERE day_number = 10;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  10,
  'Несколько, много, мало — pul va vaqt',
  $theory$
Несколько + родительный падеж множественного числа — «bir necha»: У меня есть несколько вопросов.

Много / мало / достаточно + род. мн.: В Москве много туристов. У меня мало времени.

Пул: 1 рубль; 2, 3, 4 рубля; 5–20 рублей. Сколько стоит? / Сколько стоят?

Время: Который час? / Сколько времени? — Сейчас два часа. Во сколько? — В три часа.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (10, 'rule', 0, '«Bir necha» ma’nosidagi so‘z?', 'Много', 'Мало', 'Несколько', 'Сколько', 2),
  (10, 'rule', 1, '«много» qaysi birikishda to‘g‘ri?', 'много время', 'много времена', 'много времени', 'много времен', 2),
  (10, 'rule', 2, '«У меня есть несколько …» (savol)?', 'вопрос', 'вопроса', 'вопросов', 'вопросы', 2),
  (10, 'rule', 3, '«Эта сумка стоит 3 …» (rubl)?', 'рубль', 'рубля', 'рублей', 'рублёв', 1),
  (10, 'rule', 4, 'Soat 7 ni qanday aytish mumkin?', 'шесть часов', 'семь часов', 'восьмой час', 'седьмой час', 1),
  (10, 'rule', 5, '«Во сколько начинается урок?» (soat 9 da)', 'В девять часов', 'В девятый час', 'В девятом часу', 'В девять', 0),
  (10, 'rule', 6, '«Достаточно» dan keyin qaysi kelish?', 'именительный', 'родительный', 'винительный', 'дательный', 1),
  (10, 'rule', 7, '15 dollar — qaysi variant to‘g‘ri?', 'пятнадцать доллар', 'пятнадцать доллара', 'пятнадцать долларов', 'пятнадцать доллары', 2),
  (10, 'rule', 8, '«Сколько времени?» ga javob?', 'Сейчас десять час.', 'Сейчас десять часов.', 'Сейчас десятый час.', 'Сейчас десять часа.', 1),
  (10, 'rule', 9, 'Qaysi gapda «мало» to‘g‘ri?', 'У него мало друзей.', 'У него мало друг.', 'У него мало друга.', 'У него мало друзья.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (10, 0, 0, '1 рубль', '1 рубль'),
  (10, 0, 1, '2 рубля', '2 рубля'),
  (10, 0, 2, '3 рубля', '3 рубля'),
  (10, 0, 3, '5 рублей', '5 рублей'),
  (10, 0, 4, '10 рублей', '10 рублей'),
  (10, 0, 5, '1 доллар', '1 доллар'),
  (10, 0, 6, '3 доллара', '3 доллара'),
  (10, 0, 7, '5 долларов', '5 долларов'),
  (10, 0, 8, '20 долларов', '20 долларов'),
  (10, 0, 9, '4 доллара', '4 доллара');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (10, 0, 'uz', '(сколько, стоит, этот, телефон)', ARRAY['Сколько', 'стоит', 'этот', 'телефон?', 'книга', 'эта'], 'Сколько стоит этот телефон?'),
  (10, 1, 'uz', '(у, меня, достаточно, денег)', ARRAY['У', 'меня', 'достаточно', 'денег.', 'времени', 'мало'], 'У меня достаточно денег.'),
  (10, 2, 'uz', '(в, парке, много, детей)', ARRAY['В', 'парке', 'много', 'детей.', 'ребёнок', 'один'], 'В парке много детей.'),
  (10, 3, 'uz', '(у, неё, мало, времени)', ARRAY['У', 'неё', 'мало', 'времени.', 'денег', 'много'], 'У неё мало времени.'),
  (10, 4, 'uz', '(концерт, начнётся, в, 7, часов)', ARRAY['Концерт', 'начнётся', 'в', '7', 'часов.', 'утром'], 'Концерт начнётся в 7 часов.'),
  (10, 5, 'uz', '(сколько, тебе, лет)', ARRAY['Сколько', 'тебе', 'лет?', 'год', 'зовут'], 'Сколько тебе лет?'),
  (10, 6, 'uz', '(я, купил, несколько, книг)', ARRAY['Я', 'купил', 'несколько', 'книг.', 'книгу', 'одну'], 'Я купил несколько книг.'),
  (10, 7, 'uz', '(это, платье, стоит, 2000, рублей)', ARRAY['Это', 'платье', 'стоит', '2000', 'рублей.', 'долларов'], 'Это платье стоит 2000 рублей.'),
  (10, 8, 'uz', '(который, час, сейчас)', ARRAY['Который', 'час', 'сейчас?', 'Сколько', 'времени'], 'Который час сейчас?'),
  (10, 9, 'uz', '(у, нас, несколько, минут)', ARRAY['У', 'нас', 'есть', 'несколько', 'минут.', 'час'], 'У нас есть несколько минут.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (10, 0, 'Bir necha', 'Несколько'),
  (10, 1, 'Ko‘p', 'Много'),
  (10, 2, 'Oz', 'Мало'),
  (10, 3, 'Yetarli', 'Достаточно'),
  (10, 4, 'Qancha turadi?', 'Сколько стоит?'),
  (10, 5, 'Rubl', 'Рубль'),
  (10, 6, 'Dollar', 'Доллар'),
  (10, 7, 'Pul', 'Деньги'),
  (10, 8, 'Vaqt', 'Время'),
  (10, 9, 'Kechirasiz, soat necha?', 'Извините, который час?'),
  (10, 10, 'Bozor', 'Рынок'),
  (10, 11, 'Mahsulot', 'Продукт'),
  (10, 12, 'Go‘sht', 'Мясо'),
  (10, 13, 'Meva', 'Фрукты'),
  (10, 14, 'Sabzavot', 'Овощи');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  10,
  'На рынке и дома',
  $body$
Сегодня утром я пошёл на рынок. Мне нужно было купить несколько продуктов. Я купил два килограмма яблок, три килограмма картошки и один килограмм мяса. Всё это стоило 500 рублей. У меня было достаточно денег, поэтому я купил ещё несколько фруктов.

Вечером я встретился с другом. Мы посидели в кафе и выпили кофе. Кофе стоил 150 рублей за две чашки.

Сейчас у меня мало времени, потому что завтра экзамен. Я должен повторить все правила. Удачи!
$body$,
  'kunlik-oqish-10'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-10', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-10', 'утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-10', 'пошёл', 'пошёл', 'Bordim (erkak)', NULL),
  ('kunlik-oqish-10', 'рынок', 'рынок', 'Bozor', NULL),
  ('kunlik-oqish-10', 'нужно', 'нужно', 'Kerak', NULL),
  ('kunlik-oqish-10', 'купить', 'купить', 'Sotib olmoq', NULL),
  ('kunlik-oqish-10', 'несколько', 'несколько', 'Bir necha', NULL),
  ('kunlik-oqish-10', 'продуктов', 'продуктов', 'Mahsulotlar (род.)', NULL),
  ('kunlik-oqish-10', 'килограмма', 'килограмма', 'Kilogramm (род.)', NULL),
  ('kunlik-oqish-10', 'яблок', 'яблок', 'Olma (род. мн.)', NULL),
  ('kunlik-oqish-10', 'картошки', 'картошки', 'Kartoshka (род.)', NULL),
  ('kunlik-oqish-10', 'мяса', 'мяса', 'Go‘sht (род.)', NULL),
  ('kunlik-oqish-10', 'стоило', 'стоило', 'Narxi edi', NULL),
  ('kunlik-oqish-10', 'рублей', 'рублей', 'Rubl (род. мн.)', NULL),
  ('kunlik-oqish-10', 'достаточно', 'достаточно', 'Yetarli', NULL),
  ('kunlik-oqish-10', 'денег', 'денег', 'Pul (род.)', NULL),
  ('kunlik-oqish-10', 'поэтому', 'поэтому', 'Shuning uchun', NULL),
  ('kunlik-oqish-10', 'фруктов', 'фруктов', 'Mevalar (род.)', NULL),
  ('kunlik-oqish-10', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-10', 'встретился', 'встретился', 'Uchrashdim', NULL),
  ('kunlik-oqish-10', 'другом', 'другом', 'Do‘st bilan', NULL),
  ('kunlik-oqish-10', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-10', 'выпили', 'выпили', 'Ichdik', NULL),
  ('kunlik-oqish-10', 'кофе', 'кофе', 'Kofe', NULL),
  ('kunlik-oqish-10', 'чашки', 'чашки', 'Piyola (род.)', NULL),
  ('kunlik-oqish-10', 'мало', 'мало', 'Oz', NULL),
  ('kunlik-oqish-10', 'времени', 'времени', 'Vaqt (род.)', NULL),
  ('kunlik-oqish-10', 'экзамен', 'экзамен', 'Imtihon', NULL),
  ('kunlik-oqish-10', 'должен', 'должен', 'Majbur / kerak', NULL),
  ('kunlik-oqish-10', 'повторить', 'повторить', 'Takrorlamoq', NULL),
  ('kunlik-oqish-10', 'правила', 'правила', 'Qoidalar', NULL),
  ('kunlik-oqish-10', 'Удачи', 'удачи', 'Omad!', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (10, 0, 'Bir kilo olma necha turadi?', 'Сколько стоит килограмм яблок?'),
  (10, 1, 'Menda bir necha savol bor.', 'У меня есть несколько вопросов.'),
  (10, 2, 'U juda ko‘p pul sarflaydi.', 'Он тратит много денег.'),
  (10, 3, 'Kechirasiz, hozir vaqtim oz.', 'Извините, у меня сейчас мало времени.'),
  (10, 4, 'Konsert soat nechada? – Soat 6 da.', 'Во сколько концерт? – В 6 часов.'),
  (10, 5, 'Bu sumka 50 dollar turadi.', 'Эта сумка стоит 50 долларов.'),
  (10, 6, 'Sinfda yetarlicha stul bormi?', 'В классе достаточно стульев?'),
  (10, 7, 'Qancha vaqt kutish kerak? – Bir necha daqiqa.', 'Сколько времени ждать? – Несколько минут.'),
  (10, 8, 'Uning tug‘ilgan kuni soat 7 da boshlanadi.', 'Его день рождения начинается в 7 часов.'),
  (10, 9, 'Kechagi kino chiptasi 300 rubl edi.', 'Вчера билет в кино стоил 300 рублей.');
