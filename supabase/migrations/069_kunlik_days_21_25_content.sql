-- Kunlik kun 21–25: 2-spryazheniye (hozirgi zamon), istisnolar, takrorlash.

-- ========== Kun 21 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 21;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 21
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 21;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 21;

DELETE FROM public.daily_vocab_words WHERE day_number = 21;

DELETE FROM public.daily_grammar_matches WHERE day_number = 21;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 21;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 21;
DELETE FROM public.daily_grammar_topics WHERE day_number = 21;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  21,
  '2-spryazheniye: говорить, учить, любить',
  $theory$
2-spryazheniye: infinitivda -ить — говорить, учить, любить…

Istisno (-еть): смотреть, видеть… Istisno (-ать): слышать, дышать…

Oxiqlar: я -ю/-у, ты -ишь, он/она -ит, мы -им, вы -ите, они -ят/-ат.

Cheredovanie (misollar): люблю (любить), куплю (купить), хожу (ходить).

знать — 1-spryazheniye (знаю).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (21, 'rule', 0, '«Gapirmoq» — я?', 'я говорю', 'я говоришь', 'я говорит', 'я говорим', 0),
  (21, 'rule', 1, '«Sen o‘rganasan» (слова)?', 'ты учишь', 'ты учит', 'ты учу', 'ты учат', 0),
  (21, 'rule', 2, '«U sevadi» (erkak)', 'он любит', 'он любишь', 'он люблю', 'он любят', 0),
  (21, 'rule', 3, '2-shaxs «говорить»?', 'Ты говоришь по-русски?', 'Ты говорите по-русски?', 'Ты говорю по-русски?', 'Ты говорит по-русски?', 0),
  (21, 'rule', 4, '«Мы любим»', 'Мы любим', 'Мы любишь', 'Мы любит', 'Мы любят', 0),
  (21, 'rule', 5, '2-spryazheniye?', 'читать', 'работать', 'говорить', 'гулять', 2),
  (21, 'rule', 6, '«Они знают русский» — гуруh?', 'ha (2-spryazheniye)', 'yo‘q (знать — 1-spryazheniye)', 'faqat мн.', 'faqat ед.', 1),
  (21, 'rule', 7, '«любить» — я', 'я люблю', 'я любию', 'я любу', 'я любаю', 0),
  (21, 'rule', 8, '«Вы говорите» — shaxs?', 'faqat bitta kishi', 'faqat ko‘plik', 'ikkalasi ham mumkin', '3-shaxs', 2),
  (21, 'rule', 9, 'Qaysi gap xato?', 'ты учишь', 'он учит', 'мы учим', 'я учишь', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (21, 0, 0, 'Говорить (я)', 'я говорю'),
  (21, 0, 1, 'Говорить (он)', 'он говорит'),
  (21, 0, 2, 'Говорить (мы)', 'мы говорим'),
  (21, 0, 3, 'Учить (ты)', 'ты учишь'),
  (21, 0, 4, 'Учить (они)', 'они учат'),
  (21, 0, 5, 'Любить (она)', 'она любит'),
  (21, 0, 6, 'Любить (вы)', 'вы любите'),
  (21, 0, 7, 'Смотреть (я)', 'я смотрю'),
  (21, 0, 8, 'Ходить (ты)', 'ты ходишь'),
  (21, 0, 9, 'Строить (мы)', 'мы строим');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (21, 0, 'uz', '(я, говорить, по-русски, плохо)', ARRAY['Я', 'плохо', 'говорю', 'по-русски.', 'говоришь'], 'Я плохо говорю по-русски.'),
  (21, 1, 'uz', '(ты, учить, стихи, каждый, день)', ARRAY['Ты', 'учишь', 'стихи', 'каждый', 'день?', 'учит'], 'Ты учишь стихи каждый день?'),
  (21, 2, 'uz', '(он, любить, читать, книги, вечером)', ARRAY['Он', 'любит', 'читать', 'книги', 'вечером.', 'люблю'], 'Он любит читать книги вечером.'),
  (21, 3, 'uz', '(мы, не, говорить, по-английски)', ARRAY['Мы', 'не', 'говорим', 'по-английски.', 'говорите'], 'Мы не говорим по-английски.'),
  (21, 4, 'uz', '(вы, любить, какой, фильм)', ARRAY['Какой', 'фильм', 'вы', 'любите?', 'любишь'], 'Какой фильм вы любите?'),
  (21, 5, 'uz', '(они, учить, русский, язык, в, университете)', ARRAY['Они', 'учат', 'русский', 'язык', 'в', 'университете.', 'учим'], 'Они учат русский язык в университете.'),
  (21, 6, 'uz', '(почему, ты, не, говорить, со, мной)', ARRAY['Почему', 'ты', 'не', 'говоришь', 'со', 'мной?', 'говорит'], 'Почему ты не говоришь со мной?'),
  (21, 7, 'uz', '(я, любить, свою, работа)', ARRAY['Я', 'люблю', 'свою', 'работу.', 'работе', 'любит'], 'Я люблю свою работу.'),
  (21, 8, 'uz', '(она, всегда, говорить, правда)', ARRAY['Она', 'всегда', 'говорит', 'правду.', 'правда', 'сказать'], 'Она всегда говорит правду.'),
  (21, 9, 'uz', '(мы, учить, детей, математике)', ARRAY['Мы', 'учим', 'детей', 'математике.', 'учат', 'математику'], 'Мы учим детей математике.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (21, 0, 'Gapirmoq', 'Говорить'),
  (21, 1, 'O‘rgatmoq / o‘rganmoq', 'Учить'),
  (21, 2, 'Sevmoq', 'Любить'),
  (21, 3, 'Harf', 'Буква'),
  (21, 4, 'Naizust', 'Наизусть'),
  (21, 5, 'Yolg‘on', 'Неправда'),
  (21, 6, 'Faol', 'Активный'),
  (21, 7, 'Asta-sekin', 'Постепенно'),
  (21, 8, 'Harakat qilmoq', 'Стараться'),
  (21, 9, 'Baland ovoz', 'Громко'),
  (21, 10, 'Past ovoz', 'Тихо'),
  (21, 11, 'Chiroyli', 'Красиво'),
  (21, 12, 'Qaniydi', 'Если бы'),
  (21, 13, 'Sabab', 'Потому что'),
  (21, 14, 'Yil', 'Год');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  21,
  'Мой друг говорит по-русски',
  $body$
Мой друг Алишер любит русский язык. Каждый день он учит новые слова. Сейчас он говорит по-русски хорошо.

Я тоже учу русский язык, но говорю пока не очень хорошо.

Младшая сестра Алишера не говорит по-русски. Она только учит буквы.

На уроке мы часто повторяем слова и отвечаем на вопросы преподавателя. Преподаватель говорит:
– Я люблю, когда студенты активно работают на уроке.

Алишер всегда поднимает руку и отвечает. Я тоже хочу быть активным. Я стараюсь и постепенно учусь говорить лучше.
$body$,
  'kunlik-oqish-21'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-21', 'Алишер', 'алишер', 'Alisher', NULL),
  ('kunlik-oqish-21', 'любит', 'любит', 'Yaxshi ko‘radi', NULL),
  ('kunlik-oqish-21', 'учит', 'учит', 'O‘rganadi / yodlaydi', NULL),
  ('kunlik-oqish-21', 'говорит', 'говорит', 'Gapiradi', NULL),
  ('kunlik-oqish-21', 'повторяем', 'повторяем', 'Takrorlaymiz', NULL),
  ('kunlik-oqish-21', 'активно', 'активно', 'Faol', NULL),
  ('kunlik-oqish-21', 'поднимает', 'поднимает', 'Ko‘taradi', NULL),
  ('kunlik-oqish-21', 'стараюсь', 'стараюсь', 'Harakat qilaman', NULL),
  ('kunlik-oqish-21', 'учусь', 'учусь', 'O‘rganyapman', NULL),
  ('kunlik-oqish-21', 'буквы', 'буквы', 'Harflar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (21, 0, 'Siz qaysi tillarda gapirasiz?', 'На каких языках вы говорите?'),
  (21, 1, 'Men she’rlarni yoddan o‘rganishni yaxshi ko‘raman.', 'Я люблю учить стихи наизусть.'),
  (21, 2, 'U tez-tez yolg‘on gapiradi, menga bu yoqmaydi.', 'Он часто говорит неправду, мне это не нравится.'),
  (21, 3, 'Sizningcha, nima uchun bolalar maktabni yaxshi ko‘rmaydilar?', 'Почему, по-вашему, дети не любят школу?'),
  (21, 4, 'U oʻz oilasi haqida ko‘p gapiradi.', 'Он много говорит о своей семье.'),
  (21, 5, 'Biz rus tilini uch yildan beri o‘rganyapmiz.', 'Мы учим русский язык уже три года.'),
  (21, 6, 'Siz qanday kitoblarni o‘qishni yaxshi ko‘rasiz?', 'Какие книги вы любите читать?'),
  (21, 7, 'U juda baland ovozda gapiradi, iltimos, undan so‘rang, ovozini pasaytirsin.', 'Он говорит очень громко, пожалуйста, попросите его говорить тише.'),
  (21, 8, 'Meni hech kim tushunmaydi, chunki men yomon gapiraman.', 'Меня никто не понимает, потому что я плохо говорю.'),
  (21, 9, 'Qaniydi, men ham siz kabi chiroyli gapirishni o‘rgansam!', 'Если бы я тоже научился говорить так красиво, как вы!');

-- ========== Kun 22 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 22;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 22
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 22;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 22;

DELETE FROM public.daily_vocab_words WHERE day_number = 22;

DELETE FROM public.daily_grammar_matches WHERE day_number = 22;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 22;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 22;
DELETE FROM public.daily_grammar_topics WHERE day_number = 22;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  22,
  '2-spryazheniye: смотреть, видеть, слышать, дышать',
  $theory$
-еть bilan 7 ta istisno (2-spryazheniye): смотреть, видеть, ненавидеть, зависеть, терпеть, обидеть (SV — ko‘pincha прошедшее), вертеть.

-ать bilan 4 ta: слышать, дышать, держать, гнать.

Мысль + примеры: я смотрю / вижу / слышу / дышу / держу… они смотрят.

Зависеть hozirgi zamon: я завишу, ты завишь… (kamdan-kam gapirishda; ko‘pincha «всё зависит от…»).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (22, 'rule', 0, '«Смотреть» — я?', 'я смотрю', 'я смотришь', 'я смотрит', 'я смотрим', 0),
  (22, 'rule', 1, '«Sen ko‘rasan» (sezgi)', 'ты видишь', 'ты видешь', 'ты видиш', 'ты видит', 0),
  (22, 'rule', 2, '«U (ayol) eshitadi»', 'она слышит', 'она слышет', 'она слышат', 'она слышим', 0),
  (22, 'rule', 3, '«Он дышит»', 'Он дышит', 'Он дышишь', 'Он дышу', 'Он дышат', 0),
  (22, 'rule', 4, '«Мы держим»', 'Мы держим', 'Мы держите', 'Мы держат', 'Мы держу', 0),
  (22, 'rule', 5, 'Istisno (-еть, 2-spryazheniye)', 'читать', 'смотреть', 'работать', 'гулять', 1),
  (22, 'rule', 6, '«Они видят»', 'они видят', 'они видеют', 'они видют', 'они видишь', 0),
  (22, 'rule', 7, '«Ты слышишь?»', 'Ты слышишь?', 'Ты слышешь?', 'Ты слышаешь?', 'Ты слышит?', 0),
  (22, 'rule', 8, '«Они дышат» — shaxs?', '1-shaxs ko‘plik', '2-shaxs ko‘plik', '3-shaxs ko‘plik', '3-shaxs birlik', 2),
  (22, 'rule', 9, 'Qaysi gap xato?', 'я вижу', 'ты видишь', 'он видит', 'мы видите', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (22, 0, 0, 'Смотреть', 'qaramoq'),
  (22, 0, 1, 'Видеть', 'ko‘rmoq (sezgi)'),
  (22, 0, 2, 'Слышать', 'eshitmoq'),
  (22, 0, 3, 'Дышать', 'nafas olmoq'),
  (22, 0, 4, 'Держать', 'ushlamoq'),
  (22, 0, 5, 'Ненавидеть', 'yomon ko‘rmoq'),
  (22, 0, 6, 'Зависеть', 'bog‘liq bo‘lmoq'),
  (22, 0, 7, 'Терпеть', 'chidamoq'),
  (22, 0, 8, 'Обидеть', 'xafa qilmoq'),
  (22, 0, 9, 'Вертеть', 'aylantirmoq');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (22, 0, 'uz', '(я, смотреть, телевизор, сейчас)', ARRAY['Я', 'сейчас', 'смотрю', 'телевизор.', 'смотрит'], 'Я сейчас смотрю телевизор.'),
  (22, 1, 'uz', '(ты, видеть, что, там, происходит)', ARRAY['Ты', 'видишь,', 'что', 'там', 'происходит?', 'видит'], 'Ты видишь, что там происходит?'),
  (22, 2, 'uz', '(он, не, слышать, что, ты, говорить)', ARRAY['Он', 'не', 'слышит,', 'что', 'ты', 'говоришь.', 'слышу'], 'Он не слышит, что ты говоришь.'),
  (22, 3, 'uz', '(мы, дышать, свежий, воздух, в, лес)', ARRAY['Мы', 'дышим', 'свежим', 'воздухом', 'в', 'лесу.', 'дышит'], 'Мы дышим свежим воздухом в лесу.'),
  (22, 4, 'uz', '(она, держать, сумка, в, рука)', ARRAY['Она', 'держит', 'сумку', 'в', 'руке.', 'держим'], 'Она держит сумку в руке.'),
  (22, 5, 'uz', '(вы, ненавидеть, когда, кто-то, лжёт)', ARRAY['Вы', 'ненавидите,', 'когда', 'кто-то', 'лжёт?', 'ненавидит'], 'Вы ненавидите, когда кто-то лжёт?'),
  (22, 6, 'uz', '(всё, зависеть, от, вы)', ARRAY['Всё', 'зависит', 'от', 'вас.', 'завишу'], 'Всё зависит от вас.'),
  (22, 7, 'uz', '(он, терпеть, боль, уже, долго)', ARRAY['Он', 'терпит', 'боль', 'уже', 'долго.', 'терплю'], 'Он терпит боль уже долго.'),
  (22, 8, 'uz', '(почему, ты, обидеть, её, вчера)', ARRAY['Почему', 'ты', 'обидел', 'её', 'вчера?', 'обидит'], 'Почему ты обидел её вчера?'),
  (22, 9, 'uz', '(дети, вертеть, игрушку, в, руках)', ARRAY['Дети', 'вертят', 'игрушку', 'в', 'руках.', 'верчу'], 'Дети вертят игрушку в руках.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (22, 0, 'Qaramoq', 'Смотреть'),
  (22, 1, 'Ko‘rmoq (sezgi)', 'Видеть'),
  (22, 2, 'Eshitmoq', 'Слышать'),
  (22, 3, 'Nafas olmoq', 'Дышать'),
  (22, 4, 'Ushlamoq', 'Держать'),
  (22, 5, 'Yomon ko‘rmoq', 'Ненавидеть'),
  (22, 6, 'Bog‘liq bo‘lmoq', 'Зависеть'),
  (22, 7, 'Chidamoq', 'Терпеть'),
  (22, 8, 'Xafa qilmoq', 'Обидеть'),
  (22, 9, 'Aylantirmoq', 'Вертеть'),
  (22, 10, 'Haydamoq', 'Гнать'),
  (22, 11, 'Barg', 'Лист'),
  (22, 12, 'Yer', 'Земля'),
  (22, 13, 'Osmon', 'Небо'),
  (22, 14, 'Qush', 'Птица');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  22,
  'Парк осенью',
  $body$
Сегодня я гуляю в парке. Осень – прекрасное время года.

Я смотрю на жёлтые листья и вижу, как они медленно падают на землю. Вокруг много людей.

Я слышу смех детей, шум листьев и голоса птиц. Я глубоко дышу и чувствую себя счастливым.

На скамейке сидит старушка. Она держит в руках палку и смотрит на небо. Она вспоминает свою молодость.

Я думаю о том, как быстро летит время. Нужно ценить каждый момент.
$body$,
  'kunlik-oqish-22'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-22', 'Осень', 'осень', 'Kuz', NULL),
  ('kunlik-oqish-22', 'листья', 'листья', 'Barglar', NULL),
  ('kunlik-oqish-22', 'падают', 'падают', 'Tushadi', NULL),
  ('kunlik-oqish-22', 'слышу', 'слышу', 'Eshitaman', NULL),
  ('kunlik-oqish-22', 'дышу', 'дышу', 'Nafas olaman', NULL),
  ('kunlik-oqish-22', 'скамейке', 'скамейке', 'Skameykada', NULL),
  ('kunlik-oqish-22', 'старушка', 'старушка', 'Kampir', NULL),
  ('kunlik-oqish-22', 'палку', 'палку', 'Tayoqni', NULL),
  ('kunlik-oqish-22', 'вспоминает', 'вспоминает', 'Eslaydi', NULL),
  ('kunlik-oqish-22', 'ценить', 'ценить', 'Qadrlash', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (22, 0, 'Kechirasiz, siz qayoqqa qarayapsiz?', 'Извините, куда вы смотрите?'),
  (22, 1, 'Men uni ko‘rmayapman, u qayerda?', 'Я его не вижу, где он?'),
  (22, 2, 'Siz meni eshityapsizmi? – Ha, juda yaxshi eshityapman.', 'Вы меня слышите? – Да, слышу очень хорошо.'),
  (22, 3, 'Bu xonada nafas olish qiyin, derazani oching.', 'В этой комнате трудно дышать, откройте окно.'),
  (22, 4, 'U qo‘lida qizil gulni ushlab turibdi.', 'Он держит в руке красный цветок.'),
  (22, 5, 'Men yolg‘onni yomon ko‘raman, har doim haqiqatni aytaman.', 'Я ненавижу ложь, всегда говорю правду.'),
  (22, 6, 'Sizning muvaffaqiyatingiz butunlay sizning mehnatingizga bog‘liq.', 'Ваш успех полностью зависит от вашего труда.'),
  (22, 7, 'U og‘riqni chidab turibdi, shifokorga murojaat qilish kerak.', 'Он терпит боль, нужно обратиться к врачу.'),
  (22, 8, 'Nega u bolasini xafa qildi?', 'Почему он обидел ребёнка?'),
  (22, 9, 'Birdaniga nimadir eshikni aylantira boshladi.', 'Вдруг что-то начало вертеть дверь.');

-- ========== Kun 23 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 23;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 23
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 23;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 23;

DELETE FROM public.daily_vocab_words WHERE day_number = 23;

DELETE FROM public.daily_grammar_matches WHERE day_number = 23;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 23;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 23;
DELETE FROM public.daily_grammar_topics WHERE day_number = 23;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  23,
  '2-spryazheniye: строить, ходить, носить, просить',
  $theory$
Строить → я строю, ты строишь, они строят.

Ходить — чередование о→о́ж: я хожу, ты ходишь, они ходят.

Носить → я ношу, ты носишь…

Просить → я прошу, ты просишь…

Ходить ostidagi baʼzi fe’llar: бродить (брожу), гладить (глажу), звонить (звоню).

«Голодать» — я голодаю (1‑спряжение).

«Клонить» — я клоню (просить yo‘nalishi bilan bir xil tuzilish).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (23, 'rule', 0, '«Строить» — я?', 'я строю', 'я строишь', 'я строит', 'я строят', 0),
  (23, 'rule', 1, '«Men maktabga boraman» (har kuni)', 'Я каждый день хожу в школу.', 'Я каждый день хожу на школу.', 'Я каждый день еду в школу.', 'Я каждый день иду в школу.', 0),
  (23, 'rule', 2, '«Sen sumkani ko‘tarasan»', 'Ты носишь сумку.', 'Ты носит сумку.', 'Ты ношу сумку.', 'Ты носят сумку.', 0),
  (23, 'rule', 3, '«U yordam so‘radi»', 'Она попросила помощь.', 'Она попросила помощи.', 'Она попросила помощью.', 'Она попросила помочь.', 1),
  (23, 'rule', 4, '«Biz uy qurmoqdamiz»', 'Мы строим дом.', 'Мы строете дом.', 'Мы строят дом.', 'Мы строишь дом.', 0),
  (23, 'rule', 5, '«Звонить» — я', 'я звоню', 'я звонишь', 'я звонит', 'я звонят', 0),
  (23, 'rule', 6, '«Гладить рубашку» — ты', 'ты гладишь рубашку', 'ты глажешь рубашку', 'ты гладит рубашку', 'ты гладят рубашку', 0),
  (23, 'rule', 7, '«Я голодаю» — qaysi spryazheniye?', '1‑спряжение', '2‑спряжение', 'faqat ми.', 'faqat они.', 0),
  (23, 'rule', 8, '«Они ходят»', 'они ходят', 'они ходятся', 'они хожу', 'они ходите', 0),
  (23, 'rule', 9, 'Qaysi gap xato?', 'я прошу', 'ты просишь', 'он просит', 'мы просишь', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (23, 0, 0, 'Строить', 'qurmoq'),
  (23, 0, 1, 'Ходить', 'yurmoq / borib‑kelmoq'),
  (23, 0, 2, 'Носить', 'kiyish / tashish'),
  (23, 0, 3, 'Просить', 'iltimos qilmoq / so‘ramoq'),
  (23, 0, 4, 'Бродить', 'sayroqlamoq'),
  (23, 0, 5, 'Гладить', 'dumlash'),
  (23, 0, 6, 'Звонить', 'qo‘ng‘iroq qilmoq'),
  (23, 0, 7, 'Голодать', 'och qolmoq'),
  (23, 0, 8, 'Клонить', 'egmoq'),
  (23, 0, 9, 'Хожу', 'ходить → мен');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (23, 0, 'uz', '(мы, строить, новый, дом, на, этой, улице)', ARRAY['Мы', 'строим', 'новый', 'дом', 'на', 'этой', 'улице.', 'строят'], 'Мы строим новый дом на этой улице.'),
  (23, 1, 'uz', '(я, каждый, день, ходить, в, спортзал)', ARRAY['Я', 'каждый', 'день', 'хожу', 'в', 'спортзал.', 'хожешь'], 'Я каждый день хожу в спортзал.'),
  (23, 2, 'uz', '(она, носить, тёплое, пальто)', ARRAY['Она', 'носит', 'тёплое', 'пальто.', 'ношу'], 'Она носит тёплое пальто.'),
  (23, 3, 'uz', '(он, просить, у, учителя, совета)', ARRAY['Он', 'просит', 'у', 'учителя', 'совета.', 'прошу'], 'Он просит у учителя совета.'),
  (23, 4, 'uz', '(вы, позвонить, мне, вечером)', ARRAY['Вы', 'позвоните', 'мне', 'вечером?', 'звоните'], 'Вы позвоните мне вечером?'),
  (23, 5, 'uz', '(дети, бродить, по, парку)', ARRAY['Дети', 'бродят', 'по', 'парку.', 'брожу'], 'Дети бродят по парку.'),
  (23, 6, 'uz', '(я, гладить, рубашку, чтобы, быть, аккуратным)', ARRAY['Я', 'глажу', 'рубашку,', 'чтобы', 'быть', 'аккуратным.', 'гладишь'], 'Я глажу рубашку, чтобы быть аккуратным.'),
  (23, 7, 'uz', '(мы, не, хотеть, чтобы, люди, голодать)', ARRAY['Мы', 'не', 'хотим,', 'чтобы', 'люди', 'голодали.', 'голодают'], 'Мы не хотим, чтобы люди голодали.'),
  (23, 8, 'uz', '(ветер, клонить, колосья)', ARRAY['Ветер', 'клонит', 'колосья.', 'клоню'], 'Ветер клонит колосья.'),
  (23, 9, 'uz', '(они, часто, ходить, гулять, после, уроков)', ARRAY['Они', 'часто', 'ходят', 'гулять', 'после', 'уроков.', 'ходим'], 'Они часто ходят гулять после уроков.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (23, 0, 'Qurmoq', 'Строить'),
  (23, 1, 'Yurmoq', 'Ходить'),
  (23, 2, 'Tashimoq', 'Носить'),
  (23, 3, 'So‘ramoq', 'Просить'),
  (23, 4, 'Sayroqlamoq', 'Бродить'),
  (23, 5, 'Dumlash', 'Гладить'),
  (23, 6, 'Qo‘ng‘iroq qilmoq', 'Звонить'),
  (23, 7, 'Och qolmoq', 'Голодать'),
  (23, 8, 'Egmoq', 'Клонить'),
  (23, 9, 'Yangi', 'Новый'),
  (23, 10, 'Issiq palto', 'Пальто'),
  (23, 11, 'Maslahat', 'Совет'),
  (23, 12, 'Sport zali', 'Спортзал'),
  (23, 13, 'Ko‘cha', 'Улица'),
  (23, 14, 'Shamol', 'Ветер');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  23,
  'Стройка и просьба',
  $body$
Наша семья живёт возле большой стройки. Рабочие строят новый дом.

Каждый день я хожу мимо стройки в школу. Инженер просит людей быть осторожными.

Мама носит тяжёлую сумку с продуктами. Она просит меня помочь.

Вечером сосед звонит нам и говорит: «Не ходите сегодня вечером в парк — сильный ветер».

На поле ветер клонит колосья. Я благодарю его и обещаю быть внимательным. Мы любим наш район и хотим, чтобы здесь было безопасно.
$body$,
  'kunlik-oqish-23'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-23', 'стройки', 'стройки', 'Qurilish maydoni', NULL),
  ('kunlik-oqish-23', 'строят', 'строят', 'Quryapti', NULL),
  ('kunlik-oqish-23', 'хожу', 'хожу', 'Boraman (har kuni)', NULL),
  ('kunlik-oqish-23', 'просит', 'просит', 'So‘raydi', NULL),
  ('kunlik-oqish-23', 'осторожными', 'осторожными', 'Ehtiyotkor', NULL),
  ('kunlik-oqish-23', 'носит', 'носит', 'Ko‘taradi / oladi', NULL),
  ('kunlik-oqish-23', 'звонит', 'звонит', 'Qo‘ng‘iroq qiladi', NULL),
  ('kunlik-oqish-23', 'ветер', 'ветер', 'Shamol', NULL),
  ('kunlik-oqish-23', 'клонит', 'клонит', 'Egadi / egaytadi', NULL),
  ('kunlik-oqish-23', 'колосья', 'колосья', 'Boshoqlar', NULL),
  ('kunlik-oqish-23', 'безопасно', 'безопасно', 'Xavfsiz', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (23, 0, 'Biz yangi uy qurmoqdamiz, keyingi yili tugaydi.', 'Мы строим новый дом, он закончится в следующем году.'),
  (23, 1, 'Men har kuni ishga piyoda boraman.', 'Я каждый день хожу на работу пешком.'),
  (23, 2, 'U qishda qalin palto kiyadi.', 'Она зимой носит тёплое пальто.'),
  (23, 3, 'Iltimos, menga rus tilida gapirishni o‘rgating.', 'Пожалуйста, научите меня говорить по-русски.'),
  (23, 4, 'Kechqurun sizga telefon qilaman.', 'Вечером я вам позвоню.'),
  (23, 5, 'Biz bog‘da sayr qilyapmiz.', 'Мы бродим по парку.'),
  (23, 6, 'Onam ko‘ylakni dumladi.', 'Мама погладила рубашку.'),
  (23, 7, 'Uzoq vaqt och qolganimda boshim og‘riyapti.', 'Когда я долго голодаю, у меня болит голова.'),
  (23, 8, 'Dalada shamol boshoqlarini egaytiryapti.', 'На поле ветер клонит колосья.'),
  (23, 9, 'Bolalar darsdan keyin ko‘chaga chiqadi.', 'Дети после уроков выходят на улицу.');

-- ========== Kun 24 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 24;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 24
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 24;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 24;

DELETE FROM public.daily_vocab_words WHERE day_number = 24;

DELETE FROM public.daily_grammar_matches WHERE day_number = 24;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 24;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 24;
DELETE FROM public.daily_grammar_topics WHERE day_number = 24;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  24,
  'Будущее по смыслу: купить, получить, встретить (+ готовить)',
  $theory$
Купить, получить, встретить — koʻpincha kelasi zamonga oid maʼno bilan ishlatiladi: я куплю, ты получишь, мы встретимся.

Готовить — hozirgi zamon (SV): я готовлю, ты готовишь…

«Завтра я куплю хлеб» — gapda kelasi maʼno; shakllar koʻpincha (-у / -ишь / -им / -ите / -ят) qatoriga tushadi.

Misol: завтра я получу посылку, вечером мы встретимся.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (24, 'rule', 0, '«Купить» — я (kelasi)', 'я куплю', 'я купишь', 'я купит', 'я купят', 0),
  (24, 'rule', 1, '«Получить» — ты', 'ты получишь', 'ты получаешь', 'ты получишься', 'ты получите', 0),
  (24, 'rule', 2, '«Biz uchrasamiz» (kelasi)', 'мы встретимся', 'мы встречаемся', 'мы встретятся', 'мы встретишься', 0),
  (24, 'rule', 3, '«Men tushlik tayyorlayman»', 'Я готовлю обед.', 'Я приготовлю обед.', 'Я готовишь обед.', 'Я готовят обед.', 0),
  (24, 'rule', 4, '«Они купят билеты», qachon?', 'bo‘sh gap', 'kelasi zamonga oid maʼno', 'faqat o‘tmish', 'faqat hozirgi zamon', 1),
  (24, 'rule', 5, '«Я получу ответ завтра»', 'Я получу ответ завтра.', 'Я получить ответ завтра.', 'Я получишь ответ завтра.', 'Я получает ответ завтра.', 0),
  (24, 'rule', 6, '«Готовить» — вы', 'вы готовите', 'вы готовишь', 'вы готовят', 'вы готовлю', 0),
  (24, 'rule', 7, '«Она встретит подругу», infinitiv?', 'встретить', 'встречать', 'встретиться', 'встретишь', 0),
  (24, 'rule', 8, 'Qaysi juftlik toʻgʻri?', 'куплю — купить', 'куплю — покупать', 'получишь — получать', 'встретим — встречать', 0),
  (24, 'rule', 9, 'Qaysi gapda «kelasi maʼno» xato joylangan?', 'Завтра я куплю молоко.', 'Сейчас я куплю молоко.', 'Я завтра получу письмо.', 'Вечером мы встретимся.', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (24, 0, 0, 'Купить', 'xarid qilmoq (kelasi shakllar)'),
  (24, 0, 1, 'Получить', 'olmoq (natija)'),
  (24, 0, 2, 'Встретить', 'uchrashmoq'),
  (24, 0, 3, 'Готовить', 'tayyorlamoq'),
  (24, 0, 4, 'Я куплю', 'купить → мен'),
  (24, 0, 5, 'Ты получишь', 'получить → ты'),
  (24, 0, 6, 'Мы встретимся', 'встретиться → мы'),
  (24, 0, 7, 'Они приготовят', 'приготовить → они'),
  (24, 0, 8, 'Я готовлю суп', 'готовить (hozirgi)'),
  (24, 0, 9, 'Чередование ю', 'люблю / куплю');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (24, 0, 'uz', '(завтра, я, купить, свежие, яблоки)', ARRAY['Завтра', 'я', 'куплю', 'свежие', 'яблоки.', 'купишь'], 'Завтра я куплю свежие яблоки.'),
  (24, 1, 'uz', '(ты, получить, письмо, от, брата)', ARRAY['Ты', 'получишь', 'письмо', 'от', 'брата?', 'получу'], 'Ты получишь письмо от брата?'),
  (24, 2, 'uz', '(мы, встретиться, у, входа, в, кино)', ARRAY['Мы', 'встретимся', 'у', 'входа', 'в', 'кино.', 'встречаемся'], 'Мы встретимся у входа в кино.'),
  (24, 3, 'uz', '(я, готовить, ужин, сейчас)', ARRAY['Я', 'готовлю', 'ужин', 'сейчас.', 'готовишь'], 'Я готовлю ужин сейчас.'),
  (24, 4, 'uz', '(они, приготовить, торт, к, празднику)', ARRAY['Они', 'приготовят', 'торт', 'к', 'празднику.', 'приготовим'], 'Они приготовят торт к празднику.'),
  (24, 5, 'uz', '(после, работы, я, получить, зарплату)', ARRAY['После', 'работы', 'я', 'получу', 'зарплату.', 'получишь'], 'После работы я получу зарплату.'),
  (24, 6, 'uz', '(вы, купить, билеты, на, концерт)', ARRAY['Вы', 'купите', 'билеты', 'на', 'концерт?', 'купишь'], 'Вы купите билеты на концерт?'),
  (24, 7, 'uz', '(он, встретить, старых, друзей)', ARRAY['Он', 'встретит', 'старых', 'друзей.', 'встречает'], 'Он встретит старых друзей.'),
  (24, 8, 'uz', '(мы, не, успеть, если, ты, не, приготовить, завтрак)', ARRAY['Мы', 'не', 'успеем,', 'если', 'ты', 'не', 'приготовишь', 'завтрак.', 'приготовит'], 'Мы не успеем, если ты не приготовишь завтрак.'),
  (24, 9, 'uz', '(я, рад, что, ты, получить, отпуск)', ARRAY['Я', 'рад,', 'что', 'ты', 'получишь', 'отпуск.', 'получу'], 'Я рад, что ты получишь отпуск.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (24, 0, 'Xarid qilmoq', 'Купить'),
  (24, 1, 'Olmoq (xat)', 'Получить'),
  (24, 2, 'Uchrashmoq', 'Встретить'),
  (24, 3, 'Tayyorlamoq', 'Готовить'),
  (24, 4, 'Yarim tayyor qilmoq', 'Приготовить'),
  (24, 5, 'Chipta', 'Билет'),
  (24, 6, 'Xat', 'Письмо'),
  (24, 7, 'Kirish joyi', 'Вход'),
  (24, 8, 'Tushlik', 'Обед'),
  (24, 9, 'Kechki ovqat', 'Ужин'),
  (24, 10, 'Tort', 'Торт'),
  (24, 11, 'Bayram', 'Праздник'),
  (24, 12, 'Maosh', 'Зарплата'),
  (24, 13, 'Dam olish', 'Отпуск'),
  (24, 14, 'Konsert', 'Концерт');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  24,
  'Планы на завтра',
  $body$
Завтра у меня много дел. Утром я куплю хлеб и молоко в магазине.

После обеда я получу посылку на почте. Брат обещал прислать книгу.

Вечером мы встретимся с друзьями у входа в кафе. Мама сказала, что приготовит пирог.

А сейчас я готовлю лёгкий ужин и думаю о планах. Всё будет хорошо, если мы не опоздаем.
$body$,
  'kunlik-oqish-24'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-24', 'куплю', 'куплю', 'Xarid qilaman', NULL),
  ('kunlik-oqish-24', 'получу', 'получу', 'Olaman', NULL),
  ('kunlik-oqish-24', 'встретимся', 'встретимся', 'Uchrashamiz', NULL),
  ('kunlik-oqish-24', 'приготовит', 'приготовит', 'Tayyorlaydi', NULL),
  ('kunlik-oqish-24', 'готовлю', 'готовлю', 'Tayyorlayapman', NULL),
  ('kunlik-oqish-24', 'посылку', 'посылку', 'Posilkani', NULL),
  ('kunlik-oqish-24', 'почте', 'почте', 'Pochtada', NULL),
  ('kunlik-oqish-24', 'пирог', 'пирог', 'Pirog', NULL),
  ('kunlik-oqish-24', 'опоздаем', 'опоздаем', 'Kech qolamiz', NULL),
  ('kunlik-oqish-24', 'планы', 'планы', 'Rejalar', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (24, 0, 'Ertaga men yangi telefon xarid qilaman.', 'Завтра я куплю новый телефон.'),
  (24, 1, 'Sen ertaga ukangdan xat olasanmi?', 'Ты завтра получишь письмо от брата?'),
  (24, 2, 'Kechqurun kino oldida uchrashamiz.', 'Вечером мы встретимся у кинотеатра.'),
  (24, 3, 'Onam bugun kechki ovqatni tayyorlayapti.', 'Мама сейчас готовит ужин.'),
  (24, 4, 'Ular bayramga tort tayyorlaydilar.', 'Они приготовят торт к празднику.'),
  (24, 5, 'Ishdan keyin maoshni olaman.', 'После работы я получу зарплату.'),
  (24, 6, 'Konsertga chipta sotib olasizmi?', 'Вы купите билеты на концерт?'),
  (24, 7, 'U eski do‘stlarni uchratadi.', 'Он встретит старых друзей.'),
  (24, 8, 'Agar non tayyorlamasangiz, biz kech qolamiz.', 'Если вы не приготовите хлеб, мы опоздаем.'),
  (24, 9, 'Sen dam olish olganingdan xursandman.', 'Я рад, что ты получишь отпуск.');

-- ========== Kun 25 (takrorlash) ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 25;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 25
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 25;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 25;

DELETE FROM public.daily_vocab_words WHERE day_number = 25;

DELETE FROM public.daily_grammar_matches WHERE day_number = 25;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 25;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 25;
DELETE FROM public.daily_grammar_topics WHERE day_number = 25;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  25,
  'Takrorlash: 2‑спряжение va istisnolar (kun 21–24)',
  $theory$
Qisqa eslatma:

• **‑ить**: gapirish, sevmoq, qurmoq (строить), tayyorlamoq… — я ‑ю / ты ‑ишь / они ‑ят.

• **‑еть istisnolar**: qaramoq (смотреть), ko‘rmoq (видеть), eshitmoq…

• **‑ать istisnolar**: eshitmoq (слышать), nafas olmoq (дышать), ushlash (держать).

• **Ходить seriyasi**: я хожу; звонить → я звоню; голодаю — **1‑спряжение**.

• **Kelasi maʼno**: куплю / получишь / встретимся va **готовлю** (hozirgi).

Har kuni «bir maqsad»: bir gapni ovoz chiqarib ayting va bir mini‑testdan oʻting.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (25, 'rule', 0, '«Sen ruscha gapirasmi»?', 'Ты говоришь по-русски?', 'Ты говорите по-русски?', 'Ты говорю по-русски?', 'Ты говорят по-русски?', 0),
  (25, 'rule', 1, '«Я хожу в школу» — infinitiv?', 'ходить', 'идти', 'ехать', 'гулять', 0),
  (25, 'rule', 2, '«Я звоню»', 'я звоню', 'я звонишь', 'я звонит', 'я звонят', 0),
  (25, 'rule', 3, '«Голодать» — я', 'я голодаю', 'я голоду', 'я голодаешь', 'я голодает', 0),
  (25, 'rule', 4, '«Зависеть» — uchinchi shaxs birlik', 'зависит', 'зависишь', 'зависят', 'завишу', 0),
  (25, 'rule', 5, '«Я прошу помощь» — infinitiv?', 'просить', 'проситься', 'просила', 'просят', 0),
  (25, 'rule', 6, '«Я готовлю обед» — SV?', 'ha', 'yo‘q', 'faqat kelasi', 'faqat o‘tmish', 0),
  (25, 'rule', 7, '«Завтра мы купим книги» — rus tilida eng tabiiy?', 'Завтра мы купим книги.', 'Завтра мы покупаем книги.', 'Завтра мы куплю книги.', 'Завтра мы купят книги.', 0),
  (25, 'rule', 8, '«Ты видишь» — yo‘nalish?', 'sezgi', 'kelasi', 'buyruq', 'sifat', 0),
  (25, 'rule', 9, 'Umumiy tekshiruv: qaysi gap xato?', 'я люблю музыку', 'ты держишь сумку', 'он слышит', 'мы строишь дом', 3);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (25, 0, 0, 'Говорить', 'я говорю'),
  (25, 0, 1, 'Учить', 'ты учишь'),
  (25, 0, 2, 'Смотреть', 'я смотрю'),
  (25, 0, 3, 'Слышать', 'мы слышим'),
  (25, 0, 4, 'Держать', 'она держит'),
  (25, 0, 5, 'Ходить', 'я хожу'),
  (25, 0, 6, 'Строить', 'они строят'),
  (25, 0, 7, 'Просить', 'я прошу'),
  (25, 0, 8, 'Купить', 'я куплю'),
  (25, 0, 9, 'Готовить', 'вы готовите');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (25, 0, 'uz', '(я, любить, когда, студенты, активно, работать)', ARRAY['Я', 'люблю,', 'когда', 'студенты', 'активно', 'работают.', 'любит'], 'Я люблю, когда студенты активно работают.'),
  (25, 1, 'uz', '(ты, слышать, музыку, из, соседней, комнаты)', ARRAY['Ты', 'слышишь', 'музыку', 'из', 'соседней', 'комнаты?', 'слышит'], 'Ты слышишь музыку из соседней комнаты?'),
  (25, 2, 'uz', '(мы, строить, мост, через, реку)', ARRAY['Мы', 'строим', 'мост', 'через', 'реку.', 'строят'], 'Мы строим мост через реку.'),
  (25, 3, 'uz', '(она, каждый, день, ходить, в, библиотеку)', ARRAY['Она', 'каждый', 'день', 'ходит', 'в', 'библиотеку.', 'хожу'], 'Она каждый день ходит в библиотеку.'),
  (25, 4, 'uz', '(он, просить, совета, у, преподавателя)', ARRAY['Он', 'просит', 'совета', 'у', 'преподавателя.', 'прошу'], 'Он просит совета у преподавателя.'),
  (25, 5, 'uz', '(завтра, я, получить, ответ)', ARRAY['Завтра', 'я', 'получу', 'ответ.', 'получишь'], 'Завтра я получу ответ.'),
  (25, 6, 'uz', '(вы, готовить, ужин, или, заказать, пиццу)', ARRAY['Вы', 'готовите', 'ужин', 'или', 'закажете', 'пиццу?', 'готовишь'], 'Вы готовите ужин или закажете пиццу?'),
  (25, 7, 'uz', '(всё, зависеть, от, нашего, решения)', ARRAY['Всё', 'зависит', 'от', 'нашего', 'решения.', 'завишу'], 'Всё зависит от нашего решения.'),
  (25, 8, 'uz', '(дети, вертеть, карусель)', ARRAY['Дети', 'вертят', 'карусель.', 'верчу'], 'Дети вертят карусель.'),
  (25, 9, 'uz', '(мы, встретиться, после, экзамена)', ARRAY['Мы', 'встретимся', 'после', 'экзамена.', 'встречаемся'], 'Мы встретимся после экзамена.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (25, 0, 'Takrorlash', 'Повторение'),
  (25, 1, 'Istisno', 'Исключение'),
  (25, 2, 'Hozirgi zamon', 'Настоящее время'),
  (25, 3, 'Kelasi zamon', 'Будущее время'),
  (25, 4, 'Spryazheniye', 'Спряжение'),
  (25, 5, 'Maslahat', 'Совет'),
  (25, 6, 'Karusel', 'Карусель'),
  (25, 7, 'Koʻprik', 'Мост'),
  (25, 8, 'Daryo', 'Река'),
  (25, 9, 'Kutubxona', 'Библиотека'),
  (25, 10, 'Imtihon', 'Экзамен'),
  (25, 11, 'Qaror', 'Решение'),
  (25, 12, 'Qonshixona', 'Соседняя комната'),
  (25, 13, 'Faoliyat', 'Активность'),
  (25, 14, 'Reja', 'План');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  25,
  'Неделя грамматики',
  $body$
На этой неделе мы учили второе спряжение и важные исключения.

Мы говорили, как видеть разницу между «смотреть» и «видеть», как слышать и дышать свободно. Мы держали в голове правила и не спешили.

Мы ходили на занятия каждый день и ставили себе маленькие цели: звонить другу, просить совета, готовить простые фразы.

Завтра я получу результат теста. Если всё получится, мы встретимся и будем радоваться успеху вместе.

Главное — любить процесс учёбы и верить в себя.
$body$,
  'kunlik-oqish-25'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-25', 'исключения', 'исключения', 'Istisnolar', NULL),
  ('kunlik-oqish-25', 'видеть', 'видеть', 'Ko‘rmoq (farq)', NULL),
  ('kunlik-oqish-25', 'правила', 'правила', 'Qoidalar', NULL),
  ('kunlik-oqish-25', 'строили', 'строили', 'Qurgan edik', NULL),
  ('kunlik-oqish-25', 'получу', 'получу', 'Olaman', NULL),
  ('kunlik-oqish-25', 'встретимся', 'встретимся', 'Uchrashamiz', NULL),
  ('kunlik-oqish-25', 'процесс', 'процесс', 'Jarayon', NULL),
  ('kunlik-oqish-25', 'учёбы', 'учёбы', 'O‘qish', NULL),
  ('kunlik-oqish-25', 'верить', 'верить', 'Ishonmoq', NULL),
  ('kunlik-oqish-25', 'успеху', 'успеху', 'Muvaffaqiyatga', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (25, 0, 'Bu hafta men fe’llarning ikkinchi spryazheniyasini takrorladim.', 'На этой неделе я повторил второе спряжение глаголов.'),
  (25, 1, 'Farqni ko‘rish uchun ko‘proq mashq qilish kerak.', 'Чтобы видеть разницу, нужно больше практики.'),
  (25, 2, 'Biz har kuni darsga boramiz.', 'Мы каждый день ходим на занятия.'),
  (25, 3, 'Onadan maslahat so‘rash — yaxshi g‘oya.', 'Просить совета у мамы — хорошая идея.'),
  (25, 4, 'Ertaga natijani olaman.', 'Завтра я получу результат.'),
  (25, 5, 'Sinfdoshlar bilan imtihondan keyin uchrashamiz.', 'Мы встретимся с одноклассниками после экзамена.'),
  (25, 6, 'Hammasi bizning qarorimizga bog‘liq.', 'Всё зависит от нашего решения.'),
  (25, 7, 'Bolalar karuselni aylantiryapti.', 'Дети крутят карусель.'),
  (25, 8, 'Men oddiy rus iboralarini tayyorlayman.', 'Я готовлю простые русские фразы.'),
  (25, 9, 'O‘qish jarayonini yaxshi ko‘rish muhim.', 'Важно любить процесс учёбы.');
