-- Kunlik kun 7: Takrorlash (darslar 1–6).

DELETE FROM public.daily_practice_prompts WHERE day_number = 7;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 7
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 7;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 7;

DELETE FROM public.daily_vocab_words WHERE day_number = 7;

DELETE FROM public.daily_grammar_matches WHERE day_number = 7;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 7;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 7;
DELETE FROM public.daily_grammar_topics WHERE day_number = 7;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  7,
  'Takrorlash — Dars 1–6 (Обобщение пройденного материала)',
  $theory$
Qisqa takrorlash:

• Salomlashish / xayrlashish — vaqt va hurmat (Доброе утро!, Здравствуйте!, Привет! / До свидания!, Пока!) — kun 1.

• Qanday ahvol? — Как дела? / Извините, Спасибо… — kun 2.

• Ism: Как вас зовут? – Меня зовут… — kun 2.

• Qayerdan / millat — Откуда? – Я из… + род.п.; Я узбек / узбечка — kun 3.

• Sonlar 1–10, ko‘plik (-ы/-и/-а/-я), много/мало + род. мн. — kun 4.

• Kasblar — Кто вы? / Кем работаете? – Я врач.; Где работаете? — в/на + предл. — kun 5.

• Oila va egalik — мой/моя/его/наш…; У меня есть / нет + род. — kun 6.

Bu kun — yuqoridagi mavzularni birlashtiruvchi mashqlar.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (7, 'rule', 0, '«Xayrli kun» rus tilida qanday?', 'Доброе утро', 'Добрый день', 'Добрый вечер', 'Доброй ночи', 1),
  (7, 'rule', 1, '«Otangiz qayerda ishlaydi?» rus tilida?', 'Где работает ваш папа?', 'Кем работает ваш папа?', 'Сколько работает ваш папа?', 'Откуда ваш папа?', 0),
  (7, 'rule', 2, 'Qaysi variantda son va ot mos?', 'три окно', 'четыре стула', 'пять книга', 'два словаря', 1),
  (7, 'rule', 3, '«Mening ukam» rus tilida?', 'Моя брат', 'Мой брат', 'Мои брат', 'Моё брат', 1),
  (7, 'rule', 4, '«Нет» dan keyin to‘g‘ri kelishgan gap?', 'У меня нет книга.', 'У меня нет времени.', 'У меня нет словарь.', 'У меня нет ручка.', 1),
  (7, 'rule', 5, '«U qiz — amerikalik» rus tilida?', 'Она американец.', 'Она американка.', 'Она Америка.', 'Она из Америка.', 1),
  (7, 'rule', 6, '«Sizning ismingiz nima?» (rasmiy)?', 'Как тебя зовут?', 'Как вас зовут?', 'Какое ваше имя?', 'Как ваше имя?', 1),
  (7, 'rule', 7, '«Ko‘p talabalar» rus tilida?', 'много студент', 'много студента', 'много студентов', 'много студенты', 2),
  (7, 'rule', 8, '«Uning otasi muhandis» rus tilida?', 'Его отец инженер.', 'Его папа инженер.', 'Их отец инженер.', 'Наш отец инженер.', 0),
  (7, 'rule', 9, '«Сколько вам лет?» ga javob?', 'Мне 20 годов.', 'У меня 20 лет.', 'Мне 20 лет.', 'Я 20 лет.', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (7, 0, 0, 'Извините', 'Kechirasiz'),
  (7, 0, 1, 'Десять', 'O‘n'),
  (7, 0, 2, 'Программист', 'Dasturchi'),
  (7, 0, 3, 'Откуда?', 'Qayerdan?'),
  (7, 0, 4, 'Врач', 'Shifokor'),
  (7, 0, 5, 'Младший брат', 'Kichik uka'),
  (7, 0, 6, 'Пока', 'Xayr'),
  (7, 0, 7, 'Работать', 'Ishlamoq'),
  (7, 0, 8, 'Окна', 'Derazalar'),
  (7, 0, 9, 'Учительница', 'O‘qituvchi ayol');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (7, 0, 'uz', '(зовут, меня, Азиза)', ARRAY['Меня', 'зовут', 'Азиза', 'Привет', 'из'], 'Меня зовут Азиза'),
  (7, 1, 'uz', '(вы, откуда)', ARRAY['Откуда', 'вы?', 'ты?', 'Здравствуйте'], 'Откуда вы?'),
  (7, 2, 'uz', '(у, меня, есть, два, брата)', ARRAY['У', 'меня', 'есть', 'два', 'брата', 'нет', 'книги'], 'У меня есть два брата'),
  (7, 3, 'uz', '(мой, папа, водитель)', ARRAY['Мой', 'папа', '–', 'водитель', 'мама', 'врач'], 'Мой папа – водитель'),
  (7, 4, 'uz', '(она, работает, в, больница)', ARRAY['Она', 'работает', 'в', 'больнице', 'школе', 'инженер'], 'Она работает в больнице'),
  (7, 5, 'uz', '(сколько, у, вас, детей)', ARRAY['Сколько', 'у', 'вас', 'детей?', 'есть', 'книг'], 'Сколько у вас детей?'),
  (7, 6, 'uz', '(это, наш, университет)', ARRAY['Это', 'наш', 'университет', 'ваша', 'группа'], 'Это наш университет'),
  (7, 7, 'uz', '(моя, сестра, не, работает)', ARRAY['Моя', 'сестра', 'не', 'работает', 'учится', 'брат'], 'Моя сестра не работает'),
  (7, 8, 'uz', '(у, них, нет, машины)', ARRAY['У', 'них', 'нет', 'машины', 'есть', 'времени'], 'У них нет машины'),
  (7, 9, 'uz', '(как, дела, у, тебя)', ARRAY['Как', 'у', 'тебя', 'дела?', 'дела', 'зовут'], 'Как у тебя дела?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (7, 0, 'Tong', 'Утро'),
  (7, 1, 'Kechirasiz', 'Извините'),
  (7, 2, 'Qayerdan?', 'Откуда?'),
  (7, 3, 'Ikki', 'Два'),
  (7, 4, 'Talaba (qiz)', 'Студентка'),
  (7, 5, 'Shifokor', 'Врач'),
  (7, 6, 'Oila', 'Семья'),
  (7, 7, 'Aka', 'Брат'),
  (7, 8, 'O‘qituvchi (ayol)', 'Учительница'),
  (7, 9, 'Kitob', 'Книга'),
  (7, 10, 'Vaqt', 'Время'),
  (7, 11, 'Ko‘p', 'Много'),
  (7, 12, 'Ishlamoq', 'Работать'),
  (7, 13, 'Mening', 'Мой'),
  (7, 14, 'Sizning', 'Ваш');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  7,
  'Моя семья и друг',
  $body$
Привет! Меня зовут Диёр. Мне 20 лет. Я из Узбекистана. Я студент. Я учусь в университете в Москве. Моя семья живёт в Ташкенте.

У меня большая семья. Мою маму зовут Нигора. Она врач. Она работает в больнице. Моего папу зовут Ботир. Он инженер. Папа работает на заводе. У меня есть старший брат и младшая сестра. Брата зовут Сардор. Он программист. Он работает в офисе. Сестру зовут Лола. Она школьница. Ей 12 лет.

Мой лучший друг – Антон. Он из России, из Москвы. Антон – русский. Он тоже студент. Мы учимся вместе. У Антона есть мама, папа и дедушка. Его папа – водитель такси. Мама – учительница.

– Антон, сколько у тебя друзей?
– У меня пять друзей: два узбека, два китайца и один американец.
– А твоя бабушка работает?
– Нет, она на пенсии. Она любит читать книги.
– Отлично! Пока, Антон!
– До свидания, Диёр!
$body$,
  'kunlik-oqish-07'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-07', 'Привет', 'привет', 'Salom', NULL),
  ('kunlik-oqish-07', 'Меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-07', 'зовут', 'зовут', 'Ism qo‘yiladi', NULL),
  ('kunlik-oqish-07', 'Диёр', 'диер', 'Diyor', NULL),
  ('kunlik-oqish-07', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-07', 'лет', 'лет', 'Yosh', NULL),
  ('kunlik-oqish-07', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-07', 'из', 'из', '...dan', NULL),
  ('kunlik-oqish-07', 'Узбекистана', 'узбекистана', 'O‘zbekistondan', NULL),
  ('kunlik-oqish-07', 'студент', 'студент', 'Talaba', NULL),
  ('kunlik-oqish-07', 'учусь', 'учусь', 'O‘qiyman', NULL),
  ('kunlik-oqish-07', 'университете', 'университете', 'Universitetda', NULL),
  ('kunlik-oqish-07', 'Москве', 'москве', 'Moskvada', NULL),
  ('kunlik-oqish-07', 'Моя', 'моя', 'Mening (ayol)', NULL),
  ('kunlik-oqish-07', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-07', 'живёт', 'живёт', 'Yashaydi', NULL),
  ('kunlik-oqish-07', 'Ташкенте', 'ташкенте', 'Toshkentda', NULL),
  ('kunlik-oqish-07', 'У', 'у', 'Menda / bor', NULL),
  ('kunlik-oqish-07', 'большая', 'большая', 'Katta', NULL),
  ('kunlik-oqish-07', 'Мою', 'мою', 'Onamni (vin.)', NULL),
  ('kunlik-oqish-07', 'маму', 'маму', 'Onani', NULL),
  ('kunlik-oqish-07', 'Нигора', 'нигора', 'Nigora', NULL),
  ('kunlik-oqish-07', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-07', 'врач', 'врач', 'Shifokor', NULL),
  ('kunlik-oqish-07', 'работает', 'работает', 'Ishlaydi', NULL),
  ('kunlik-oqish-07', 'больнице', 'больнице', 'Kasalxonada', NULL),
  ('kunlik-oqish-07', 'Моего', 'моего', 'Mening (rod.)', NULL),
  ('kunlik-oqish-07', 'папу', 'папу', 'Dadamni', NULL),
  ('kunlik-oqish-07', 'Ботир', 'ботир', 'Botir', NULL),
  ('kunlik-oqish-07', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-07', 'инженер', 'инженер', 'Muhandis', NULL),
  ('kunlik-oqish-07', 'Папа', 'папа', 'Dada', NULL),
  ('kunlik-oqish-07', 'заводе', 'заводе', 'Zavodda', NULL),
  ('kunlik-oqish-07', 'есть', 'есть', 'Bor', NULL),
  ('kunlik-oqish-07', 'старший', 'старший', 'Katta (aka)', NULL),
  ('kunlik-oqish-07', 'брат', 'брат', 'Aka', NULL),
  ('kunlik-oqish-07', 'младшая', 'младшая', 'Kichik (singil)', NULL),
  ('kunlik-oqish-07', 'сестра', 'сестра', 'Singil', NULL),
  ('kunlik-oqish-07', 'Брата', 'брата', 'Akani', NULL),
  ('kunlik-oqish-07', 'Сардор', 'сардор', 'Sardor', NULL),
  ('kunlik-oqish-07', 'программист', 'программист', 'Dasturchi', NULL),
  ('kunlik-oqish-07', 'офисе', 'офисе', 'Ofisda', NULL),
  ('kunlik-oqish-07', 'Сестру', 'сестру', 'Singilni', NULL),
  ('kunlik-oqish-07', 'Лола', 'лола', 'Lola', NULL),
  ('kunlik-oqish-07', 'школьница', 'школьница', 'Maktab o‘quvchisi', NULL),
  ('kunlik-oqish-07', 'Ей', 'ей', 'Unga (ayol)', NULL),
  ('kunlik-oqish-07', 'Мой', 'мой', 'Mening (erkak)', NULL),
  ('kunlik-oqish-07', 'лучший', 'лучший', 'Eng yaxshi', NULL),
  ('kunlik-oqish-07', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-07', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-07', 'России', 'россии', 'Rossiyadan', NULL),
  ('kunlik-oqish-07', 'Москвы', 'москвы', 'Moskvadan', NULL),
  ('kunlik-oqish-07', 'русский', 'русский', 'Rus', NULL),
  ('kunlik-oqish-07', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-07', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-07', 'учимся', 'учимся', 'O‘qiymiz', NULL),
  ('kunlik-oqish-07', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-07', 'Антона', 'антона', 'Antonning', NULL),
  ('kunlik-oqish-07', 'мама', 'мама', 'Onasi', NULL),
  ('kunlik-oqish-07', 'дедушка', 'дедушка', 'Bobosi', NULL),
  ('kunlik-oqish-07', 'Его', 'его', 'Uning', NULL),
  ('kunlik-oqish-07', 'водитель', 'водитель', 'Haydovchi', NULL),
  ('kunlik-oqish-07', 'такси', 'такси', 'Taksi', NULL),
  ('kunlik-oqish-07', 'учительница', 'учительница', 'O‘qituvchi ayol', NULL),
  ('kunlik-oqish-07', 'Сколько', 'сколько', 'Qancha', NULL),
  ('kunlik-oqish-07', 'тебя', 'тебя', 'Seni', NULL),
  ('kunlik-oqish-07', 'друзей', 'друзей', 'Do‘stlar (род.)', NULL),
  ('kunlik-oqish-07', 'пять', 'пять', 'Besh', NULL),
  ('kunlik-oqish-07', 'два', 'два', 'Ikki', NULL),
  ('kunlik-oqish-07', 'узбека', 'узбека', 'O‘zbek (род.)', NULL),
  ('kunlik-oqish-07', 'китайца', 'китайца', 'Xitoylik (род.)', NULL),
  ('kunlik-oqish-07', 'один', 'один', 'Bir', NULL),
  ('kunlik-oqish-07', 'американец', 'американец', 'Amerikalik', NULL),
  ('kunlik-oqish-07', 'твоя', 'твоя', 'Seniki (ayol)', NULL),
  ('kunlik-oqish-07', 'бабушка', 'бабушка', 'Buvi', NULL),
  ('kunlik-oqish-07', 'Нет', 'нет', 'Yo‘q', NULL),
  ('kunlik-oqish-07', 'пенсии', 'пенсии', 'Nafaqada', NULL),
  ('kunlik-oqish-07', 'любит', 'любит', 'Yaxshi ko‘radi', NULL),
  ('kunlik-oqish-07', 'читать', 'читать', 'O‘qish', NULL),
  ('kunlik-oqish-07', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-07', 'Отлично', 'отлично', 'Ajoyib', NULL),
  ('kunlik-oqish-07', 'Пока', 'пока', 'Xayr', NULL),
  ('kunlik-oqish-07', 'До', 'до', 'Ko‘rishguncha', NULL),
  ('kunlik-oqish-07', 'свидания', 'свидания', '(до свидания)', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (7, 0, 'Kechirasiz, siz talabamisiz?', 'Извините, вы студент?'),
  (7, 1, 'Mening singlim o‘qituvchi.', 'Моя сестра – учительница.'),
  (7, 2, 'Ular qayerdan? – Ular Xitoydan.', 'Откуда они? – Они из Китая.'),
  (7, 3, 'Bizning guruhda 10 talaba bor.', 'В нашей группе 10 студентов.'),
  (7, 4, 'Uning akasi ishlamaydi, u hali maktab o‘quvchisi.', 'Его брат не работает, он ещё школьник.'),
  (7, 5, 'Sizning itingiz bormi?', 'У вас есть собака?'),
  (7, 6, 'Uyimizda uchta xona bor.', 'В нашем доме три комнаты.'),
  (7, 7, 'Ular qayerda ishlaydilar? – Ular zavodda ishlaydilar.', 'Где они работают? – Они работают на заводе.'),
  (7, 8, 'Qancha vaqtingiz bor? – Menda oz vaqt bor.', 'Сколько у вас времени? – У меня мало времени.'),
  (7, 9, 'Uning ismi nima? – Uni ismi Alisher.', 'Как его зовут? – Его зовут Алишер.');
