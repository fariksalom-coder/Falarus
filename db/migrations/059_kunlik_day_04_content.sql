-- Kunlik kun 4: Sonlar (1–10) va ko‘plik shakli.

DELETE FROM public.daily_practice_prompts WHERE day_number = 4;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 4
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 4;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 4;

DELETE FROM public.daily_vocab_words WHERE day_number = 4;

DELETE FROM public.daily_grammar_matches WHERE day_number = 4;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 4;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 4;
DELETE FROM public.daily_grammar_topics WHERE day_number = 4;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  4,
  'Sonlar (1–10) va ko‘plik shakli (Числительные и множественное число)',
  $theory$
Rus tilida sonlar (числительные) va ko‘plik shakli (множественное число) bog‘liq.

1.1. Sonlar 1–10: один — bir, два — ikki, три — uch, четыре — to‘rt, пять — besh, шесть — olti, семь — yetti, восемь — sakkiz, девять — to‘qqiz, десять — o‘n.

1.2. Ko‘plik: -а/-я → -ы/-и (книга → книги; г/к/х/ж/ш/ч/щ dan keyin -и); -ь/-й → -и (словарь → словари); -о/-е → -а/-я (окно → окна). Istisnolar keyinroq: брат → братья, друг → друзья, человек → люди, ребёнок → дети.

1.3. Сколько? — javobda son + otning kerakli shakli: 1 — ном. ед.; 2–4 — род. ед.; 5–10, много, мало — род. мн. Misollar: Сколько здесь студентов? – Здесь два студента.; У меня пять книг.; В комнате одно окно.

Bu qoidani hozircha eslab qoling; keyingi darslarda takrorlaymiz.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (4, 'rule', 0, '«Два» sonining ma’nosi?', 'Bir', 'Ikki', 'Uch', 'To‘rt', 1),
  (4, 'rule', 1, '«Книга» so‘zining ko‘pligi?', 'книги', 'книгаы', 'книгы', 'книг', 0),
  (4, 'rule', 2, 'Qaysi shakl to‘g‘ri? (3 ta deraza)', 'три окно', 'три окна', 'три окон', 'три окны', 1),
  (4, 'rule', 3, '«Студент» ko‘pligi (5 ta)?', 'пять студент', 'пять студента', 'пять студенты', 'пять студентов', 3),
  (4, 'rule', 4, '«У меня есть ...» — «один карандаш»?', 'один карандаша', 'один карандаши', 'один карандаш', 'одно карандаш', 2),
  (4, 'rule', 5, 'To‘g‘ri birikma? (2 ta qiz do‘st)', 'две подруги', 'две подруга', 'два подруги', 'две подруг', 0),
  (4, 'rule', 6, '«Много» dan keyin qaysi shakl?', 'Именительный падеж ед.ч.', 'Родительный падеж ед.ч.', 'Родительный падеж мн.ч.', 'Именительный падеж мн.ч.', 2),
  (4, 'rule', 7, '«4 та студент» (ayol) — to‘g‘ri variant?', 'четыре студентка', 'четыре студентки', 'четыре студенток', 'четыре студенткам', 1),
  (4, 'rule', 8, '«Словарь» ko‘plikda?', 'словаря', 'словарей', 'словари', 'словарьи', 2),
  (4, 'rule', 9, '«Мало» dan keyin qaysi keladi? (мало …)', 'столов', 'столы', 'стола', 'столом', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (4, 0, 0, 'Один', 'один студент'),
  (4, 0, 1, 'Два', 'два друга'),
  (4, 0, 2, 'Три', 'три окна'),
  (4, 0, 3, 'Четыре', 'четыре словаря'),
  (4, 0, 4, 'Пять (число + род. мн.)', 'пять домов'),
  (4, 0, 5, 'Книга (мн. ч.)', 'книги'),
  (4, 0, 6, 'Студентка (мн. ч.)', 'студентки'),
  (4, 0, 7, 'Дом (5 ta)', 'пять домов'),
  (4, 0, 8, 'Окно (3 ta)', 'три окна'),
  (4, 0, 9, 'Стул (2 ta)', 'два стула');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (4, 0, 'uz', '(в, группе, 10, нашей, студентов)', ARRAY['В', 'нашей', 'группе', '10', 'студентов', 'книги', 'два'], 'В нашей группе 10 студентов'),
  (4, 1, 'uz', '(у, меня, 2, брата)', ARRAY['У', 'меня', '2', 'брата', 'сестры', 'нет'], 'У меня 2 брата'),
  (4, 2, 'uz', '(это, 3, книга, интересные)', ARRAY['Это', '3', 'интересные', 'книги', 'книга', 'интересная'], 'Это 3 интересные книги'),
  (4, 3, 'uz', '(в, комнате, 1, окно)', ARRAY['В', 'комнате', 'одно', 'окно', 'окна', 'три'], 'В комнате одно окно'),
  (4, 4, 'uz', '(на, столе, 4, ручка)', ARRAY['На', 'столе', '4', 'ручки', 'ручка', 'стуле'], 'На столе 4 ручки'),
  (4, 5, 'uz', '(она, опоздала, на, 5, минут)', ARRAY['Она', 'опоздала', 'на', '5', 'минут', 'сколько'], 'Она опоздала на 5 минут'),
  (4, 6, 'uz', '(сколько, у, вас, детей?)', ARRAY['Сколько', 'у', 'вас', 'детей?', 'есть', 'книг'], 'Сколько у вас детей?'),
  (4, 7, 'uz', '(много, книг, в, библиотеке)', ARRAY['В', 'библиотеке', 'много', 'книг', 'мало', 'студентов'], 'В библиотеке много книг'),
  (4, 8, 'uz', '(мало, времени, у, меня)', ARRAY['У', 'меня', 'мало', 'времени', 'много', 'книг'], 'У меня мало времени'),
  (4, 9, 'uz', '(2, а, студента, 3, студентки)', ARRAY['2', 'студента', 'и', '3', 'студентки', 'студентов'], '2 студента и 3 студентки');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (4, 0, 'Bir', 'Один'),
  (4, 1, 'Ikki', 'Два'),
  (4, 2, 'Uch', 'Три'),
  (4, 3, 'To‘rt', 'Четыре'),
  (4, 4, 'Besh', 'Пять'),
  (4, 5, 'Ko‘p', 'Много'),
  (4, 6, 'Oz', 'Мало'),
  (4, 7, 'Qancha?', 'Сколько?'),
  (4, 8, 'Stul', 'Стул'),
  (4, 9, 'Stol', 'Стол'),
  (4, 10, 'Daftar', 'Тетрадь'),
  (4, 11, 'Qalam', 'Ручка (карандаш)'),
  (4, 12, 'Kitob', 'Книга'),
  (4, 13, 'Talaba', 'Студент'),
  (4, 14, 'Vaqt', 'Время');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  4,
  'В аудитории',
  $body$
В нашей аудитории 5 столов и 10 стульев. На столах лежат книги и тетради. У меня 2 учебника и 3 словаря. У моей подруги Анны 1 ручка и 4 карандаша. На стене висит 1 карта и 2 плаката. У преподавателя много журналов. Сколько студентов в группе? В нашей группе 8 студентов: 4 девушки и 4 юноши. У нас мало времени. Скоро будет контрольная работа.
$body$,
  'kunlik-oqish-04'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-04', 'В', 'в', 'Joylashuv (qayerda?)', NULL),
  ('kunlik-oqish-04', 'нашей', 'нашей', 'Bizning (род.)', NULL),
  ('kunlik-oqish-04', 'аудитории', 'аудитории', 'Auditoriyada', NULL),
  ('kunlik-oqish-04', 'столов', 'столов', 'Stollar (род. мн.)', NULL),
  ('kunlik-oqish-04', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-04', 'стульев', 'стульев', 'Stullar (род. мн.)', NULL),
  ('kunlik-oqish-04', 'На', 'на', 'Ustida / yo‘nalish', NULL),
  ('kunlik-oqish-04', 'столах', 'столах', 'Stollarda', NULL),
  ('kunlik-oqish-04', 'лежат', 'лежат', 'Yotibdi (ko‘plik)', NULL),
  ('kunlik-oqish-04', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-04', 'тетради', 'тетради', 'Daftarlar', NULL),
  ('kunlik-oqish-04', 'У', 'у', 'Menda / bor (у меня)', NULL),
  ('kunlik-oqish-04', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-04', 'учебника', 'учебника', 'Darsliklar (2,3,4)', NULL),
  ('kunlik-oqish-04', 'словаря', 'словаря', 'Lug‘atlar (род.)', NULL),
  ('kunlik-oqish-04', 'моей', 'моей', 'Mening (ayol rodi)', NULL),
  ('kunlik-oqish-04', 'подруги', 'подруги', 'Qiz do‘stning', NULL),
  ('kunlik-oqish-04', 'Анны', 'анны', 'Annaning', NULL),
  ('kunlik-oqish-04', 'ручка', 'ручка', 'Ruchka', NULL),
  ('kunlik-oqish-04', 'карандаша', 'карандаша', 'Qalam (род. мн.)', NULL),
  ('kunlik-oqish-04', 'стене', 'стене', 'Devorda', NULL),
  ('kunlik-oqish-04', 'висит', 'висит', 'Osilgan', NULL),
  ('kunlik-oqish-04', 'карта', 'карта', 'Xarita', NULL),
  ('kunlik-oqish-04', 'плаката', 'плаката', 'Plakatlar (род.)', NULL),
  ('kunlik-oqish-04', 'преподавателя', 'преподавателя', 'O‘qituvchining', NULL),
  ('kunlik-oqish-04', 'журналов', 'журналов', 'Jurnallar (род. мн.)', NULL),
  ('kunlik-oqish-04', 'Сколько', 'сколько', 'Necha? Qancha?', NULL),
  ('kunlik-oqish-04', 'студентов', 'студентов', 'Talabalar (род. мн.)', NULL),
  ('kunlik-oqish-04', 'группе', 'группе', 'Guruhda', NULL),
  ('kunlik-oqish-04', 'девушки', 'девушки', 'Qizlar', NULL),
  ('kunlik-oqish-04', 'юноши', 'юноши', 'Yigitlar', NULL),
  ('kunlik-oqish-04', 'нас', 'нас', 'Bizda', NULL),
  ('kunlik-oqish-04', 'мало', 'мало', 'Oz', NULL),
  ('kunlik-oqish-04', 'времени', 'времени', 'Vaqt (род.)', NULL),
  ('kunlik-oqish-04', 'Скоро', 'скоро', 'Tez orada', NULL),
  ('kunlik-oqish-04', 'контрольная', 'контрольная', 'Nazorat (sinf)', NULL),
  ('kunlik-oqish-04', 'работа', 'работа', 'Ish', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (4, 0, 'Sinfda nechta stol bor?', 'Сколько столов в классе?'),
  (4, 1, 'Menda 2 ta ukam bor.', 'У меня два брата.'),
  (4, 2, 'Uning 5 ta kitobi bor.', 'У него пять книг.'),
  (4, 3, 'Kechirasiz, hozir vaqtim oz.', 'Извините, у меня сейчас мало времени.'),
  (4, 4, 'Daftaringiz nechta?', 'Сколько у вас тетрадей?'),
  (4, 5, 'Men bir qalam sotib oldim.', 'Я купил одну ручку.'),
  (4, 6, 'U yerda ikkita ayol turibdi.', 'Там стоят две женщины.'),
  (4, 7, 'Mening bir akam va ikki singlim bor.', 'У меня один брат и две сестры.'),
  (4, 8, 'To‘rt nafar talaba kechikdi.', 'Четыре студента опоздали.'),
  (4, 9, 'O‘n daqiqadan keyin boshlaymiz.', 'Мы начнём через десять минут.');
