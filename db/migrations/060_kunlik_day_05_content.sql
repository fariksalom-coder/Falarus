-- Kunlik kun 5: Kasblar (Профессии).

DELETE FROM public.daily_practice_prompts WHERE day_number = 5;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 5
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 5;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 5;

DELETE FROM public.daily_vocab_words WHERE day_number = 5;

DELETE FROM public.daily_grammar_matches WHERE day_number = 5;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 5;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 5;
DELETE FROM public.daily_grammar_topics WHERE day_number = 5;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  5,
  'Kasblar (Профессии) — «Кто вы по профессии?»',
  $theory$
Savollar: «Кто вы (по профессии)?» — siz kim bo‘lib ishlaysiz?; «Кем вы работаете?» — kim bo‘lib?; «Где вы работаете?» — qayerda?

Javob: Я + kasb (ном. падеж): Я врач., Я учитель., Я инженер.
Aniqroq: Я работаю + твор. падеж: Я работаю врачом., Я работаю учителем.

Ko‘p kasblar -тель bilan tugaydi; ayol shakli ko‘pincha -ница (-ка): учительница, студентка, программистка.

Ish joyi: «Где?» — предложный падеж (в больнице, на заводе, в школе).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (5, 'rule', 0, '«O‘qituvchi» rus tilida?', 'Врач', 'Инженер', 'Учитель', 'Водитель', 2),
  (5, 'rule', 1, 'Ayol shifokor uchun eng oddiy qaysi?', 'Врач', 'Врачиха', 'Врачница', 'Врачья', 0),
  (5, 'rule', 2, '«Where do you work?» rus tilida?', 'Кто вы?', 'Кем вы работаете?', 'Где вы работаете?', 'Что вы делаете?', 2),
  (5, 'rule', 3, 'To‘g‘ri: Я … (haydovchi sifatida)', 'работаю водителем', 'работаю водитель', 'работаю водителя', 'работаю водителе', 0),
  (5, 'rule', 4, 'Ayol o‘qituvchi?', 'учитель', 'учительница', 'учителка', 'учительша', 1),
  (5, 'rule', 5, '«Программист» ayol shakli?', 'программистка', 'программист', 'программистша', 'программистница', 0),
  (5, 'rule', 6, '«Кем вы работаете?» ga mos javob?', 'Я работаю на заводе.', 'Я инженер.', 'Я хорошо работаю.', 'Я работаю утром.', 1),
  (5, 'rule', 7, '«Где вы работаете?» ga mos javob?', 'Я врач.', 'Я работаю в больнице.', 'Я работаю с 9 до 18.', 'Я работаю хорошо.', 1),
  (5, 'rule', 8, 'Qaysi kasbda erkak/ayol shakli farqi aniqroq?', 'Водитель', 'Программист', 'Преподаватель', 'Студент', 2),
  (5, 'rule', 9, '«Muhandis» rus tilida?', 'Инженер', 'Экономист', 'Техник', 'Строитель', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (5, 0, 0, 'Врач', 'лечит людей'),
  (5, 0, 1, 'Учитель', 'учит детей в школе'),
  (5, 0, 2, 'Водитель', 'водит машину / автобус'),
  (5, 0, 3, 'Инженер', 'проектирует технику'),
  (5, 0, 4, 'Программист', 'программирует'),
  (5, 0, 5, 'Продавец', 'работает в магазине'),
  (5, 0, 6, 'Студент', 'учится'),
  (5, 0, 7, 'Преподаватель', 'работает в университете'),
  (5, 0, 8, 'Строитель', 'работает на стройке'),
  (5, 0, 9, 'Бухгалтер', 'считает деньги');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (5, 0, 'uz', '(я, студентка, университета)', ARRAY['Я', 'студентка', 'университета', 'врач', 'школы'], 'Я студентка университета'),
  (5, 1, 'uz', '(мой, брат, работает, инженером)', ARRAY['Мой', 'брат', 'работает', 'инженером', 'врачом', 'учится'], 'Мой брат работает инженером'),
  (5, 2, 'uz', '(кто, вы, профессии, по)', ARRAY['Кто', 'вы', 'по', 'профессии?', 'где', 'работаете'], 'Кто вы по профессии?'),
  (5, 3, 'uz', '(она, врач, работает, в, больница)', ARRAY['Она', 'врач', 'работает', 'в', 'больнице', 'больница'], 'Она врач, работает в больнице'),
  (5, 4, 'uz', '(мы, преподаватели, русского, языка)', ARRAY['Мы', 'преподаватели', 'русского', 'языка', 'учителя', 'школы'], 'Мы преподаватели русского языка'),
  (5, 5, 'uz', '(где, работает, твой, отец)', ARRAY['Где', 'работает', 'твой', 'отец?', 'мама', 'дома'], 'Где работает твой отец?'),
  (5, 6, 'uz', '(его, мама, продавщица)', ARRAY['Его', 'мама', '–', 'продавщица', 'врач', 'инженер'], 'Его мама – продавщица'),
  (5, 7, 'uz', '(это, программист, из, США)', ARRAY['Это', 'программист', 'из', 'США', 'Китая', 'врач'], 'Это программист из США'),
  (5, 8, 'uz', '(ты, хочешь, быть, кем)', ARRAY['Кем', 'ты', 'хочешь', 'быть?', 'кто', 'где'], 'Кем ты хочешь быть?'),
  (5, 9, 'uz', '(мой, друг, водитель, такси)', ARRAY['Мой', 'друг', '–', 'водитель', 'такси', 'машину'], 'Мой друг – водитель такси');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (5, 0, 'Kasb', 'Профессия'),
  (5, 1, 'Shifokor', 'Врач'),
  (5, 2, 'O‘qituvchi', 'Учитель / Преподаватель'),
  (5, 3, 'O‘qituvchi ayol', 'Учительница'),
  (5, 4, 'Muhandis', 'Инженер'),
  (5, 5, 'Dasturchi', 'Программист'),
  (5, 6, 'Haydovchi', 'Водитель'),
  (5, 7, 'Ishlamoq', 'Работать'),
  (5, 8, 'Ish', 'Работа'),
  (5, 9, 'Zavod', 'Завод'),
  (5, 10, 'Maktab', 'Школа'),
  (5, 11, 'Universitet', 'Университет'),
  (5, 12, 'Kasalxona', 'Больница'),
  (5, 13, 'Do‘kon', 'Магазин'),
  (5, 14, 'O‘qimoq', 'Учиться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  5,
  'Наша семья',
  $body$
Меня зовут Али. Мне 20 лет. Я студент. Я учусь в университете. Моя мама – врач. Она работает в больнице. Мой папа – инженер. Он работает на заводе. У меня есть старший брат. Он программист. Его работа – компьютеры. Моя младшая сестра – школьница. Она не работает. А кем работает моя бабушка? Моя бабушка – учительница. Раньше она работала в школе, а сейчас она на пенсии. Мы все любим свою работу.
$body$,
  'kunlik-oqish-05'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-05', 'Меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-05', 'зовут', 'зовут', 'Ism qo‘yiladi', NULL),
  ('kunlik-oqish-05', 'Али', 'али', 'Ali', NULL),
  ('kunlik-oqish-05', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-05', 'лет', 'лет', 'Yosh (20 лет)', NULL),
  ('kunlik-oqish-05', 'студент', 'студент', 'Talaba (erkak)', NULL),
  ('kunlik-oqish-05', 'Учусь', 'учусь', 'O‘qiyman', NULL),
  ('kunlik-oqish-05', 'университете', 'университете', 'Universitetda', NULL),
  ('kunlik-oqish-05', 'Моя', 'моя', 'Mening (ayol)', NULL),
  ('kunlik-oqish-05', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-05', 'врач', 'врач', 'Shifokor', NULL),
  ('kunlik-oqish-05', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-05', 'работает', 'работает', 'Ishlaydi', NULL),
  ('kunlik-oqish-05', 'больнице', 'больнице', 'Kasalxonada', NULL),
  ('kunlik-oqish-05', 'Мой', 'мой', 'Mening (erkak)', NULL),
  ('kunlik-oqish-05', 'папа', 'папа', 'Dada', NULL),
  ('kunlik-oqish-05', 'инженер', 'инженер', 'Muhandis', NULL),
  ('kunlik-oqish-05', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-05', 'заводе', 'заводе', 'Zavodda', NULL),
  ('kunlik-oqish-05', 'старший', 'старший', 'Katta (aka)', NULL),
  ('kunlik-oqish-05', 'брат', 'брат', 'Aka', NULL),
  ('kunlik-oqish-05', 'программист', 'программист', 'Dasturchi', NULL),
  ('kunlik-oqish-05', 'Его', 'его', 'Uning (erkak)', NULL),
  ('kunlik-oqish-05', 'работа', 'работа', 'Ish', NULL),
  ('kunlik-oqish-05', 'компьютеры', 'компьютеры', 'Kompyuterlar', NULL),
  ('kunlik-oqish-05', 'младшая', 'младшая', 'Kichik (singil)', NULL),
  ('kunlik-oqish-05', 'сестра', 'сестра', 'Singil', NULL),
  ('kunlik-oqish-05', 'школьница', 'школьница', 'Maktab o‘quvchisi (qiz)', NULL),
  ('kunlik-oqish-05', 'не', 'не', 'Yo‘q (inkor)', NULL),
  ('kunlik-oqish-05', 'бабушка', 'бабушка', 'Buvi', NULL),
  ('kunlik-oqish-05', 'учительница', 'учительница', 'O‘qituvchi (ayol)', NULL),
  ('kunlik-oqish-05', 'Раньше', 'раньше', 'Ilgari', NULL),
  ('kunlik-oqish-05', 'работала', 'работала', 'Ishlagan (ayol)', NULL),
  ('kunlik-oqish-05', 'школе', 'школе', 'Maktabda', NULL),
  ('kunlik-oqish-05', 'сейчас', 'сейчас', 'Hozir', NULL),
  ('kunlik-oqish-05', 'пенсии', 'пенсии', 'Nafaqada', NULL),
  ('kunlik-oqish-05', 'любим', 'любим', 'Sevamiz', NULL),
  ('kunlik-oqish-05', 'свою', 'свою', 'O‘zimizning (ayol/vin.)', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (5, 0, 'Siz kim bo‘lib ishlaysiz?', 'Кем вы работаете?'),
  (5, 1, 'Men haydovchiman.', 'Я водитель.'),
  (5, 2, 'Uning otasi muhandis.', 'Его отец – инженер.'),
  (5, 3, 'Ular qayerda ishlaydilar?', 'Где они работают?'),
  (5, 4, 'Bizning oilamizda ikki shifokor bor.', 'В нашей семье два врача.'),
  (5, 5, 'Sizning singlingiz o‘qituvchimi?', 'Ваша сестра учительница?'),
  (5, 6, 'Yo‘q, u hali talaba.', 'Нет, она ещё студентка.'),
  (5, 7, 'Men sizning kasbingizni bilmayman.', 'Я не знаю вашу профессию.'),
  (5, 8, 'Uning ukasi dasturchi bo‘lib ishlaydi.', 'Его брат работает программистом.'),
  (5, 9, 'Men kollejda o‘qituvchi bo‘lib ishlayman.', 'Я работаю учителем в колледже.');
