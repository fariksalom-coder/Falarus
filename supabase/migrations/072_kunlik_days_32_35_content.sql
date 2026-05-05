-- Kunlik kun 32–35: Винительный падеж — одушевлённые (кого?), неодуш. повтор, личные и указательные местоимения.

-- ========== Kun 32 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 32;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 32
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 32;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 32;

DELETE FROM public.daily_vocab_words WHERE day_number = 32;

DELETE FROM public.daily_grammar_matches WHERE day_number = 32;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 32;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 32;
DELETE FROM public.daily_grammar_topics WHERE day_number = 32;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  32,
  'Винительный падеж: одушевлённые (кого?)',
  $theory$
**Кого?** — odamlar, hayvonlar…

Erkak rod odu.: брат → **брата** (род.п.га ўхшаш). учитель → **учителя**.

Ayol rod: мама → **маму**, сестра → **сестру**, Мария → **Марию**.

Ko‘plik odu.: студенты → **студентов**, друзья → **друзей**, дети → **детей**.

Личные местоимения В.п.: **меня, тебя, его, её, нас, вас, их**.

«Я видел брата», «Ждите меня», «Мы зовём наших друзей».
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (32, 'rule', 0, '«Men ukamni ko‘rdim»', 'Я видел брат.', 'Я видел брата.', 'Я видел брату.', 'Я видел братом.', 1),
  (32, 'rule', 1, '«U o‘qituvchini kutmoqda»', 'Она ждёт учитель.', 'Она ждёт учителя.', 'Она ждёт учителю.', 'Она ждёт учителем.', 1),
  (32, 'rule', 2, '«Men onamni sevaman»', 'Я люблю мама.', 'Я люблю маму.', 'Я люблю маме.', 'Я люблю мамой.', 1),
  (32, 'rule', 3, '«Meni kuting»', 'Ждите я.', 'Ждите меня.', 'Ждите мне.', 'Ждите мной.', 1),
  (32, 'rule', 4, '«Siz ularni bilasizmi?»', 'Вы знаете они?', 'Вы знаете им?', 'Вы знаете их?', 'Вы знаете ими?', 2),
  (32, 'rule', 5, '«Biz do‘stlarimizni chaqiramiz»', 'Мы зовём наши друзья.', 'Мы зовём наших друзей.', 'Мы зовём нашим друзьям.', 'Мы зовём нашими друзьями.', 1),
  (32, 'rule', 6, '«U meni tushunmaydi»', 'Он не понимает я.', 'Он не понимает меня.', 'Он не понимает мне.', 'Он не понимает мной.', 1),
  (32, 'rule', 7, '«Men direktorni ko‘rdim»', 'Я видел директор.', 'Я видел директора.', 'Я видел директору.', 'Я видел директором.', 1),
  (32, 'rule', 8, '«U singlisini kutib oldi»', 'Он встретил сестра.', 'Он встретил сестру.', 'Он встретил сестре.', 'Он встретил сестрой.', 1),
  (32, 'rule', 9, '«Bolalarni chaqiring»', 'Позовите дети.', 'Позовите детей.', 'Позовите детьми.', 'Позовите детям.', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (32, 0, 0, 'Брат (им.п.)', 'брата'),
  (32, 0, 1, 'Сестра', 'сестру'),
  (32, 0, 2, 'Друг', 'друга'),
  (32, 0, 3, 'Учитель', 'учителя'),
  (32, 0, 4, 'Студент', 'студента'),
  (32, 0, 5, 'Студентка', 'студентку'),
  (32, 0, 6, 'Мама', 'маму'),
  (32, 0, 7, 'Папа', 'папу'),
  (32, 0, 8, 'Друзья', 'друзей'),
  (32, 0, 9, 'Студенты', 'студентов');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (32, 0, 'uz', '(я, вижу, брат, мой)', ARRAY['Я', 'вижу', 'моего', 'брата.', 'брат'], 'Я вижу моего брата.'),
  (32, 1, 'uz', '(она, любит, мама, свой)', ARRAY['Она', 'любит', 'свою', 'маму.', 'мама'], 'Она любит свою маму.'),
  (32, 2, 'uz', '(мы, ждём, учитель, наш)', ARRAY['Мы', 'ждём', 'нашего', 'учителя.', 'учитель'], 'Мы ждём нашего учителя.'),
  (32, 3, 'uz', '(ты, знаешь, этот, девушка)', ARRAY['Ты', 'знаешь', 'эту', 'девушку?', 'девушка'], 'Ты знаешь эту девушку?'),
  (32, 4, 'uz', '(они, не, понимают, мы)', ARRAY['Они', 'не', 'понимают', 'нас.', 'мы'], 'Они не понимают нас.'),
  (32, 5, 'uz', '(я, встретил, друг, вчера)', ARRAY['Я', 'встретил', 'друга', 'вчера.', 'друг'], 'Я встретил друга вчера.'),
  (32, 6, 'uz', '(позови, дети, к, столу)', ARRAY['Позови', 'детей', 'к', 'столу.', 'дети'], 'Позови детей к столу.'),
  (32, 7, 'uz', '(вы, помните, тот, студент)', ARRAY['Вы', 'помните', 'того', 'студента?', 'студент'], 'Вы помните того студента?'),
  (32, 8, 'uz', '(она, уважает, отец, свой)', ARRAY['Она', 'уважает', 'своего', 'отца.', 'отец'], 'Она уважает своего отца.'),
  (32, 9, 'uz', '(мы, пригласили, они, в, гости)', ARRAY['Мы', 'пригласили', 'их', 'в', 'гости.', 'они'], 'Мы пригласили их в гости.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (32, 0, 'Uchratmoq', 'Встретить'),
  (32, 1, 'Quchoqlamoq', 'Обнять'),
  (32, 2, 'So‘ramoq (batafsil)', 'Расспрашивать'),
  (32, 3, 'Aytib bermoq', 'Рассказать'),
  (32, 4, 'Tabassum qilmoq', 'Улыбнуться'),
  (32, 5, 'Buyurtmoq', 'Заказать'),
  (32, 6, 'Qo‘ng‘iroq qilmoq', 'Позвонить'),
  (32, 7, 'Taklif qilmoq', 'Позвать / пригласить'),
  (32, 8, 'Kelmoq (o‘tgan)', 'Прийти'),
  (32, 9, 'O‘tkazmoq (vaqt)', 'Провести (время)'),
  (32, 10, 'Kuzatib qo‘ymoq', 'Провожать'),
  (32, 11, 'Minnadorchilik bildirmoq', 'Поблагодарить'),
  (32, 12, 'Sog‘inmoq', 'Скучать'),
  (32, 13, 'Olib bormoq', 'Отвести / повести'),
  (32, 14, 'Tanimoq', 'Узнавать');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  32,
  'Встреча с другом',
  $body$
Вчера я встретил своего старого друга Антона. Я не видел его давно. Антон тоже обрадовался и обнял меня.

Мы решили пойти в кафе. По дороге я расспрашивал его о жизни. Он рассказал мне о своей семье.

Я спросил:
– Ты помнишь нашу учительницу математики?

Он улыбнулся и сказал:
– Конечно! Я её никогда не забуду.

Мы заказали кофе и пирожные. Потом я позвонил своей сестре и позвал её к нам. Через полчаса она пришла.

Мы весело провели вечер. Когда я провожал Антона и сестру, то поблагодарил их за прекрасный вечер.
$body$,
  'kunlik-oqish-32'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-32', 'встретил', 'встретил', 'Uchrattim', NULL),
  ('kunlik-oqish-32', 'обрадовался', 'обрадовался', 'Xursand bo‘ldi', NULL),
  ('kunlik-oqish-32', 'обнял', 'обнял', 'Quchoqladi', NULL),
  ('kunlik-oqish-32', 'расспрашивал', 'расспрашивал', 'So‘ragan edi', NULL),
  ('kunlik-oqish-32', 'учительницу', 'учительницу', 'O‘qituvchi ayolni', NULL),
  ('kunlik-oqish-32', 'забуду', 'забуду', 'Unutmayman', NULL),
  ('kunlik-oqish-32', 'пирожные', 'пирожные', 'Pirojniy', NULL),
  ('kunlik-oqish-32', 'позвал', 'позвал', 'Taklif qildi', NULL),
  ('kunlik-oqish-32', 'провожал', 'провожал', 'Kuzatib qo‘ydim', NULL),
  ('kunlik-oqish-32', 'поблагодарил', 'поблагодарил', 'Minnatdorlik bildirdi', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (32, 0, 'Siz uni kecha ko‘rdingizmi?', 'Вы видели его вчера?'),
  (32, 1, 'Men sizni juda sog‘indim.', 'Я очень скучал по вам.'),
  (32, 2, 'U farzandlarini maktabga olib bordi.', 'Он отвёл детей в школу.'),
  (32, 3, 'Iltimos, shifokorni chaqiring.', 'Пожалуйста, вызовите врача.'),
  (32, 4, 'Ular talabalarni muzeyga olib borishdi.', 'Они повели студентов в музей.'),
  (32, 5, 'Men bu odamni birinchi marta ko‘ryapman.', 'Я вижу этого человека в первый раз.'),
  (32, 6, 'Qo‘shnilaringizni marosimga taklif qildingizmi?', 'Вы пригласили соседей на праздник?'),
  (32, 7, 'Uning onasining ismini bilasizmi?', 'Вы знаете имя его матери?'),
  (32, 8, 'Bolalar, kelinglar, men sizlarga ertak o‘qib beraman.', 'Дети, идите сюда, я прочитаю вам сказку.'),
  (32, 9, 'Nega siz ularni tanimayapsiz? Ular sizning sinfdoshlaringiz.', 'Почему вы их не узнаёте? Они ваши одноклассники.');

-- ========== Kun 33 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 33;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 33
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 33;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 33;

DELETE FROM public.daily_vocab_words WHERE day_number = 33;

DELETE FROM public.daily_grammar_matches WHERE day_number = 33;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 33;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 33;
DELETE FROM public.daily_grammar_topics WHERE day_number = 33;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  33,
  'Винительный падеж: неодушевлённые (что?) — takrorlash',
  $theory$
**Что?** — jonsiz narsalar.

Erkak va o‘rta rod ko‘pincha **o‘zgarmaydi**: стол → стол, окно → окно.

Ayol rod **-а/-я → -у/-ю**: книга → **книгу**, улица → **улицу**.

**-ь** (ayol): дверь → дверь, площадь → площадь.

Ko‘plik jonsiz: Им.п. = В.п.

**Одуш. vs неодуш.:** брат → брата, но стол → стол.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (33, 'rule', 0, '«Men kitobni o‘qiyapman»', 'Я читаю книга.', 'Я читаю книгу.', 'Я читаю книгой.', 'Я читаю книге.', 1),
  (33, 'rule', 1, '«U derazani yopdi»', 'Он закрыл окно.', 'Он закрыл окна.', 'Он закрыл окну.', 'Он закрыл окном.', 0),
  (33, 'rule', 2, '«Men stolni ko‘ryapman»', 'Я вижу стол.', 'Я вижу стола.', 'Я вижу столу.', 'Я вижу столом.', 0),
  (33, 'rule', 3, '«U televizorni sotib oldi»', 'Он купил телевизор.', 'Он купил телевизора.', 'Он купил телевизору.', 'Он купил телевизором.', 0),
  (33, 'rule', 4, '«Men ko‘chani kesib o‘tyapman»', 'Я перехожу улица.', 'Я перехожу улицу.', 'Я перехожу улицей.', 'Я перехожу улице.', 1),
  (33, 'rule', 5, '«Что ты читаешь?» (gazeta)', 'Я читаю газет.', 'Я читаю газету.', 'Я читаю газете.', 'Я читаю газетой.', 1),
  (33, 'rule', 6, '«U sumkani oldi» — xato variant?', 'Он взял сумка.', 'Он взял сумку.', 'Он взял сумкой.', 'Он взял сумке.', 0),
  (33, 'rule', 7, '«Men xat yozyapman»', 'Я пишу письмо.', 'Я пишу письма.', 'Я пишу письму.', 'Я пишу письмом.', 0),
  (33, 'rule', 8, '«Biz dengizni ko‘rdik»', 'Мы видели море.', 'Мы видели моря.', 'Мы видели морю.', 'Мы видели морем.', 0),
  (33, 'rule', 9, '«Men maydonni ko‘rdim» (площадь)', 'Я видел площадь.', 'Я видел площаду.', 'Я видел площадью.', 'Я видел площади.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (33, 0, 0, 'Men kitob o‘qiyapman.', 'Я читаю книгу.'),
  (33, 0, 1, 'Men stolni ko‘ryapman.', 'Я вижу стол.'),
  (33, 0, 2, 'U gazetani o‘qiyapti.', 'Он читает газету.'),
  (33, 0, 3, 'Men mashina sotib oldim.', 'Я купил машину.'),
  (33, 0, 4, 'U eshikni ochdi.', 'Он открыл дверь.'),
  (33, 0, 5, 'Biz derazani yopdik.', 'Мы закрыли окно.'),
  (33, 0, 6, 'U televizor ko‘rayapti.', 'Она смотрит телевизор.'),
  (33, 0, 7, 'Men xat yozdim.', 'Я написал письмо.'),
  (33, 0, 8, 'U kompyuterni yoqdi.', 'Он включил компьютер.'),
  (33, 0, 9, 'U sumkani sotib oldi.', 'Она купила сумку.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (33, 0, 'uz', '(я, читаю, интересный, книга)', ARRAY['Я', 'читаю', 'интересную', 'книгу.', 'книга'], 'Я читаю интересную книгу.'),
  (33, 1, 'uz', '(мы, купили, новый, телевизор)', ARRAY['Мы', 'купили', 'новый', 'телевизор.', 'телевизора'], 'Мы купили новый телевизор.'),
  (33, 2, 'uz', '(она, открыла, дверь, и, вошла)', ARRAY['Она', 'открыла', 'дверь', 'и', 'вошла.', 'дверью'], 'Она открыла дверь и вошла.'),
  (33, 3, 'uz', '(он, любит, пить, кофе, утром)', ARRAY['Он', 'любит', 'пить', 'кофе', 'утром.', 'кофю'], 'Он любит пить кофе утром.'),
  (33, 4, 'uz', '(дети, строят, замок, из, песок)', ARRAY['Дети', 'строят', 'замок', 'из', 'песка.', 'песок'], 'Дети строят замок из песка.'),
  (33, 5, 'uz', '(я, не, понимаю, это, слово)', ARRAY['Я', 'не', 'понимаю', 'это', 'слово.', 'слова'], 'Я не понимаю это слово.'),
  (33, 6, 'uz', '(ты, видел, новый, фильм)', ARRAY['Ты', 'видел', 'новый', 'фильм?', 'фильма'], 'Ты видел новый фильм?'),
  (33, 7, 'uz', '(она, написала, длинное, письмо)', ARRAY['Она', 'написала', 'длинное', 'письмо.', 'письма'], 'Она написала длинное письмо.'),
  (33, 8, 'uz', '(мы, забыли, ключи, дома)', ARRAY['Мы', 'забыли', 'ключи', 'дома.', 'ключей'], 'Мы забыли ключи дома.'),
  (33, 9, 'uz', '(почему, ты, не, купил, хлеб)', ARRAY['Почему', 'ты', 'не', 'купил', 'хлеб?', 'хлеба'], 'Почему ты не купил хлеб?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (33, 0, 'Kvartira', 'Квартира'),
  (33, 1, 'Ko‘chib o‘tmoq', 'Переезжать'),
  (33, 2, 'Mebel', 'Мебель'),
  (33, 3, 'Olib kelmoq', 'Привезти'),
  (33, 4, 'Yig‘moq', 'Собрать'),
  (33, 5, 'Yuvmoq', 'Мыть'),
  (33, 6, 'Artmoq', 'Протирать'),
  (33, 7, 'Chang', 'Пыль'),
  (33, 8, 'Joylashtirmoq', 'Раскладывать'),
  (33, 9, 'Tartibga solmoq', 'Разобрать'),
  (33, 10, 'Osmoq', 'Повесить'),
  (33, 11, 'Parda', 'Штора'),
  (33, 12, 'Ulab qo‘ymoq', 'Подключить'),
  (33, 13, 'Qulay', 'Удобный'),
  (33, 14, 'O‘rganib qolmoq', 'Привыкнуть');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  33,
  'Новая квартира',
  $body$
На прошлой неделе моя семья купила новую квартиру. Вчера мы переезжали.

Сначала мы привезли мебель. Папа собрал большой шкаф. Я помогал ему. Мама мыла окна. Сестра протирала пыль с полок.

После обеда мы начали раскладывать вещи. Я разобрал свои книги на полке. Мама повесила шторы. Папа подключил телевизор и компьютер.

К вечеру квартира стала уютной. Мы очень устали, но были счастливы.

Я люблю свою новую комнату. Там есть большое окно, стол и удобная кровать. Я уже привык к новому месту.
$body$,
  'kunlik-oqish-33'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-33', 'переезжали', 'переезжали', 'Ko‘chib o‘tdik', NULL),
  ('kunlik-oqish-33', 'привезли', 'привезли', 'Olib keldik', NULL),
  ('kunlik-oqish-33', 'шкаф', 'шкаф', 'Shkaf', NULL),
  ('kunlik-oqish-33', 'протирала', 'протирала', 'Artdi', NULL),
  ('kunlik-oqish-33', 'полок', 'полок', 'Javonlar', NULL),
  ('kunlik-oqish-33', 'повесила', 'повесила', 'Osdi', NULL),
  ('kunlik-oqish-33', 'уютной', 'уютной', 'Qulay', NULL),
  ('kunlik-oqish-33', 'разобрал', 'разобрал', 'Tartibga soldi', NULL),
  ('kunlik-oqish-33', 'привык', 'привык', 'O‘rganib qoldi', NULL),
  ('kunlik-oqish-33', 'кровать', 'кровать', 'Karavot', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (33, 0, 'Siz yangi uy sotib oldingizmi?', 'Вы купили новую квартиру?'),
  (33, 1, 'U televizorni yoqdi va gazeta o‘qiy boshladi.', 'Он включил телевизор и начал читать газету.'),
  (33, 2, 'Kechirasiz, men sizning ismingizni unutdim.', 'Извините, я забыл ваше имя.'),
  (33, 3, 'Nega siz bu masalani hal qilmaysiz?', 'Почему вы не решаете эту проблему?'),
  (33, 4, 'Yozda men ko‘p meva va sabzavotlar yeyman.', 'Летом я ем много фруктов и овощей.'),
  (33, 5, 'U ayol har kuni chiroyli liboslar kiyadi.', 'Эта женщина каждый день носит красивые платья.'),
  (33, 6, 'Kechagi yomg‘ir barcha rejalarimizni buzdi.', 'Вчерашний дождь испортил все наши планы.'),
  (33, 7, 'Iltimos, stolni yig‘ishga yordam bering.', 'Пожалуйста, помогите собрать стол.'),
  (33, 8, 'Bolalar, maktabda qanday yangi narsalarni o‘rgandingiz?', 'Дети, что нового вы узнали в школе?'),
  (33, 9, 'Bu gapni qanday rus tiliga tarjima qilish mumkin?', 'Как можно перевести это предложение на русский язык?');

-- ========== Kun 34 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 34;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 34
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 34;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 34;

DELETE FROM public.daily_vocab_words WHERE day_number = 34;

DELETE FROM public.daily_grammar_matches WHERE day_number = 34;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 34;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 34;
DELETE FROM public.daily_grammar_topics WHERE day_number = 34;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  34,
  'Личные местоимения в винительном падеже',
  $theory$
**Им.п. → В.п.:** я → **меня**, ты → **тебя**, он → **его**, она → **её**, оно → **его**, мы → **нас**, вы → **вас**, они → **их**.

«Его» / «её» — o‘zbekchada ko‘pincha «uni», rus tilida jins bilan ajraladi.

Fe’llardan keyin: Он знает **меня**., Ждите **нас**..

Скучать **по + дат.**: скучать по **тебе**, по **вам**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (34, 'rule', 0, '«U meni ko‘rdi»', 'Он видел я.', 'Он видел меня.', 'Он видел мне.', 'Он видел мной.', 1),
  (34, 'rule', 1, '«Men seni sevaman»', 'Я люблю ты.', 'Я люблю тебя.', 'Я люблю тебе.', 'Я люблю тобой.', 1),
  (34, 'rule', 2, '«Ular bizni kutishyapti»', 'Они ждут мы.', 'Они ждут нам.', 'Они ждут нас.', 'Они ждут нами.', 2),
  (34, 'rule', 3, '«Men uni (erkak) ko‘rdim»', 'Я видел его.', 'Я видел её.', 'Я видел их.', 'Я видел вас.', 0),
  (34, 'rule', 4, '«Siz ularni bilasizmi?»', 'Вы знаете они?', 'Вы знаете им?', 'Вы знаете их?', 'Вы знаете ими?', 2),
  (34, 'rule', 5, '«Sizni tushunmayman»', 'Я не понимаю вы.', 'Я не понимаю вас.', 'Я не понимаю вам.', 'Я не понимаю вами.', 1),
  (34, 'rule', 6, '«U uni (ayol) chaqirdi»', 'Он позвал его.', 'Он позвал её.', 'Он позвал их.', 'Он позвал нас.', 1),
  (34, 'rule', 7, '«Bizni kechiring»', 'Простите мы.', 'Простите нас.', 'Простите нам.', 'Простите нами.', 1),
  (34, 'rule', 8, '«Услышали новость» — «его/её/их»?', 'Только «его».', 'Только «её».', 'Только «их».', 'Kontekstga qarab hammasi mumkin.', 3),
  (34, 'rule', 9, '«U meni tushunmaydi»', 'Он не понимает я.', 'Он не понимает меня.', 'Он не понимает мне.', 'Он не понимает мной.', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (34, 0, 0, 'Я', 'меня'),
  (34, 0, 1, 'Ты', 'тебя'),
  (34, 0, 2, 'Он', 'его'),
  (34, 0, 3, 'Она', 'её'),
  (34, 0, 4, 'Мы', 'нас'),
  (34, 0, 5, 'Вы', 'вас'),
  (34, 0, 6, 'Они', 'их'),
  (34, 0, 7, 'Я (та же форма)', 'меня'),
  (34, 0, 8, 'Оно', 'его'),
  (34, 0, 9, 'Вы (вежливо)', 'вас');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (34, 0, 'uz', '(я, люблю, ты)', ARRAY['Я', 'люблю', 'тебя.', 'ты'], 'Я люблю тебя.'),
  (34, 1, 'uz', '(он, не, понимать, я)', ARRAY['Он', 'не', 'понимает', 'меня.', 'я'], 'Он не понимает меня.'),
  (34, 2, 'uz', '(мы, пригласили, они, в, гости)', ARRAY['Мы', 'пригласили', 'их', 'в', 'гости.', 'они'], 'Мы пригласили их в гости.'),
  (34, 3, 'uz', '(вы, помнить, мы)', ARRAY['Вы', 'помните', 'нас?', 'мы'], 'Вы помните нас?'),
  (34, 4, 'uz', '(она, ждать, он, у, входа)', ARRAY['Она', 'ждёт', 'его', 'у', 'входа.', 'она'], 'Она ждёт его у входа.'),
  (34, 5, 'uz', '(я, никогда, не, забыть, вы)', ARRAY['Я', 'никогда', 'не', 'забуду', 'вас.', 'вы'], 'Я никогда не забуду вас.'),
  (34, 6, 'uz', '(почему, ты, не, позвать, она)', ARRAY['Почему', 'ты', 'не', 'позвал', 'её?', 'она'], 'Почему ты не позвал её?'),
  (34, 7, 'uz', '(они, встретить, мы, на, вокзал)', ARRAY['Они', 'встретят', 'нас', 'на', 'вокзале.', 'мы'], 'Они встретят нас на вокзале.'),
  (34, 8, 'uz', '(я, видеть, ты, вчера, в, парке)', ARRAY['Я', 'видел', 'тебя', 'вчера', 'в', 'парке.', 'ты'], 'Я видел тебя вчера в парке.'),
  (34, 9, 'uz', '(мы, благодарить, вы, за, помощь)', ARRAY['Мы', 'благодарим', 'вас', 'за', 'помощь.', 'вы'], 'Мы благодарим вас за помощь.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (34, 0, 'Meni', 'Меня'),
  (34, 1, 'Seni', 'Тебя'),
  (34, 2, 'Uni (erkak)', 'Его'),
  (34, 3, 'Uni (ayol)', 'Её'),
  (34, 4, 'Bizni', 'Нас'),
  (34, 5, 'Sizni', 'Вас'),
  (34, 6, 'Ularni', 'Их'),
  (34, 7, 'Tushunmoq', 'Понимать'),
  (34, 8, 'Qo‘llab-quvvatlamoq', 'Поддерживать'),
  (34, 9, 'Xiyonat qilmoq', 'Предать'),
  (34, 10, 'Ishonmoq', 'Доверять'),
  (34, 11, 'Tug‘ilgan kun', 'День рождения'),
  (34, 12, 'Quchoqlamoq', 'Обнять'),
  (34, 13, 'Sog‘inmoq', 'Скучать'),
  (34, 14, 'Tanishtirmoq', 'Познакомить');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  34,
  'Друзья',
  $body$
У меня есть два лучших друга: Анна и Сергей. Я очень люблю их.

Анна всегда понимает меня. Когда мне грустно, она поддерживает меня.

Сергей никогда не предаст меня. Я могу доверять ему.

На прошлой неделе я пригласил их на свой день рождения. Анна подарила мне книгу, а Сергей — новый диск.

Я обнял их и сказал:
– Спасибо, дорогие мои!

Я никогда не забуду вас.

Вечером мы гуляли по городу. Я рассказывал им о своих планах на будущее. Они внимательно слушали меня.

Вот что значит настоящая дружба.
$body$,
  'kunlik-oqish-34'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-34', 'понимает', 'понимает', 'Tushunadi', NULL),
  ('kunlik-oqish-34', 'грустно', 'грустно', 'G‘amgin', NULL),
  ('kunlik-oqish-34', 'поддерживает', 'поддерживает', 'Qo‘llab-quvvatlaydi', NULL),
  ('kunlik-oqish-34', 'предаст', 'предаст', 'Xiyonat qiladi', NULL),
  ('kunlik-oqish-34', 'доверять', 'доверять', 'Ishonmoq', NULL),
  ('kunlik-oqish-34', 'подарила', 'подарила', 'Sovg‘a qildi', NULL),
  ('kunlik-oqish-34', 'дорогие', 'дорогие', 'Azizlar', NULL),
  ('kunlik-oqish-34', 'забуду', 'забуду', 'Unutmayman', NULL),
  ('kunlik-oqish-34', 'планы', 'планы', 'Rejalar', NULL),
  ('kunlik-oqish-34', 'дружба', 'дружба', 'Do‘stlik', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (34, 0, 'Siz meni tushunyapsizmi?', 'Вы меня понимаете?'),
  (34, 1, 'Iltimos, uni menga tanishtiring.', 'Пожалуйста, познакомьте меня с ним.'),
  (34, 2, 'Ular bizni hech qachon tushunmaydilar.', 'Они никогда нас не поймут.'),
  (34, 3, 'Nega siz ularni marosimga taklif qilmadingiz?', 'Почему вы не пригласили их на праздник?'),
  (34, 4, 'Men seni juda sog‘indim.', 'Я очень скучал по тебе.'),
  (34, 5, 'U sizni kutib qoladimi?', 'Он будет ждать вас?'),
  (34, 6, 'Bolalar, keling, men sizlarga ertak aytib beraman.', 'Дети, идите сюда, я расскажу вам сказку.'),
  (34, 7, 'Kechirasiz, men sizning ismingizni unutib qo‘ydim.', 'Извините, я забыл ваше имя.'),
  (34, 8, 'Uning onasi uni juda yaxshi ko‘radi.', 'Его мама очень любит его.'),
  (34, 9, 'Siz ularni aeroportda kutib olasizmi?', 'Вы встретите их в аэропорту?');

-- ========== Kun 35 ==========
DELETE FROM public.daily_practice_prompts WHERE day_number = 35;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 35
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 35;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 35;

DELETE FROM public.daily_vocab_words WHERE day_number = 35;

DELETE FROM public.daily_grammar_matches WHERE day_number = 35;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 35;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 35;
DELETE FROM public.daily_grammar_topics WHERE day_number = 35;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  35,
  'Указательные и притяжательные местоимения + В.п.',
  $theory$
**Этот / этот стол:** неодуш. — форма совпадает с именительным (этот стол).

**Эта книга → эту книгу**, **этого студента** (одуш.).

**Мой брат → моего брата**; **моя книга → мою книгу**; **мои друзья → моих друзей**.

**Его, её, их** с существительным **не склоняются**: его брат → **его брата** склоняется только существительное.

Я вижу **этого студента**., Я люблю **мою маму**., Они знают **наших детей**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (35, 'rule', 0, '«Men bu talabani ko‘rdim»', 'Я видел этот студент.', 'Я видел этого студента.', 'Я видел этому студенту.', 'Я видел этим студентом.', 1),
  (35, 'rule', 1, '«U mening kitobimni oldi»', 'Он взял моя книга.', 'Он взял мою книгу.', 'Он взял моей книгой.', 'Он взял моей книге.', 1),
  (35, 'rule', 2, '«Men bu qizni ko‘rdim»', 'Я видел эту девушку.', 'Я видел этот девушка.', 'Я видел это девушка.', 'Я видел эти девушку.', 0),
  (35, 'rule', 3, '«Biz uning ukasini kutmoqdamiz»', 'Мы ждём его брат.', 'Мы ждём его брата.', 'Мы ждём его брату.', 'Мы ждём его братом.', 1),
  (35, 'rule', 4, '«Mening do‘stimni ko‘rdim»', 'Я видел мой друг.', 'Я видел моего друга.', 'Я видел моему другу.', 'Я видел моим другом.', 1),
  (35, 'rule', 5, '«U bu mashinani sotib oldi»', 'Он купил этот машина.', 'Он купил эту машину.', 'Он купил это машина.', 'Он купил эти машина.', 1),
  (35, 'rule', 6, '«Bu talabalarni bilaman»', 'Я знаю эти студенты.', 'Я знаю этих студентов.', 'Я знаю этим студентам.', 'Я знаю этими студентами.', 1),
  (35, 'rule', 7, '«Men ularning farzandlarini sevaman»', 'Я люблю их дети.', 'Я люблю их детей.', 'Я люблю им детям.', 'Я люблю их детьми.', 1),
  (35, 'rule', 8, '«Men bu binoni ko‘rdim»', 'Я видел это здание.', 'Я видел этот здание.', 'Я видел эту здание.', 'Я видел эти здание.', 0),
  (35, 'rule', 9, '«U o‘z telefonini ko‘rsatdi»', 'Он показал свой новый телефон.', 'Он показал своего нового телефона.', 'Он показал своему новому телефону.', 'Он показал своим новым телефоном.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (35, 0, 0, 'Mening akamni', 'моего брата'),
  (35, 0, 1, 'Mening kitobimni', 'мою книгу'),
  (35, 0, 2, 'Seni ukangni', 'твоего брата'),
  (35, 0, 3, 'Mening do‘stimni', 'моего друга'),
  (35, 0, 4, 'Bizning o‘qituvchimizni', 'нашего учителя'),
  (35, 0, 5, 'Sening mashinangni', 'твою машину'),
  (35, 0, 6, 'Uning (ayol) singlisini', 'её сестру'),
  (35, 0, 7, 'Sizning direktoringizni', 'вашего директора'),
  (35, 0, 8, 'Ularning uyini', 'их дом'),
  (35, 0, 9, 'Uning (erkak) onasini', 'его маму');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (35, 0, 'uz', '(я, вижу, мой, друг)', ARRAY['Я', 'вижу', 'моего', 'друга.', 'друг'], 'Я вижу моего друга.'),
  (35, 1, 'uz', '(она, любит, свой, мама)', ARRAY['Она', 'любит', 'свою', 'маму.', 'мама'], 'Она любит свою маму.'),
  (35, 2, 'uz', '(мы, купили, этот, дом)', ARRAY['Мы', 'купили', 'этот', 'дом.', 'этого'], 'Мы купили этот дом.'),
  (35, 3, 'uz', '(ты, знаешь, этот, девушка)', ARRAY['Ты', 'знаешь', 'эту', 'девушку?', 'этот'], 'Ты знаешь эту девушку?'),
  (35, 4, 'uz', '(они, пригласили, наш, дети)', ARRAY['Они', 'пригласили', 'наших', 'детей.', 'наши'], 'Они пригласили наших детей.'),
  (35, 5, 'uz', '(я, нашёл, твой, ключи)', ARRAY['Я', 'нашёл', 'твои', 'ключи.', 'твой'], 'Я нашёл твои ключи.'),
  (35, 6, 'uz', '(он, потерял, свой, телефон)', ARRAY['Он', 'потерял', 'свой', 'телефон.', 'своего'], 'Он потерял свой телефон.'),
  (35, 7, 'uz', '(мы, ждём, ваш, ответ)', ARRAY['Мы', 'ждём', 'ваш', 'ответ.', 'вашего'], 'Мы ждём ваш ответ.'),
  (35, 8, 'uz', '(вы, помните, тот, день)', ARRAY['Вы', 'помните', 'тот', 'день?', 'ту'], 'Вы помните тот день?'),
  (35, 9, 'uz', '(я, никогда, не, забуду, этот, вечер)', ARRAY['Я', 'никогда', 'не', 'забуду', 'этот', 'вечер.', 'этого'], 'Я никогда не забуду этот вечер.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (35, 0, 'Bu (erkak)', 'Этот'),
  (35, 1, 'Bu (ayol)', 'Эта'),
  (35, 2, 'Bu (o‘rta)', 'Это'),
  (35, 3, 'Bular', 'Эти'),
  (35, 4, 'O‘sha (erkak)', 'Тот'),
  (35, 5, 'O‘sha (ayol)', 'Та'),
  (35, 6, 'O‘sha (o‘rta)', 'То'),
  (35, 7, 'O‘shalar', 'Те'),
  (35, 8, 'Mening (erkak otl.)', 'Мой'),
  (35, 9, 'Mening (ayol otl.)', 'Моя'),
  (35, 10, 'Mening (o‘rta otl.)', 'Моё'),
  (35, 11, 'Mening (ko‘plik)', 'Мои'),
  (35, 12, 'Sening', 'Твой / твоя / твоё / твои'),
  (35, 13, 'Bizning', 'Наш / наша / наше / наши'),
  (35, 14, 'Sizning', 'Ваш / ваша / ваше / ваши');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  35,
  'Мой подарок',
  $body$
На прошлой неделе у моего брата был день рождения. Я долго думал о подарке.

Наконец, я решил купить ему новый рюкзак. В магазине я увидел этот красивый рюкзак. Я попросил продавца показать мне эту модель.

Мне очень понравился синий цвет. Я купил этот рюкзак и подарил его брату.

Он открыл коробку, увидел подарок и радостно улыбнулся.
– Спасибо! Это мой любимый цвет!

Я обнял своего брата и сказал:
– Я очень рад, что тебе понравился мой подарок.

Этот день мы запомнили надолго.
$body$,
  'kunlik-oqish-35'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-35', 'рюкзак', 'рюкзак', 'Ryukzak', NULL),
  ('kunlik-oqish-35', 'продавца', 'продавца', 'Sotuvchini', NULL),
  ('kunlik-oqish-35', 'модель', 'модель', 'Model', NULL),
  ('kunlik-oqish-35', 'подарил', 'подарил', 'Sovg‘a qildi', NULL),
  ('kunlik-oqish-35', 'коробку', 'коробку', 'Qutini', NULL),
  ('kunlik-oqish-35', 'радостно', 'радостно', 'Quvonch bilan', NULL),
  ('kunlik-oqish-35', 'любимый', 'любимый', 'Sevimli', NULL),
  ('kunlik-oqish-35', 'понравился', 'понравился', 'Yoqqan bo‘ldi', NULL),
  ('kunlik-oqish-35', 'запомнили', 'запомнили', 'Eslab qoldik', NULL),
  ('kunlik-oqish-35', 'надолго', 'надолго', 'Uzoq vaqtga', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (35, 0, 'Sizning ukangiz bu yil maktabni bitirsa, unga nima sovg‘a qilasiz?', 'Что вы подарите вашему брату, если он закончит школу в этом году?'),
  (35, 1, 'Men bu ko‘ylakni kechagi do‘konda ko‘rgan edim.', 'Я видел эту рубашку вчера в магазине.'),
  (35, 2, 'Uning bu masala haqidagi fikrini eshitishni xohlaysizmi?', 'Вы хотите услышать его мнение об этом вопросе?'),
  (35, 3, 'Kechirasiz, men sizning ismingizni unutdim.', 'Извините, я забыл ваше имя.'),
  (35, 4, 'Ular o‘zlarining eski uylarini sotishdi va yangisini sotib olishdi.', 'Они продали свой старый дом и купили новый.'),
  (35, 5, 'Qaysi rangdagi mashinani afzal ko‘rasiz? – Men oq rangni yaxshi ko‘raman.', 'Какую машину вы предпочитаете? – Я люблю белую.'),
  (35, 6, 'Uning bu so‘zlari hammamizni hayratda qoldirdi.', 'Его слова удивили всех нас.'),
  (35, 7, 'Iltimos, bu stolni burchakka qo‘ying.', 'Пожалуйста, поставьте этот стол в угол.'),
  (35, 8, 'Siz ularning manzilini bilasizmi?', 'Вы знаете их адрес?'),
  (35, 9, 'Men o‘zimning eng yaxshi do‘stimga ishonaman.', 'Я доверяю своему самому лучшему другу.');
