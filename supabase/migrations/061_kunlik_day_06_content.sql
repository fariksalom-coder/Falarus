-- Kunlik kun 6: Oila va egalik olmoshlari.

DELETE FROM public.daily_practice_prompts WHERE day_number = 6;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 6
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 6;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 6;

DELETE FROM public.daily_vocab_words WHERE day_number = 6;

DELETE FROM public.daily_grammar_matches WHERE day_number = 6;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 6;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 6;
DELETE FROM public.daily_grammar_topics WHERE day_number = 6;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  6,
  'Oila va egalik olmoshlari (Семья и притяжательные местоимения)',
  $theory$
1.1. Egalik olmoshlari: мой/моя/моё/мои; твой/твоя; ваш/ваша/ваше; его/её (o‘zgarmaydi); наш/наша; их (o‘zgarmaydi).

1.2. Oila: мать (мама), отец (папа), брат, сестра, дочь, сын, бабушка, дедушка, родители.

Savollar: У кого есть кто? — У меня есть брат. Сколько? — У меня две сестры. Чей? — Это книга брата.

1.3. «У меня есть + kim/nima»: У меня есть машина., У неё нет брата., У вас есть словарь?
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (6, 'rule', 0, '«Mening onam» rus tilida?', 'Моя мать', 'Мой мать', 'Моё мать', 'Мои мать', 0),
  (6, 'rule', 1, '«Ваш брат» qachon?', 'sening ukang', 'uning ukasi', 'sizning ukangiz', 'bizning ukamiz', 2),
  (6, 'rule', 2, '… отец работает на заводе. (uning otasi)', 'Его', 'Её', 'Их', 'Наш', 0),
  (6, 'rule', 3, 'Mening qalamlarim?', 'мой карандаши', 'мои карандаши', 'моя карандаши', 'моё карандаши', 1),
  (6, 'rule', 4, '«У меня есть сестра» — bu …', 'У меня есть брат.', 'У меня нет сестры.', 'У меня есть сестра.', 'У меня был сестра.', 2),
  (6, 'rule', 5, 'Qaysi qatorda xato?', 'их дом', 'её книга', 'наш дети', 'мой город', 2),
  (6, 'rule', 6, '«Сын» ko‘pligi?', 'сыны', 'сыновья', 'сына', 'сыни', 1),
  (6, 'rule', 7, '«Чья это сумка?» — javob?', 'Это мой сумка.', 'Это моя сумка.', 'Это моё сумка.', 'Это мои сумка.', 1),
  (6, 'rule', 8, '«У него нет машины» tarjimasi?', 'У него есть машина.', 'У него нет машины.', 'У него не было машины.', 'У него будет машина.', 1),
  (6, 'rule', 9, '«Sizning farzandingiz bormi?» (umumiy)', 'У вас есть дети?', 'У вас есть ребёнок?', 'Ваш ребёнок есть?', 'У вас дети есть?', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (6, 0, 0, 'Моя', 'моя семья'),
  (6, 0, 1, 'Твой', 'твой друг'),
  (6, 0, 2, 'Наша', 'наша группа'),
  (6, 0, 3, 'Её', 'её работа'),
  (6, 0, 4, 'Их', 'их дом'),
  (6, 0, 5, 'Ваше', 'ваше письмо'),
  (6, 0, 6, 'Наш', 'наш класс'),
  (6, 0, 7, 'Мои', 'мои книги'),
  (6, 0, 8, 'Твоя', 'твоя сестра'),
  (6, 0, 9, 'Его', 'его отец');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (6, 0, 'uz', '(у, меня, есть, старший, брат)', ARRAY['У', 'меня', 'есть', 'старший', 'брат', 'сестра', 'нет'], 'У меня есть старший брат'),
  (6, 1, 'uz', '(моя, мама, врач)', ARRAY['Моя', 'мама', '–', 'врач', 'папа', 'учитель'], 'Моя мама – врач'),
  (6, 2, 'uz', '(у, него, нет, сестры)', ARRAY['У', 'него', 'нет', 'сестры', 'есть', 'брата'], 'У него нет сестры'),
  (6, 3, 'uz', '(чей, это, словарь)', ARRAY['Чей', 'это', 'словарь?', 'чья', 'книга'], 'Чей это словарь?'),
  (6, 4, 'uz', '(наши, родители, дома)', ARRAY['Наши', 'родители', 'дома', 'домой', 'наш', 'мама'], 'Наши родители дома'),
  (6, 5, 'uz', '(у, них, двое, детей)', ARRAY['У', 'них', 'двое', 'детей', 'один', 'нет'], 'У них двое детей'),
  (6, 6, 'uz', '(это, их, собака)', ARRAY['Это', 'их', 'собака', 'моя', 'кот'], 'Это их собака'),
  (6, 7, 'uz', '(ваша, семья, большая)', ARRAY['Ваша', 'семья', 'большая', 'маленькая', 'мой', 'дом'], 'Ваша семья большая'),
  (6, 8, 'uz', '(у, неё, красивая, улыбка)', ARRAY['У', 'неё', 'красивая', 'улыбка', 'нет', 'дом'], 'У неё красивая улыбка'),
  (6, 9, 'uz', '(мой, друг, любит, свою, работу)', ARRAY['Мой', 'друг', 'любит', 'свою', 'работу', 'не'], 'Мой друг любит свою работу');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (6, 0, 'Oila', 'Семья'),
  (6, 1, 'Ota-ona', 'Родители'),
  (6, 2, 'Ona (ayol)', 'Мама'),
  (6, 3, 'Ota (erkak)', 'Папа'),
  (6, 4, 'Aka / uka', 'Брат'),
  (6, 5, 'Opa / singil', 'Сестра'),
  (6, 6, 'Buvim', 'Моя бабушка'),
  (6, 7, 'Bobom', 'Мой дедушка'),
  (6, 8, 'Farzand', 'Ребёнок'),
  (6, 9, 'Kichik (yosh)', 'Младший'),
  (6, 10, 'Katta (yosh)', 'Старший'),
  (6, 11, 'Uy hayvoni', 'Домашний питомец'),
  (6, 12, 'Birga yashamoq', 'Жить вместе'),
  (6, 13, 'Yosh', 'Год / лет'),
  (6, 14, 'Kishi (odam)', 'Человек');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  6,
  'Моя семья',
  $body$
Здравствуйте! Меня зовут Динара. Мне 22 года. Я хочу рассказать о своей семье. Моя семья небольшая, но дружная. У меня есть мама, папа и младший брат. Мою маму зовут Гульнара. Она работает продавцом в магазине. Моего папу зовут Рашид. Он водитель. А моего брата зовут Тимур. Он школьник. Ему 12 лет. У нас есть бабушка. Её зовут Зухра. Бабушка не работает, она на пенсии. Она любит читать книги. Это мои родители. А это наш домашний питомец – кот. Его зовут Барсик. Мы все живём вместе в одной квартире.
$body$,
  'kunlik-oqish-06'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-06', 'Здравствуйте', 'здравствуйте', 'Assalomu alaykum', NULL),
  ('kunlik-oqish-06', 'Меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-06', 'зовут', 'зовут', 'Ism qo‘yiladi', NULL),
  ('kunlik-oqish-06', 'Динара', 'динара', 'Dinara', NULL),
  ('kunlik-oqish-06', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-06', 'года', 'года', 'Yosh (22 года)', NULL),
  ('kunlik-oqish-06', 'хочу', 'хочу', 'Xohlayman', NULL),
  ('kunlik-oqish-06', 'рассказать', 'рассказать', 'Gapirish, hikoya qilish', NULL),
  ('kunlik-oqish-06', 'своей', 'своей', 'O‘zimning (ayol rod.)', NULL),
  ('kunlik-oqish-06', 'семье', 'семье', 'Oilada', NULL),
  ('kunlik-oqish-06', 'Моя', 'моя', 'Mening', NULL),
  ('kunlik-oqish-06', 'Мой', 'мой', 'Mening (erkak)', NULL),
  ('kunlik-oqish-06', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-06', 'небольшая', 'небольшая', 'Kichikroq', NULL),
  ('kunlik-oqish-06', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-06', 'дружная', 'дружная', 'Do‘stona', NULL),
  ('kunlik-oqish-06', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-06', 'папа', 'папа', 'Dada', NULL),
  ('kunlik-oqish-06', 'младший', 'младший', 'Kichik (aka/uka)', NULL),
  ('kunlik-oqish-06', 'брат', 'брат', 'Uka/aka', NULL),
  ('kunlik-oqish-06', 'Мою', 'мою', 'Mening (vin. ayol)', NULL),
  ('kunlik-oqish-06', 'Гульнара', 'гульнара', 'Gul‘nora', NULL),
  ('kunlik-oqish-06', 'Она', 'она', 'U', NULL),
  ('kunlik-oqish-06', 'продавцом', 'продавцом', 'Sotuvchi (kim?)', NULL),
  ('kunlik-oqish-06', 'магазине', 'магазине', 'Do‘konda', NULL),
  ('kunlik-oqish-06', 'Моего', 'моего', 'Mening (rod. erkak)', NULL),
  ('kunlik-oqish-06', 'Рашид', 'рашид', 'Rashid', NULL),
  ('kunlik-oqish-06', 'водитель', 'водитель', 'Haydovchi', NULL),
  ('kunlik-oqish-06', 'Тимур', 'тимур', 'Timur', NULL),
  ('kunlik-oqish-06', 'школьник', 'школьник', 'Maktab o‘quvchisi', NULL),
  ('kunlik-oqish-06', 'Ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-06', 'лет', 'лет', 'Yosh', NULL),
  ('kunlik-oqish-06', 'нас', 'нас', 'Bizda', NULL),
  ('kunlik-oqish-06', 'бабушка', 'бабушка', 'Buvi', NULL),
  ('kunlik-oqish-06', 'Её', 'её', 'Uning (ayol)', NULL),
  ('kunlik-oqish-06', 'Зухра', 'зухра', 'Zuxra', NULL),
  ('kunlik-oqish-06', 'пенсии', 'пенсии', 'Nafaqada', NULL),
  ('kunlik-oqish-06', 'любит', 'любит', 'Yaxshi ko‘radi', NULL),
  ('kunlik-oqish-06', 'читать', 'читать', 'O‘qish', NULL),
  ('kunlik-oqish-06', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-06', 'Это', 'это', 'Bu', NULL),
  ('kunlik-oqish-06', 'мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-06', 'родители', 'родители', 'Ota-ona', NULL),
  ('kunlik-oqish-06', 'наш', 'наш', 'Bizning', NULL),
  ('kunlik-oqish-06', 'домашний', 'домашний', 'Uy (sifat)', NULL),
  ('kunlik-oqish-06', 'питомец', 'питомец', 'Uy hayvoni', NULL),
  ('kunlik-oqish-06', 'кот', 'кот', 'Mushuk', NULL),
  ('kunlik-oqish-06', 'Его', 'его', 'Uning (erkak)', NULL),
  ('kunlik-oqish-06', 'Барсик', 'барсик', 'Barsik', NULL),
  ('kunlik-oqish-06', 'живём', 'живём', 'Yashaymiz', NULL),
  ('kunlik-oqish-06', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-06', 'квартире', 'квартире', 'Kvartirada', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (6, 0, 'Sizning oilangiz kattami?', 'Ваша семья большая?'),
  (6, 1, 'Mening bir akam va bir singlim bor.', 'У меня есть один брат и одна сестра.'),
  (6, 2, 'Uning ismi nima?', 'Как его зовут?'),
  (6, 3, 'Bu mening buvim.', 'Это моя бабушка.'),
  (6, 4, 'Ular mening ota-onam.', 'Они мои родители.'),
  (6, 5, 'Sizning ukangiz necha yoshda?', 'Сколько лет вашему брату?'),
  (6, 6, 'Mening opam ishlamaydi, u talaba.', 'Моя сестра не работает, она студентка.'),
  (6, 7, 'Uning otasi qayerda ishlaydi?', 'Где работает его отец?'),
  (6, 8, 'Bizning oilamizda besh kishi bor.', 'В нашей семье пять человек.'),
  (6, 9, 'Bu sizning itingizmi?', 'Это ваша собака?');
