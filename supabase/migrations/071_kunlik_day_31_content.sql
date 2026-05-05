-- Kunlik kun 31: Винительный падеж (неодушевлённые), прямое дополнение (что?).

DELETE FROM public.daily_practice_prompts WHERE day_number = 31;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 31
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 31;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 31;

DELETE FROM public.daily_vocab_words WHERE day_number = 31;

DELETE FROM public.daily_grammar_matches WHERE day_number = 31;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 31;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 31;
DELETE FROM public.daily_grammar_topics WHERE day_number = 31;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  31,
  'Винительный падеж: неодушевлённые (что?)',
  $theory$
**Винительный падеж** — to‘g‘ridan-to‘g‘ri to‘ldiruvchi: **что?** (jonsiz), **кого?** (jonli — keyingi kunlar).

Jonsiz otlar: fe’ldan keyin odatda вин.п. Kerak bo‘lganda **-а → -у**, **-я → -ю** (книгу, газету). Erkak va o‘rta rod ko‘pincha **o‘zgarmaydi**: дом, окно, словарь.

Ko‘plik jonsizda **именительный = винительный**: я читаю **книги**, я вижу **столы**.

Oddiy fe’llar: читать, писать, видеть, любить, знать, понимать, покупать.

**Что ты читаешь?** — Я читаю **книгу**.

**Петь песню** — kuylashda obyekt odatda «песня».
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (31, 'rule', 0, '«Men kitob o‘qiyapman»', 'Я читаю книгу.', 'Я читаю книге.', 'Я читаю книга.', 'Я читаю книгой.', 0),
  (31, 'rule', 1, '«Men gazeta sotib oldim»', 'Я купил газету.', 'Я купил газета.', 'Я купил газете.', 'Я купил газетой.', 0),
  (31, 'rule', 2, '«Siz xat yozyapsizmi?»', 'Вы пишете письмо?', 'Вы пишете письма?', 'Вы пишете письму?', 'Вы пишете письмом?', 0),
  (31, 'rule', 3, '«дом» — винительный падеж', 'Я вижу дом.', 'Я вижу дома.', 'Я вижу дому.', 'Я вижу домом.', 0),
  (31, 'rule', 4, '«Biz suv ichamiz»', 'Мы пьём воду.', 'Мы пьём вода.', 'Мы пьём воде.', 'Мы пьём водой.', 0),
  (31, 'rule', 5, '«U televizor ko‘rayapti»', 'Он смотрит телевизор.', 'Он смотрит телевизора.', 'Он смотрит телевизору.', 'Он смотрит телевизором.', 0),
  (31, 'rule', 6, 'Qaysi gapda xatolik bor?', 'Я люблю музыку.', 'Я слушаю музыку.', 'Я знаю музыку.', 'Я пою музыку.', 3),
  (31, 'rule', 7, '«U yangi mashina sotib oldi»', 'Он купил новую машину.', 'Он купил новый машину.', 'Он купил новое машину.', 'Он купил новые машину.', 0),
  (31, 'rule', 8, 'Qaysi so‘z винительный падежda o‘zgarmaydi?', 'окно', 'книга', 'мама', 'дверь', 0),
  (31, 'rule', 9, '«Бабушка рассказывает …» (сказку)', 'сказку', 'сказка', 'сказке', 'сказкой', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (31, 0, 0, 'Что ты читаешь?', 'Я читаю книгу.'),
  (31, 0, 1, 'Что ты пишешь?', 'Я пишу письмо.'),
  (31, 0, 2, 'Что вы пьёте?', 'Я пью воду.'),
  (31, 0, 3, 'Что они покупают?', 'Они покупают машину.'),
  (31, 0, 4, 'Что вы смотрите?', 'Я смотрю фильм.'),
  (31, 0, 5, 'Что она рисует?', 'Она рисует дом.'),
  (31, 0, 6, 'Что ты изучаешь?', 'Я изучаю русский язык.'),
  (31, 0, 7, 'Что вы знаете?', 'Я знаю ответ.'),
  (31, 0, 8, 'Что ты ищешь?', 'Я ищу ключи.'),
  (31, 0, 9, 'Что он любит?', 'Он любит музыку.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (31, 0, 'uz', '(я, читаю, интересную, книгу)', ARRAY['Я', 'читаю', 'интересную', 'книгу.', 'книга'], 'Я читаю интересную книгу.'),
  (31, 1, 'uz', '(ты, видишь, тот, дом)', ARRAY['Ты', 'видишь', 'тот', 'дом?', 'дома'], 'Ты видишь тот дом?'),
  (31, 2, 'uz', '(мы, купили, новый, телевизор)', ARRAY['Мы', 'купили', 'новый', 'телевизор.', 'телевизора'], 'Мы купили новый телевизор.'),
  (31, 3, 'uz', '(она, пишет, длинное, письмо)', ARRAY['Она', 'пишет', 'длинное', 'письмо.', 'письма'], 'Она пишет длинное письмо.'),
  (31, 4, 'uz', '(вы, любите, какой, фильм)', ARRAY['Какой', 'фильм', 'вы', 'любите?', 'любишь'], 'Какой фильм вы любите?'),
  (31, 5, 'uz', '(я, не, понимаю, это, слово)', ARRAY['Я', 'не', 'понимаю', 'это', 'слово.', 'слова'], 'Я не понимаю это слово.'),
  (31, 6, 'uz', '(дети, что, рисовать)', ARRAY['Что', 'рисуют', 'дети?', 'рисуешь'], 'Что рисуют дети?'),
  (31, 7, 'uz', '(он, искать, свою, сумку)', ARRAY['Он', 'ищет', 'свою', 'сумку.', 'сумка'], 'Он ищет свою сумку.'),
  (31, 8, 'uz', '(мы, купили, продукты, в, магазине)', ARRAY['Мы', 'купили', 'продукты', 'в', 'магазине.', 'купить'], 'Мы купили продукты в магазине.'),
  (31, 9, 'uz', '(ты, какой, язык, изучать)', ARRAY['Какой', 'язык', 'ты', 'изучаешь?', 'изучает'], 'Какой язык ты изучаешь?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (31, 0, 'Narsa (jonsiz)', 'Предмет'),
  (31, 1, 'O‘qimoq', 'Читать'),
  (31, 2, 'Yozmoq', 'Писать'),
  (31, 3, 'Ko‘rmoq (umuman)', 'Видеть'),
  (31, 4, 'Sotib olmoq', 'Купить'),
  (31, 5, 'Tushunmoq', 'Понимать'),
  (31, 6, 'Sevmoq', 'Любить'),
  (31, 7, 'Bilmoq', 'Знать'),
  (31, 8, 'Kitob', 'Книга'),
  (31, 9, 'Gazeta', 'Газета'),
  (31, 10, 'Xat', 'Письмо'),
  (31, 11, 'Deraza', 'Окно'),
  (31, 12, 'Film', 'Фильм'),
  (31, 13, 'Vazifa', 'Задание'),
  (31, 14, 'So‘z', 'Слово');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  31,
  'Что я люблю делать?',
  $body$
Когда у меня есть свободное время, я делаю то, что люблю. Я обожаю читать книги. Сейчас я читаю интересный роман. Он называется «Преступление и наказание».

Также я люблю смотреть фильмы. Вчера я посмотрел новую комедию. Она была очень смешной. По выходным я часто готовлю вкусный ужин для семьи. Я покупаю овощи, мясо и делаю суп.

Моя мама говорит, что я хорошо готовлю. Иногда я пишу стихи. Я не показываю их никому, потому что это мои личные мысли.

А что любите делать вы в свободное время?
$body$,
  'kunlik-oqish-31'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-31', 'свободное', 'свободное', 'Bo‘sh', NULL),
  ('kunlik-oqish-31', 'обожаю', 'обожаю', 'Juda yaxshi ko‘raman', NULL),
  ('kunlik-oqish-31', 'роман', 'роман', 'Roman', NULL),
  ('kunlik-oqish-31', 'называется', 'называется', 'Nomlanadi', NULL),
  ('kunlik-oqish-31', 'комедию', 'комедию', 'Komediyani', NULL),
  ('kunlik-oqish-31', 'смешной', 'смешной', 'Kulgili', NULL),
  ('kunlik-oqish-31', 'выходным', 'выходным', 'Dam olish kunlari', NULL),
  ('kunlik-oqish-31', 'овощи', 'овощи', 'Sabzavotlar', NULL),
  ('kunlik-oqish-31', 'стихи', 'стихи', 'She’rlar', NULL),
  ('kunlik-oqish-31', 'личные', 'личные', 'Shaxsiy', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (31, 0, 'Siz nima o‘qishni yaxshi ko‘rasiz?', 'Что вы любите читать?'),
  (31, 1, 'Men ertalab gazeta o‘qiyman.', 'Я читаю газету утром.'),
  (31, 2, 'U nega mening xatimni yozmayapti?', 'Почему он не пишет моё письмо?'),
  (31, 3, 'Kechagi kino sizga yoqdimi?', 'Вам понравился вчерашний фильм?'),
  (31, 4, 'Iltimos, derazani oching.', 'Пожалуйста, откройте окно.'),
  (31, 5, 'Siz qanday musiqa tinglaysiz?', 'Какую музыку вы слушаете?'),
  (31, 6, 'Men bu so‘zni tushunmayapman.', 'Я не понимаю это слово.'),
  (31, 7, 'U ertalab nonushta qilmaydi.', 'Он не завтракает утром.'),
  (31, 8, 'Sayohatda biz juda ko‘p yangi joylarni ko‘rdik.', 'В путешествии мы увидели много новых мест.'),
  (31, 9, 'Sizningcha, u bu vazifani bajara oladimi?', 'Как вы думаете, он выполнит это задание?');
