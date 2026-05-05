-- Kunlik kun 9: 11–20, «Сколько?», ko‘plik istisnolari.

DELETE FROM public.daily_practice_prompts WHERE day_number = 9;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 9
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 9;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 9;

DELETE FROM public.daily_vocab_words WHERE day_number = 9;

DELETE FROM public.daily_grammar_matches WHERE day_number = 9;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 9;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 9;
DELETE FROM public.daily_grammar_topics WHERE day_number = 9;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  9,
  'Sonlar 11–20 va «Сколько?»',
  $theory$
11–20: одиннадцать, двенадцать, тринадцать, четырнадцать, пятнадцать, шестнадцать, семнадцать, восемнадцать, девятнадцать, двадцать.

Qoida (11–19): asosiy raqam + -надцать (tri → тринадцать). Urg‘u odatda birinchi bo‘g‘inda (одиннадцать — istisno: ikkinchi bo‘g‘inda).

Ko‘plik istisnolari: брат → братья; друг → друзья; сын → сыновья; человек → люди; ребёнок → дети; мать → матери; дочь → дочери.

«Сколько?» javobi: son + ot (roditelniy). 1 → имен. ед.; 2–4 → род. ед.; 5–20 → род. мн.: два брата; пять братьев; десять детей.

Misollar: Сколько у тебя братьев? — У меня два брата / пять братьев. Сколько детей в классе? — Десять детей.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (9, 'rule', 0, '«O‘n uch» rus tilida?', 'Тринадцать', 'Тридцать', 'Три', 'Третий', 0),
  (9, 'rule', 1, '«Восемнадцать» — bu necha?', '17', '18', '19', '20', 1),
  (9, 'rule', 2, '«Yigirma» rus tilida?', 'Двенадцать', 'Двадцать', 'Два', 'Девятнадцать', 1),
  (9, 'rule', 3, '10 ta do‘st — qaysi variant to‘g‘ri?', 'десять друг', 'десять друга', 'десять друзей', 'десять друзья', 2),
  (9, 'rule', 4, '«У меня есть два …» (aka)?', 'брат', 'брата', 'братьев', 'братья', 1),
  (9, 'rule', 5, '«Odamlar» ma’nosi?', 'дети', 'люди', 'человеки', 'человек', 1),
  (9, 'rule', 6, '«Сколько тебе лет?» — 13 yosh?', 'Мне тринадцать лет.', 'Мне тридцать лет.', 'Мне три года.', 'Мне тринадцать годов.', 0),
  (9, 'rule', 7, '4 nafar o‘g‘il — qaysi gap to‘g‘ri?', 'четыре сына', 'четыре сыновья', 'четыре сыновей', 'четыре сыны', 0),
  (9, 'rule', 8, '«У Антона много …» (do‘st)?', 'друг', 'друга', 'друзей', 'друзья', 2),
  (9, 'rule', 9, '«Четырнадцать» va «сорок»?', '14 va 40', '14 va 14', '40 va 14', '40 va 40', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (9, 0, 0, '11', 'Одиннадцать'),
  (9, 0, 1, '13', 'Тринадцать'),
  (9, 0, 2, '15', 'Пятнадцать'),
  (9, 0, 3, '18', 'Восемнадцать'),
  (9, 0, 4, '20', 'Двадцать'),
  (9, 0, 5, '14', 'Четырнадцать'),
  (9, 0, 6, '12', 'Двенадцать'),
  (9, 0, 7, '16', 'Шестнадцать'),
  (9, 0, 8, '19', 'Девятнадцать'),
  (9, 0, 9, '17', 'Семнадцать');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (9, 0, 'uz', '(у, меня, есть, два, друг)', ARRAY['У', 'меня', 'есть', 'два', 'друга.', 'друзей', 'нет'], 'У меня есть два друга.'),
  (9, 1, 'uz', '(сколько, у, вас, сыновей)', ARRAY['Сколько', 'у', 'вас', 'сыновей?', 'детей', 'есть'], 'Сколько у вас сыновей?'),
  (9, 2, 'uz', '(в, группе, 15, студент)', ARRAY['В', 'группе', '15', 'студентов.', 'студента', 'один'], 'В группе 15 студентов.'),
  (9, 3, 'uz', '(у, неё, нет, братьев)', ARRAY['У', 'неё', 'нет', 'братьев.', 'есть', 'сестёр'], 'У неё нет братьев.'),
  (9, 4, 'uz', '(на, улице, много, человек)', ARRAY['На', 'улице', 'много', 'людей.', 'человек', 'ребёнок'], 'На улице много людей.'),
  (9, 5, 'uz', '(это, мои, друзья)', ARRAY['Это', 'мои', 'друзья.', 'мой', 'друг'], 'Это мои друзья.'),
  (9, 6, 'uz', '(ей, 20, лет)', ARRAY['Ей', '20', 'лет.', 'Мне', 'год'], 'Ей 20 лет.'),
  (9, 7, 'uz', '(у, Антона, трое, детей)', ARRAY['У', 'Антона', 'трое', 'детей.', 'два', 'сыновей'], 'У Антона трое детей.'),
  (9, 8, 'uz', '(в, классе, 12, девочка)', ARRAY['В', 'классе', '12', 'девочек.', 'девочки', 'одна'], 'В классе 12 девочек.'),
  (9, 9, 'uz', '(сколько, стоит, эта, ручка)', ARRAY['Сколько', 'стоит', 'эта', 'ручка?', 'книга', 'дорого'], 'Сколько стоит эта ручка?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (9, 0, 'O‘n bir', 'Одиннадцать'),
  (9, 1, 'O‘n ikki', 'Двенадцать'),
  (9, 2, 'O‘n uch', 'Тринадцать'),
  (9, 3, 'O‘n to‘rt', 'Четырнадцать'),
  (9, 4, 'O‘n besh', 'Пятнадцать'),
  (9, 5, 'O‘n olti', 'Шестнадцать'),
  (9, 6, 'O‘n yetti', 'Семнадцать'),
  (9, 7, 'O‘n sakkiz', 'Восемнадцать'),
  (9, 8, 'O‘n to‘qqiz', 'Девятнадцать'),
  (9, 9, 'Yigirma', 'Двадцать'),
  (9, 10, 'Do‘stlar', 'Друзья'),
  (9, 11, 'Odamlar', 'Люди'),
  (9, 12, 'Bolalar', 'Дети'),
  (9, 13, 'Aka-ukalar', 'Братья'),
  (9, 14, 'Qancha? Nechta?', 'Сколько?');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  9,
  'Наш класс',
  $body$
В нашем классе учатся 20 студентов. Среди них 12 девушек и 8 юношей. У меня есть два лучших друга: Сергей и Алишер. Сергей – русский, а Алишер – узбек. У Сергея есть старший брат и младшая сестра. Его брата зовут Иван. Ивану 25 лет, он инженер. Сестру зовут Оля. Ей четырнадцать лет, она школьница. У Алишера большая семья. У него три брата и две сестры.

А сколько детей в вашей семье?

– В моей семье пять человек: мама, папа, я, брат и сестра.

Отлично!
$body$,
  'kunlik-oqish-09'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-09', 'В', 'в', '...da', NULL),
  ('kunlik-oqish-09', 'нашем', 'нашем', 'Bizning (predlog bilan)', NULL),
  ('kunlik-oqish-09', 'классе', 'классе', 'Sinfda', NULL),
  ('kunlik-oqish-09', 'учатся', 'учатся', 'O‘qiydi (ko‘plik)', NULL),
  ('kunlik-oqish-09', 'студентов', 'студентов', 'Talabalar (род. мн.)', NULL),
  ('kunlik-oqish-09', 'Среди', 'среди', 'Orasida', NULL),
  ('kunlik-oqish-09', 'них', 'них', 'Ular (род.)', NULL),
  ('kunlik-oqish-09', 'девушек', 'девушек', 'Qizlar (род. мн.)', NULL),
  ('kunlik-oqish-09', 'юношей', 'юношей', 'Yigitlar (род. мн.)', NULL),
  ('kunlik-oqish-09', 'У', 'у', '...da borlik', NULL),
  ('kunlik-oqish-09', 'меня', 'меня', 'Men (род.)', NULL),
  ('kunlik-oqish-09', 'есть', 'есть', 'Bor', NULL),
  ('kunlik-oqish-09', 'два', 'два', 'Ikki', NULL),
  ('kunlik-oqish-09', 'лучших', 'лучших', 'Eng yaxshi (род. мн.)', NULL),
  ('kunlik-oqish-09', 'друга', 'друга', 'Do‘st (род.; 2 uchun)', NULL),
  ('kunlik-oqish-09', 'русский', 'русский', 'Rus (millat)', NULL),
  ('kunlik-oqish-09', 'узбек', 'узбек', 'O‘zbek', NULL),
  ('kunlik-oqish-09', 'Сергея', 'сергея', 'Sergeyning', NULL),
  ('kunlik-oqish-09', 'старший', 'старший', 'Katta', NULL),
  ('kunlik-oqish-09', 'брат', 'брат', 'Aka', NULL),
  ('kunlik-oqish-09', 'младшая', 'младшая', 'Kichik', NULL),
  ('kunlik-oqish-09', 'сестра', 'сестра', 'Singil', NULL),
  ('kunlik-oqish-09', 'Его', 'его', 'Uning', NULL),
  ('kunlik-oqish-09', 'брата', 'брата', 'Akani', NULL),
  ('kunlik-oqish-09', 'зовут', 'зовут', 'Chaqirishadi', NULL),
  ('kunlik-oqish-09', 'лет', 'лет', 'Yosh (bilan)', NULL),
  ('kunlik-oqish-09', 'инженер', 'инженер', 'Muhandis', NULL),
  ('kunlik-oqish-09', 'Алишера', 'алишера', 'Alisherning', NULL),
  ('kunlik-oqish-09', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-09', 'Алишер', 'алишер', 'Alisher', NULL),
  ('kunlik-oqish-09', 'Сергей', 'сергей', 'Sergey', NULL),
  ('kunlik-oqish-09', 'людей', 'людей', 'Odamlar (род.)', NULL),
  ('kunlik-oqish-09', 'Отлично', 'отлично', 'Ajoyib!', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (9, 0, 'Sinfingizda nechta o‘quvchi bor?', 'Сколько учеников в вашем классе?'),
  (9, 1, 'Mening o‘n besh yoshli singlim bor.', 'У меня есть пятнадцатилетняя сестра.'),
  (9, 2, 'Uning nechta ukasi bor? – Uning uchta ukasi bor.', 'Сколько у него братьев? – У него три брата.'),
  (9, 3, 'Kechirasiz, soat necha?', 'Извините, который час?'),
  (9, 4, 'Bu sumka qancha turadi?', 'Сколько стоит эта сумка?'),
  (9, 5, 'Mening ko‘p do‘stlarim bor.', 'У меня много друзей.'),
  (9, 6, 'Uning ikkita farzandi bor: bir o‘g‘il va bir qiz.', 'У него двое детей: один сын и одна дочь.'),
  (9, 7, 'Kechagi konsertda yigirma kishi qatnashdi.', 'На вчерашнем концерте участвовало двадцать человек.'),
  (9, 8, 'Mening akamning o‘n to‘rt yoshida.', 'Моему брату четырнадцать лет.'),
  (9, 9, 'Sizning oilangizda necha kishi bor?', 'Сколько человек в вашей семье?');
